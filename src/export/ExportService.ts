import type { Document } from '@/data/types';
import type { LoadedImages } from './render';
import { renderDocumentToCanvas } from './render';
import { MatrixCmykConverter, type ColorConverter } from './color';
import { writeCmykTiff } from './tiff/writeCmykTiff';

export interface ExportOptions {
  dpi: number;
  colorMode: 'cmyk' | 'rgb';
  /** Defaults to MatrixCmykConverter. Inject LcmsWasmConverter once wired. */
  converter?: ColorConverter;
}

export interface ExportResult {
  bytes: Uint8Array;
  mime: string;
  ext: 'tif' | 'png';
  width: number;
  height: number;
}

// Chromium caps each canvas dimension at ~32k px and total area too. Oversized
// print formats (e.g. large posters at 300 DPI) exceed this and require tiled
// rendering + stitched output — deferred beyond the MVP.
const MAX_EXPORT_DIMENSION = 32000;

/**
 * Composite the document to pixels and produce a print file.
 * - `cmyk`: RGBA → CMYK (via converter) → uncompressed CMYK TIFF.
 * - `rgb`:  RGBA → PNG.
 */
export async function exportDocument(
  doc: Document,
  images: LoadedImages,
  opts: ExportOptions,
): Promise<ExportResult> {
  const canvas = renderDocumentToCanvas(doc, images, opts.dpi);
  const { width, height } = canvas;
  if (width > MAX_EXPORT_DIMENSION || height > MAX_EXPORT_DIMENSION) {
    throw new Error(
      `Export size ${width}×${height} exceeds the single-canvas cap (${MAX_EXPORT_DIMENSION}px). ` +
        'Tiled export for oversized formats is not implemented yet.',
    );
  }

  if (opts.colorMode === 'rgb') {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    );
    if (!blob) throw new Error('PNG encoding failed');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return { bytes, mime: 'image/png', ext: 'png', width, height };
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  const { data } = ctx.getImageData(0, 0, width, height);
  const converter = opts.converter ?? new MatrixCmykConverter();
  const cmyk = converter.rgbaToCmyk(data, width, height);
  const bytes = writeCmykTiff(cmyk, { width, height, dpi: opts.dpi });
  return { bytes, mime: 'image/tiff', ext: 'tif', width, height };
}
