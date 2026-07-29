import { describe, expect, it } from 'vitest';
import {
  MM_PER_INCH,
  canvasDesignSize,
  canvasExportSize,
  centreRect,
  clampFrameToCanvas,
  clampPlacement,
  coverScale,
  defaultFrameForAspect,
  fitPlacement,
  mmToPx,
  rectClipFunc,
  zoomPlacement,
} from './geometry';
import type { CanvasSpec, ImagePlacement } from './types';

const canvas: CanvasSpec = { widthMM: 297, heightMM: 210, dpi: 300, bleedMM: 3 };

describe('mmToPx', () => {
  it('converts millimetres to pixels at a given DPI', () => {
    expect(mmToPx(MM_PER_INCH, 300)).toBeCloseTo(300, 5);
    expect(mmToPx(25.4, 72)).toBeCloseTo(72, 5);
  });
});

describe('canvasDesignSize', () => {
  it('is the design pixel size at the canvas DPI', () => {
    const { w, h } = canvasDesignSize(canvas);
    expect(w).toBe(Math.round((297 / 25.4) * 300));
    expect(h).toBe(Math.round((210 / 25.4) * 300));
  });
});

describe('fitPlacement', () => {
  it('covers the frame and centres a landscape image in a square frame', () => {
    const p = fitPlacement(2000, 1000, 100, 100, 'cover');
    expect(p.scale).toBeCloseTo(0.1, 5); // 100/1000
    expect(p.x).toBeCloseTo(-50, 5); // (100 - 2000*0.1)/2
    expect(p.y).toBeCloseTo(0, 5);
  });

  it('contains the image inside the frame with letterboxing', () => {
    const p = fitPlacement(2000, 1000, 100, 100, 'contain');
    expect(p.scale).toBeCloseTo(0.05, 5); // 100/2000
    expect(p.x).toBeCloseTo(0, 5);
    expect(p.y).toBeCloseTo(25, 5);
  });

  it('is degenerate but safe for zero-size images', () => {
    const p = fitPlacement(0, 0, 100, 100, 'cover');
    expect(p).toEqual({ x: 0, y: 0, scale: 1 });
  });
});

describe('defaultFrameForAspect', () => {
  it('preserves the aspect ratio and centres within the canvas', () => {
    const { w, h } = canvasDesignSize(canvas);
    const frame = defaultFrameForAspect(canvas, 2, 0.6);
    expect(frame.w / frame.h).toBeCloseTo(2, 1);
    expect(frame.x + frame.w / 2).toBeCloseTo(w / 2, 0);
    expect(frame.y + frame.h / 2).toBeCloseTo(h / 2, 0);
  });
});

describe('clampFrameToCanvas', () => {
  it('clamps an oversized frame to the canvas bounds', () => {
    const { w, h } = canvasDesignSize(canvas);
    const clamped = clampFrameToCanvas({ x: -50, y: -50, w: w * 2, h: h * 2 }, canvas);
    expect(clamped.w).toBe(w);
    expect(clamped.h).toBe(h);
    expect(clamped.x).toBe(0);
    expect(clamped.y).toBe(0);
  });
});

describe('rectClipFunc', () => {
  it('describes the frame rectangle in local coordinates', () => {
    const calls: unknown[] = [];
    const mockCtx = {
      beginPath: () => calls.push('beginPath'),
      rect: (x: number, y: number, w: number, h: number) => calls.push({ rect: [x, y, w, h] }),
      closePath: () => calls.push('closePath'),
    };
    rectClipFunc({ x: 9, y: 9, w: 120, h: 80 })(mockCtx);
    expect(calls).toEqual(['beginPath', { rect: [0, 0, 120, 80] }, 'closePath']);
  });
});

// ---------------------------------------------------------------------------
// canvasExportSize
// ---------------------------------------------------------------------------

describe('canvasExportSize', () => {
  it('adds bleed on every side and scales to the export DPI', () => {
    const { w, h } = canvasExportSize(
      { widthMM: 297, heightMM: 210, dpi: 300, bleedMM: 3 },
      300,
    );
    // 297 + 6 = 303 mm; 210 + 6 = 216 mm; @ 300 dpi
    const ew = Math.round((303 / 25.4) * 300);
    const eh = Math.round((216 / 25.4) * 300);
    expect(w).toBe(ew);
    expect(h).toBe(eh);
  });

  it('respects a different export DPI', () => {
    const { w } = canvasExportSize(
      { widthMM: 254, heightMM: 254, dpi: 300, bleedMM: 0 },
      72,
    );
    // 25.4 cm × 72 dpi = 720 px
    expect(w).toBe(720);
  });
});

