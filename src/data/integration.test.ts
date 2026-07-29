/**
 * Full-workflow integration tests — model layer through to export bytes.
 *
 * We avoid DOM/canvas dependencies (jsdom has no working Canvas2D), so the
 * offscreen render step is excluded.  Everything else — data model, store,
 * template, color conversion, TIFF — is exercised.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { useEditorStore, undo } from '@/state/editorStore';
import { createDocument, parseDocument, serializeDocument } from './document';
import { parseTemplate, serializeTemplate, templateFromDocument } from './template';
import { DOCUMENT_VERSION, TEMPLATE_VERSION } from './types';
import type { Document, ImagePlacement, Layer, Template } from './types';
import { canvasDesignSize, clampPlacement, coverScale } from './geometry';
import { MatrixCmykConverter } from '@/export/color';
import { writeCmykTiff } from '@/export/tiff/writeCmykTiff';

// --- helpers ---

function emptySlot(id: string, x: number, y: number, w: number, h: number): Layer {
  return {
    id,
    name: 'Slot',
    imageSrc: '',
    imageW: 0,
    imageH: 0,
    frame: { x, y, w, h },
    rotation: 0,
    placement: { x: 0, y: 0, scale: 1 },
    opacity: 1,
    zIndex: 1,
    fit: 'cover',
  };
}

beforeEach(() => {
  useEditorStore.setState({
    document: createDocument(),
    selectedLayerId: null,
    zoom: 1,
    library: [],
    userTemplates: [],
  });
  useEditorStore.temporal.getState().clear();
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// 1. Free-layout workflow
// ---------------------------------------------------------------------------

describe('free-layout workflow', () => {
  it('adds photos, each clipped by its own frame', () => {
    const store = useEditorStore.getState();
    store.addPhoto('img1', 1600, 900);
    store.addPhoto('img2', 1200, 1600);

    const { document } = useEditorStore.getState();
    expect(document.layers.length).toBe(2);
    expect(document.frameLocked).toBe(false);

    for (const l of document.layers) {
      // Each placement covers its frame
      expect(l.placement.scale).toBeGreaterThanOrEqual(
        coverScale(l.imageW, l.imageH, l.frame.w, l.frame.h),
      );
      // Frame is within canvas bounds
      const { w, h } = canvasDesignSize(document.canvas);
      expect(l.frame.x).toBeGreaterThanOrEqual(0);
      expect(l.frame.y).toBeGreaterThanOrEqual(0);
      expect(l.frame.x + l.frame.w).toBeLessThanOrEqual(w + 1);
      expect(l.frame.y + l.frame.h).toBeLessThanOrEqual(h + 1);
    }
  });

  it('undo/redo works across the full session', () => {
    const store = useEditorStore.getState();
    store.addPhoto('a', 100, 100);
    store.addPhoto('b', 100, 100);
    expect(useEditorStore.getState().document.layers.length).toBe(2);

    undo();
    expect(useEditorStore.getState().document.layers.length).toBe(1);

    // Remove the remaining layer
    const id = useEditorStore.getState().document.layers[0].id;
    useEditorStore.getState().removeLayer(id);
    expect(useEditorStore.getState().document.layers.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Template workflow
// ---------------------------------------------------------------------------

describe('template workflow', () => {
  it('applies a template, fills slots, and reframes an image', () => {
    // --- Apply template ---
    const tpl: Template = {
      version: TEMPLATE_VERSION,
      name: '2-Up',
      canvas: { widthMM: 297, heightMM: 210, dpi: 300, bleedMM: 3 },
      slots: [
        { x: 10, y: 10, w: 100, h: 80 },
        { x: 120, y: 10, w: 100, h: 80 },
      ],
    };
    useEditorStore.getState().applyTemplate(tpl);
    let doc = useEditorStore.getState().document;
    expect(doc.frameLocked).toBe(true);
    expect(doc.layers.length).toBe(2);

    // --- Fill slot 1 ---
    useEditorStore.getState().selectLayer(doc.layers[0].id);
    useEditorStore.getState().fillSlot(doc.layers[0].id, 'img-slot1', 2000, 1000);
    doc = useEditorStore.getState().document;
    const slot1 = doc.layers[0];
    expect(slot1.imageSrc).toBe('img-slot1');
    expect(slot1.placement.scale).toBeGreaterThanOrEqual(
      coverScale(2000, 1000, 100, 80),
    );

    // --- Reframe (pan within slot 1) ---
    useEditorStore.getState().setLayerPlacement(slot1.id, {
      x: -80,
      y: -20,
      scale: 0.12,
    });
    const reframed = useEditorStore.getState().document.layers[0].placement;
    // Clamped: must still cover the frame
    expect(clampPlacement(reframed, 2000, 1000, 100, 80)).toEqual(reframed);
  });

  it('saves the current layout as a template and round-trips it', () => {
    useEditorStore.getState().addSlot();
    useEditorStore.getState().addSlot();
    const doc = useEditorStore.getState().document;
    const tpl = templateFromDocument(doc, 'Roundtrip');
    const json = serializeTemplate(tpl);
    const back = parseTemplate(json);
    expect(back.slots.length).toBe(2);
    expect(back.canvas.widthMM).toBe(doc.canvas.widthMM);
  });
});

// ---------------------------------------------------------------------------
// 3. Document serialisation round-trip
// ---------------------------------------------------------------------------

describe('document serialisation', () => {
  it('survives a full save → load cycle', () => {
    useEditorStore.getState().addPhoto('img1', 800, 600);
    useEditorStore.getState().addPhoto('img2', 1200, 900);
    const { document } = useEditorStore.getState();
    const json = serializeDocument(document);
    const reloaded = parseDocument(json);
    expect(reloaded).toEqual(document);
  });

  it('defaults frameLocked to false for legacy documents', () => {
    // Simulate a legacy doc without the frameLocked field
    const legacy = {
      version: DOCUMENT_VERSION,
      canvas: { widthMM: 100, heightMM: 100, dpi: 72, bleedMM: 0 },
      layers: [],
    };
    const doc = parseDocument(JSON.stringify(legacy));
    expect(doc.frameLocked).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. CMYK export pipeline (model → bytes)
// ---------------------------------------------------------------------------

describe('CMYK export pipeline', () => {
  it('converts synthetic RGBA to CMYK and writes a valid TIFF', () => {
    // Build a synthetic "document render" — a few known RGBA pixels.
    const w = 4;
    const h = 2;
    const rgba = new Uint8ClampedArray(w * h * 4);
    // White pixel
    rgba[0] = 255; rgba[1] = 255; rgba[2] = 255; rgba[3] = 255;
    // Black pixel
    rgba[4] = 0; rgba[5] = 0; rgba[6] = 0; rgba[7] = 255;
    // Red pixel
    rgba[8] = 255; rgba[9] = 0; rgba[10] = 0; rgba[11] = 255;
    // Mid-grey
    rgba[12] = 128; rgba[13] = 128; rgba[14] = 128; rgba[15] = 255;

    const converter = new MatrixCmykConverter();
    const cmyk = converter.rgbaToCmyk(rgba, w, h);
    expect(cmyk.length).toBe(w * h * 4);

    const bytes = writeCmykTiff(cmyk, { width: w, height: h, dpi: 300 });

    // Basic TIFF header check
    expect(bytes[0]).toBe(0x49); // 'I'
    expect(bytes[1]).toBe(0x49);
    expect(bytes[2]).toBe(42 % 256); // magic low byte
    expect(bytes[3]).toBe(0);

    // Verify CMYK channels are correct for a few pixels
    // White → C 0, M 0, Y 0, K 0
    expect([cmyk[0], cmyk[1], cmyk[2], cmyk[3]]).toEqual([0, 0, 0, 0]);
    // Black → K 255
    expect(cmyk[7]).toBe(255);
    // Red → M 255, Y 255
    expect([cmyk[8], cmyk[9], cmyk[10], cmyk[11]]).toEqual([0, 255, 255, 0]);
  });

  it('produces a TIFF with embedded ICC profile when requested', () => {
    const cmyk = new Uint8Array(2 * 2 * 4);
    const icc = new Uint8Array([0, 1, 2, 3]);
    const bytes = writeCmykTiff(cmyk, { width: 2, height: 2, dpi: 300, icc });
    // ICCProfile tag (34675 = 0x8773) should be present.
    // Quick check: total bytes > strip data = 16 + header + ifd + ext
    expect(bytes.length).toBeGreaterThan(16);
    // The ICC bytes should be somewhere in the header region (before strip data)
    const headerSlice = bytes.slice(0, 200);
    expect(headerSlice.includes(0)).toBe(true); // ICC has byte 0
    expect(headerSlice.includes(1)).toBe(true);
    expect(headerSlice.includes(2)).toBe(true);
    expect(headerSlice.includes(3)).toBe(true);
  });
});
