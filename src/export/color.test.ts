import { describe, expect, it } from 'vitest';
import { MatrixCmykConverter } from './color';

function rgba(...pixels: Array<[number, number, number]>): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach((p, i) => {
    out[i * 4] = p[0];
    out[i * 4 + 1] = p[1];
    out[i * 4 + 2] = p[2];
    out[i * 4 + 3] = 255;
  });
  return out;
}

describe('MatrixCmykConverter', () => {
  const conv = new MatrixCmykConverter();

  it('emits 4 bytes per pixel', () => {
    const out = conv.rgbaToCmyk(rgba([0, 0, 0]), 1, 1);
    expect(out.length).toBe(4);
  });

  it('maps white to zero ink', () => {
    const [c, m, y, k] = conv.rgbaToCmyk(rgba([255, 255, 255]), 1, 1);
    expect([c, m, y, k]).toEqual([0, 0, 0, 0]);
  });

  it('maps black to K-only (UCR pulls grey out of CMY)', () => {
    const [c, m, y, k] = conv.rgbaToCmyk(rgba([0, 0, 0]), 1, 1);
    expect([c, m, y]).toEqual([0, 0, 0]);
    expect(k).toBe(255);
  });

  it('maps red to M+Y', () => {
    const [c, m, y, k] = conv.rgbaToCmyk(rgba([255, 0, 0]), 1, 1);
    expect(c).toBe(0);
    expect(m).toBe(255);
    expect(y).toBe(255);
    expect(k).toBe(0);
  });

  it('maps grey to K-only', () => {
    const v = 128;
    const [, , , k] = conv.rgbaToCmyk(rgba([v, v, v]), 1, 1);
    expect(k).toBeGreaterThan(120);
    expect(k).toBeLessThan(135);
  });

  it('processes a multi-pixel buffer', () => {
    const out = conv.rgbaToCmyk(rgba([255, 255, 255], [0, 0, 0], [255, 0, 0]), 3, 1);
    expect(out.length).toBe(12);
    // pixel 0 white, pixel 2 red
    expect(Array.from(out.slice(0, 4))).toEqual([0, 0, 0, 0]);
    expect(Array.from(out.slice(8, 12))).toEqual([0, 255, 255, 0]);
  });
});
