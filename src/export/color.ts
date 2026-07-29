/**
 * RGB → CMYK color conversion.
 *
 * The browser Canvas API only outputs RGB. To produce a print file we convert
 * the composited RGBA pixels to 4-channel CMYK. This module defines the
 * swappable `ColorConverter` interface so the conversion strategy can change
 * without touching the editor or the renderer.
 *
 * MVP ships with `MatrixCmykConverter` — a pure-JS, fully offline separation
 * with under-color removal (UCR). It is NOT ICC-profile-managed, but it yields
 * valid, deterministic 4-channel CMYK (white → 0 ink, black → K-only) with zero
 * external dependencies and no native modules — so the same path runs on
 * desktop and mobile.
 *
 * Upgrade path: a `LcmsWasmConverter` (see ./lcms.ts) using `lcms-wasm` with
 * real ICC profiles (sRGB → FOGRA39/PSO Coated v3) implements the same
 * interface and can replace the matrix converter behind `ExportService`.
 */

export interface ColorConverter {
  readonly id: string;
  rgbaToCmyk(rgba: Uint8ClampedArray, width: number, height: number): Uint8Array;
}

function clamp255(n: number): number {
  return n < 0 ? 0 : n > 255 ? 255 : n;
}

export class MatrixCmykConverter implements ColorConverter {
  readonly id = 'matrix';

  rgbaToCmyk(rgba: Uint8ClampedArray, width: number, height: number): Uint8Array {
    const pixels = width * height;
    if (rgba.length < pixels * 4) {
      throw new Error('rgba buffer smaller than width*height*4');
    }
    const out = new Uint8Array(pixels * 4);
    for (let i = 0, p = 0; i < pixels * 4; i += 4, p += 4) {
      const r = rgba[i] / 255;
      const g = rgba[i + 1] / 255;
      const b = rgba[i + 2] / 255;
      const c = 1 - r;
      const m = 1 - g;
      const y = 1 - b;
      const k = Math.min(c, m, y);
      // Under-color removal: pull the grey component out of C/M/Y into K.
      out[p] = clamp255((c - k) * 255);
      out[p + 1] = clamp255((m - k) * 255);
      out[p + 2] = clamp255((y - k) * 255);
      out[p + 3] = clamp255(k * 255);
    }
    return out;
  }
}