// ---------------------------------------------------------------------------
// centreRect
// ---------------------------------------------------------------------------

describe('centreRect', () => {
  it('centres a rect within a bounding box', () => {
    const result = centreRect({ x: 0, y: 0, w: 400, h: 300 }, 100, 60);
    expect(result.x).toBe(150); // (400-100)/2
    expect(result.y).toBe(120); // (300-60)/2
    expect(result.w).toBe(100);
    expect(result.h).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// coverScale
// ---------------------------------------------------------------------------

describe('coverScale', () => {
  it('is the minimum scale that makes the image cover the frame', () => {
    // 2000×1000 → frame 500×500 → need scale 500/1000=0.5 (height-limited)
    expect(coverScale(2000, 1000, 500, 500)).toBe(0.5);
  });

  it('is the width-driven scale for a portrait image in a landscape frame', () => {
    expect(coverScale(1000, 2000, 500, 500)).toBe(0.5); // width-limited: 500/1000
  });

  it('returns 1 for degenerate inputs', () => {
    expect(coverScale(0, 0, 100, 100)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// clampPlacement
// ---------------------------------------------------------------------------

describe('clampPlacement', () => {
  it('keeps scale at or above the cover scale', () => {
    const p: ImagePlacement = { x: 0, y: 0, scale: 0.02 };
    const c = clampPlacement(p, 2000, 1000, 100, 100);
    // coverScale = max(100/2000, 100/1000) = 0.1
    expect(c.scale).toBe(0.1);
  });

  it('does not change an already-valid placement', () => {
    const p: ImagePlacement = { x: -50, y: 0, scale: 0.1 }; // valid cover
    const c = clampPlacement(p, 2000, 1000, 100, 100);
    expect(c).toEqual(p);
  });

  it('clamps x so the image never leaves a gap', () => {
    // scale 0.15 → drawW = 300, frameW = 100. x in [100-300, 0] = [-200, 0]
    const p: ImagePlacement = { x: 50, y: 0, scale: 0.15 };
    const c = clampPlacement(p, 2000, 1000, 100, 100);
    expect(c.x).toBe(0); // clamped to max 0
  });

  it('does the same for y', () => {
    const p: ImagePlacement = { x: 0, y: 80, scale: 0.15 };
    const c = clampPlacement(p, 1000, 2000, 100, 100);
    expect(c.y).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// zoomPlacement
// ---------------------------------------------------------------------------

describe('zoomPlacement', () => {
  it('increases scale around an anchor point', () => {
    const p: ImagePlacement = { x: -30, y: -30, scale: 0.15 };
    const z = zoomPlacement(p, 2000, 1000, { x: 0, y: 0, w: 100, h: 100 }, 2, 50, 50);
    expect(z.scale).toBeCloseTo(0.3, 5);
    // anchor at (50,50) frame-local; image pixel under cursor should stay
    // newX = 50 - (50 - (-30)) * (0.3/0.15) = 50 - 80*2 = 50 - 160 = -110, then clamped
    expect(z.x).toBeCloseTo(-110, 0);
  });

  it('caps at the maximum scale', () => {
    const p: ImagePlacement = { x: -30, y: -30, scale: 0.15 };
    const minScale = coverScale(2000, 1000, 100, 100); // 0.1
    const z = zoomPlacement(p, 2000, 1000, { x: 0, y: 0, w: 100, h: 100 }, 100, 50, 50);
    expect(z.scale).toBe(minScale * 12);
  });

  it('never drops below cover scale when zooming out', () => {
    const p: ImagePlacement = { x: 0, y: 0, scale: 0.15 };
    const z = zoomPlacement(p, 2000, 1000, { x: 0, y: 0, w: 100, h: 100 }, 0.1, 0, 0);
    expect(z.scale).toBeGreaterThanOrEqual(0.1);
  });
});
