import { describe, expect, it, beforeEach } from 'vitest';
import { useEditorStore, undo, redo } from './editorStore';
import { createDocument } from '@/data/document';
import type { Document, Layer, Template } from '@/data/types';
import { DOCUMENT_VERSION, TEMPLATE_VERSION } from '@/data/types';
import { canvasDesignSize } from '@/data/geometry';

/** Full reset between tests. */
function reset() {
  useEditorStore.setState({
    document: createDocument(),
    selectedLayerId: null,
    zoom: 1,
    library: [],
    userTemplates: [],
  });
  useEditorStore.temporal.getState().clear();
  localStorage.clear();
}

beforeEach(reset);

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('initial state', () => {
  it('starts with the default A4 canvas and no layers', () => {
    const s = useEditorStore.getState();
    expect(s.document.version).toBe(DOCUMENT_VERSION);
    expect(s.document.layers).toEqual([]);
    expect(s.document.frameLocked).toBe(false);
    expect(s.selectedLayerId).toBeNull();
    expect(s.library).toEqual([]);
    expect(s.userTemplates).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// addPhoto (free mode)
// ---------------------------------------------------------------------------

describe('addPhoto — free mode', () => {
  it('creates a new layer with a cover fit placement', () => {
    const doc = useEditorStore.getState().document;
    expect(doc.layers.length).toBe(0);

    useEditorStore.getState().addPhoto('data:image,1', 1600, 900);
    const layers = useEditorStore.getState().document.layers;
    expect(layers.length).toBe(1);

    const l = layers[0];
    expect(l.imageSrc).toBe('data:image,1');
    expect(l.imageW).toBe(1600);
    expect(l.imageH).toBe(900);
    expect(l.fit).toBe('cover');
    // frame is centred within the canvas
    const { w, h } = canvasDesignSize(useEditorStore.getState().document.canvas);
    expect(Math.abs(l.frame.x + l.frame.w / 2 - w / 2)).toBeLessThan(1);
    expect(Math.abs(l.frame.y + l.frame.h / 2 - h / 2)).toBeLessThan(1);
    // placement covers the frame
    expect(l.placement.scale).toBeGreaterThanOrEqual(
      Math.max(l.frame.w / l.imageW, l.frame.h / l.imageH),
    );
  });

  it('selects the newly added layer', () => {
    useEditorStore.getState().addPhoto('data:image,2', 100, 100);
    const { selectedLayerId, document } = useEditorStore.getState();
    expect(selectedLayerId).toBe(document.layers[0].id);
  });

  it('fills a selected empty slot instead of creating a new layer', () => {
    // Set up a doc with one empty slot
    useEditorStore.setState((s) => ({
      document: {
        ...s.document,
        layers: [
          {
            id: 'slot1',
            name: 'Slot 1',
            imageSrc: '',
            imageW: 0,
            imageH: 0,
            frame: { x: 10, y: 10, w: 200, h: 150 },
            rotation: 0,
            placement: { x: 0, y: 0, scale: 1 },
            opacity: 1,
            zIndex: 1,
            fit: 'cover',
          },
        ],
        frameLocked: false,
      },
      selectedLayerId: 'slot1',
    }));
    useEditorStore.getState().addPhoto('data:image,3', 2000, 1000);
    const layers = useEditorStore.getState().document.layers;
    expect(layers.length).toBe(1);
    expect(layers[0].imageSrc).toBe('data:image,3');
    expect(layers[0].id).toBe('slot1');
    expect(layers[0].placement.scale).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// addPhoto — locked (template) mode
// ---------------------------------------------------------------------------

describe('addPhoto — locked mode', () => {
  it('fills the selected empty slot', () => {
    useEditorStore.setState((s) => ({
      document: {
        ...s.document,
        frameLocked: true,
        layers: [
          emptySlot('a', 10, 10, 100, 100),
          emptySlot('b', 120, 10, 100, 100),
        ],
      },
      selectedLayerId: 'a',
    }));
    useEditorStore.getState().addPhoto('data:locked', 800, 600);
    const layers = useEditorStore.getState().document.layers;
    expect(layers.find((l) => l.id === 'a')?.imageSrc).toBe('data:locked');
    expect(layers.find((l) => l.id === 'b')?.imageSrc).toBe(''); // untouched
  });

  it('fills the first empty slot when none is selected', () => {
    useEditorStore.setState((s) => ({
      document: {
        ...s.document,
        frameLocked: true,
        layers: [emptySlot('x', 0, 0, 80, 80)],
      },
      selectedLayerId: null,
    }));
    useEditorStore.getState().addPhoto('data:auto', 400, 300);
    expect(useEditorStore.getState().document.layers[0].imageSrc).toBe('data:auto');
  });

  it('does nothing when all slots are filled', () => {
    useEditorStore.setState((s) => ({
      document: {
        ...s.document,
        frameLocked: true,
        layers: [
          { ...emptySlot('f', 0, 0, 100, 100), imageSrc: 'x', imageW: 10, imageH: 10 },
        ],
      },
    }));
    useEditorStore.getState().addPhoto('data:ignored', 400, 300);
    expect(useEditorStore.getState().document.layers[0].imageSrc).toBe('x');
  });
});

// ---------------------------------------------------------------------------
// fillSlot
// ---------------------------------------------------------------------------

describe('fillSlot', () => {
  it('sets the image and a valid cover placement', () => {
    useEditorStore.setState((s) => ({
      document: {
        ...s.document,
        layers: [emptySlot('s', 20, 20, 160, 120)],
      },
    }));
    useEditorStore.getState().fillSlot('s', 'data:z', 2000, 1000);
    const l = useEditorStore.getState().document.layers[0];
    expect(l.imageSrc).toBe('data:z');
    expect(l.imageW).toBe(2000);
    expect(l.imageH).toBe(1000);
    expect(l.placement.scale).toBeGreaterThanOrEqual(
      Math.max(l.frame.w / 2000, l.frame.h / 1000),
    );
  });
});

// ---------------------------------------------------------------------------
// applyTemplate
// ---------------------------------------------------------------------------

describe('applyTemplate', () => {
  it('creates slot layers and locks frames', () => {
    const tpl: Template = {
      version: TEMPLATE_VERSION,
      name: 'Test',
      canvas: { widthMM: 200, heightMM: 100, dpi: 300, bleedMM: 0 },
      slots: [
        { x: 0, y: 0, w: 100, h: 50 },
        { x: 110, y: 0, w: 90, h: 50 },
      ],
    };
    useEditorStore.getState().applyTemplate(tpl);
    const doc = useEditorStore.getState().document;
    expect(doc.frameLocked).toBe(true);
    expect(doc.layers.length).toBe(2);
    expect(doc.layers.every((l) => l.imageSrc === '')).toBe(true);
    expect(doc.canvas.widthMM).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// setFrameLocked
// ---------------------------------------------------------------------------

describe('setFrameLocked', () => {
  it('toggles the locked flag', () => {
    expect(useEditorStore.getState().document.frameLocked).toBe(false);
    useEditorStore.getState().setFrameLocked(true);
    expect(useEditorStore.getState().document.frameLocked).toBe(true);
    useEditorStore.getState().setFrameLocked(false);
    expect(useEditorStore.getState().document.frameLocked).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setLayerPlacement (reframe clamping)
// ---------------------------------------------------------------------------

describe('setLayerPlacement', () => {
  it('clamps placement so the image keeps covering the frame', () => {
    useEditorStore.setState((s) => ({
      document: {
        ...s.document,
        layers: [
          {
            id: 'p1',
            name: 'P1',
            imageSrc: 'x',
            imageW: 2000,
            imageH: 1000,
            frame: { x: 0, y: 0, w: 100, h: 100 },
            rotation: 0,
            placement: { x: 0, y: 0, scale: 0.15 },
            opacity: 1,
            zIndex: 1,
            fit: 'cover',
          },
        ],
      },
    }));
    // Try to set scale below cover scale (0.1)
    useEditorStore.getState().setLayerPlacement('p1', { x: 0, y: 0, scale: 0.02 });
    const pl = useEditorStore.getState().document.layers[0].placement;
    expect(pl.scale).toBe(0.1); // clamped up
  });
});

// ---------------------------------------------------------------------------
// layer operations
// ---------------------------------------------------------------------------

describe('layer CRUD', () => {
  it('removeLayer deletes the layer and deselects it', () => {
    useEditorStore.setState((s) => ({
      document: { ...s.document, layers: [emptySlot('d', 0, 0, 10, 10)] },
      selectedLayerId: 'd',
    }));
    useEditorStore.getState().removeLayer('d');
    expect(useEditorStore.getState().document.layers.length).toBe(0);
    expect(useEditorStore.getState().selectedLayerId).toBeNull();
  });

  it('moveLayerZ swaps z-indices', () => {
    useEditorStore.setState((s) => ({
      document: {
        ...s.document,
        layers: [
          { ...emptySlot('a', 0, 0, 10, 10), zIndex: 1 },
          { ...emptySlot('b', 0, 0, 10, 10), zIndex: 2 },
        ],
      },
    }));
    useEditorStore.getState().moveLayerZ('a', 'up');
    const layers = useEditorStore.getState().document.layers;
    expect(layers.find((l) => l.id === 'a')!.zIndex).toBe(2);
    expect(layers.find((l) => l.id === 'b')!.zIndex).toBe(1);
  });

  it('setLayerOpacity updates the value', () => {
    useEditorStore.setState((s) => ({
      document: { ...s.document, layers: [emptySlot('o', 0, 0, 10, 10)] },
    }));
    useEditorStore.getState().setLayerOpacity('o', 0.5);
    expect(useEditorStore.getState().document.layers[0].opacity).toBe(0.5);
  });

  it('setLayerFit recomputes placement', () => {
    useEditorStore.setState((s) => ({
      document: {
        ...s.document,
        layers: [
          {
            id: 'fit',
            name: 'F',
            imageSrc: 'x',
            imageW: 2000,
            imageH: 1000,
            frame: { x: 0, y: 0, w: 100, h: 100 },
            rotation: 0,
            placement: { x: 0, y: 0, scale: 0.1 },
            opacity: 1,
            zIndex: 1,
            fit: 'cover',
          },
        ],
      },
    }));
    useEditorStore.getState().setLayerFit('fit', 'contain');
    const l = useEditorStore.getState().document.layers[0];
    expect(l.fit).toBe('contain');
    // contain scale = min(100/2000, 100/1000) = 0.05 → clamped to cover 0.1
    expect(l.placement.scale).toBe(0.1);
  });
});

// ---------------------------------------------------------------------------
// template authoring (newTemplate / addSlot)
// ---------------------------------------------------------------------------

describe('template authoring', () => {
  it('newTemplate clears layers and unlocks', () => {
    useEditorStore.setState((s) => ({
      document: {
        ...s.document,
        frameLocked: true,
        layers: [emptySlot('x', 0, 0, 10, 10)],
      },
    }));
    useEditorStore.getState().newTemplate();
    const doc = useEditorStore.getState().document;
    expect(doc.layers.length).toBe(0);
    expect(doc.frameLocked).toBe(false);
  });

  it('addSlot adds a centred empty frame and unlocks', () => {
    useEditorStore.getState().addSlot();
    const doc = useEditorStore.getState().document;
    expect(doc.layers.length).toBe(1);
    expect(doc.layers[0].imageSrc).toBe('');
    expect(doc.frameLocked).toBe(false);
    const l = doc.layers[0];
    const { w, h } = canvasDesignSize(doc.canvas);
    expect(Math.abs(l.frame.x + l.frame.w / 2 - w / 2)).toBeLessThan(1);
    expect(Math.abs(l.frame.y + l.frame.h / 2 - h / 2)).toBeLessThan(1);
  });
});

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

describe('library', () => {
  it('addToLibrary appends images', () => {
    useEditorStore.getState().addToLibrary([
      { id: 'a', src: 's1', w: 100, h: 100 },
    ]);
    expect(useEditorStore.getState().library.length).toBe(1);
  });

  it('removeFromLibrary deletes an item', () => {
    useEditorStore.getState().addToLibrary([
      { id: 'a', src: 's1', w: 100, h: 100 },
      { id: 'b', src: 's2', w: 200, h: 200 },
    ]);
    useEditorStore.getState().removeFromLibrary('a');
    expect(useEditorStore.getState().library.map((i) => i.id)).toEqual(['b']);
  });

  it('clearLibrary empties the list', () => {
    useEditorStore.getState().addToLibrary([{ id: 'z', src: 'z', w: 1, h: 1 }]);
    useEditorStore.getState().clearLibrary();
    expect(useEditorStore.getState().library).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// User templates (localStorage)
// ---------------------------------------------------------------------------

describe('user templates', () => {
  it('addUserTemplate appends and persists', () => {
    const tpl: Template = {
      version: TEMPLATE_VERSION,
      name: 'Saved',
      canvas: { widthMM: 100, heightMM: 100, dpi: 72, bleedMM: 0 },
      slots: [],
    };
    useEditorStore.getState().addUserTemplate(tpl);
    const list = useEditorStore.getState().userTemplates;
    expect(list.find((t) => t.name === 'Saved')).toBeTruthy();
    // persisted
    const raw = localStorage.getItem('splicing-album:user-templates');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toEqual(list);
  });

  it('deleteUserTemplate removes it', () => {
    useEditorStore.getState().addUserTemplate({
      version: TEMPLATE_VERSION,
      name: 'ToDelete',
      canvas: { widthMM: 1, heightMM: 1, dpi: 1, bleedMM: 0 },
      slots: [],
    });
    useEditorStore.getState().deleteUserTemplate('ToDelete');
    expect(
      useEditorStore.getState().userTemplates.find((t) => t.name === 'ToDelete'),
    ).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Undo / Redo (zundo)
// ---------------------------------------------------------------------------

describe('undo / redo', () => {
  it('undoes an addPhoto and redo brings it back', () => {
    useEditorStore.getState().addPhoto('undo-me', 100, 100);
    expect(useEditorStore.getState().document.layers.length).toBe(1);

    undo();
    expect(useEditorStore.getState().document.layers.length).toBe(0);

    redo();
    expect(useEditorStore.getState().document.layers.length).toBe(1);
  });

  it('tracks only document changes (not selection/library)', () => {
    useEditorStore.getState().addToLibrary([{ id: 'lib1', src: 'x', w: 1, h: 1 }]);
    const lenBefore = useEditorStore.temporal.getState().pastStates.length;
    // library change should NOT create an undo entry
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(lenBefore);
  });

  it('undoes applyTemplate and restores the pre-template state', () => {
    // First, set up a state with one layer
    useEditorStore.setState((s) => ({
      document: {
        ...s.document,
        layers: [
          {
            id: 'pre',
            name: 'Pre',
            imageSrc: 'x',
            imageW: 10,
            imageH: 10,
            frame: { x: 0, y: 0, w: 10, h: 10 },
            rotation: 0,
            placement: { x: 0, y: 0, scale: 1 },
            opacity: 1,
            zIndex: 1,
            fit: 'cover',
          },
        ],
      },
    }));
    useEditorStore.getState().applyTemplate({
      version: TEMPLATE_VERSION,
      name: 'Tpl',
      canvas: { widthMM: 100, heightMM: 100, dpi: 72, bleedMM: 0 },
      slots: [{ x: 10, y: 10, w: 80, h: 80 }],
    });

    // After apply, doc has 1 slot, locked
    expect(useEditorStore.getState().document.layers.length).toBe(1);
    expect(useEditorStore.getState().document.frameLocked).toBe(true);

    undo();
    // Undo restores the pre-template state (1 layer, unlocked)
    expect(useEditorStore.getState().document.layers.length).toBe(1);
    expect(useEditorStore.getState().document.frameLocked).toBe(false);
    expect(useEditorStore.getState().document.layers[0].id).toBe('pre');
  });
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

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
