import type { ColorConverter } from './color';

/**
 * ICC-profile-managed RGB→CMYK via `lcms-wasm` (a WebAssembly port of
 * LittleCMS). This is the chosen direction for accurate, press-ready color on
 * BOTH desktop and mobile without native modules.
 *
 * STATUS: skeleton. Wiring requires (1) bundling/ fetching source (sRGB) and
 * target (e.g. PSO Coated v3 / FOGRA39) ICC profiles, (2) initializing the
 * lcms-wasm transform with those profiles, and (3) feeding the RGBA buffer
 * through it. The `ColorConverter` interface is already in place, so once this
 * is implemented it drops straight into `ExportService` as a drop-in upgrade
 * over `MatrixCmykConverter`.
 *
 * Until then, `ExportService` uses `MatrixCmykConverter` so the pipeline
 * produces valid CMYK today.
 */
export class LcmsWasmConverter implements ColorConverter {
  readonly id = 'lcms-wasm';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  rgbaToCmyk(_rgba: Uint8ClampedArray, _width: number, _height: number): Uint8Array {
    throw new Error(
      'LcmsWasmConverter is not wired yet — see src/export/lcms.ts. ' +
        'ExportService falls back to MatrixCmykConverter.',
    );
  }
}
