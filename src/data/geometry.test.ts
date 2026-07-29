import { describe, expect, it } from 'vitest';
import {
  MM_PER_INCH,
  canvasDesignSize,
  clampFrameToCanvas,
  defaultFrameForAspect,
  fitPlacement,
  mmToPx,
  rectClipFunc,
} from './geometry';
import type { CanvasSpec } from './types';

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
