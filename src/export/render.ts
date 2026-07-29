import type { Document, Layer } from '@/data/types';
import { canvasExportSize } from '@/data/geometry';

export type LayerImage = HTMLImageElement | HTMLCanvasElement | ImageBitmap;

/** Map of layerId → decoded image. Layers with no image (empty slots) are absent. */
export type LoadedImages = Record<string, LayerImage>;

/**
 * Render the full document — with bleed — to an offscreen canvas at the export
 * DPI. Pure Canvas2D, independent of Konva/the live DOM stage, so it is
 * deterministic and not capped by the on-screen viewport. (Chromium's per-canvas
 * dimension/area cap still applies; oversized formats require tiling — see TODO
 * in ExportService.)
 */
export function renderDocumentToCanvas(
  doc: Document,
  images: LoadedImages,
  exportDpi: number,
): HTMLCanvasElement {
  const { w: outW, h: outH } = canvasExportSize(doc.canvas, exportDpi);
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');

  // White print background.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outW, outH);

  const bleedOutPx = (doc.canvas.bleedMM / 25.4) * exportDpi;
  const designToOut = exportDpi / doc.canvas.dpi;
  const layers = [...doc.layers].sort((a, b) => a.zIndex - b.zIndex);
  for (const layer of layers) {
    drawLayer(ctx, layer, images[layer.id], designToOut, bleedOutPx);
  }
  return canvas;
}

function drawLayer(
  ctx: CanvasRenderingContext2D,
  layer: Layer,
  img: LayerImage | undefined,
  designToOut: number,
  offset: number,
): void {
  ctx.save();
  ctx.globalAlpha = layer.opacity;

  const fw = layer.frame.w * designToOut;
  const fh = layer.frame.h * designToOut;
  const cx = layer.frame.x * designToOut + offset + fw / 2;
  const cy = layer.frame.y * designToOut + offset + fh / 2;

  // Rotate around the frame centre, then translate so the frame's top-left is at origin.
  ctx.translate(cx, cy);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.translate(-fw / 2, -fh / 2);

  // Clip to the frame rectangle (the mask) in local coords — this guarantees
  // the visible pixels are exactly image ∩ frame.
  ctx.beginPath();
  ctx.rect(0, 0, fw, fh);
  ctx.clip();

  if (img && layer.imageW > 0) {
    const dw = layer.imageW * layer.placement.scale * designToOut;
    const dh = layer.imageH * layer.placement.scale * designToOut;
    const dx = layer.placement.x * designToOut;
    const dy = layer.placement.y * designToOut;
    try {
      ctx.drawImage(img, dx, dy, dw, dh);
    } catch {
      // drawImage can throw on tainted/cross-origin bitmaps; skip gracefully.
    }
  } else {
    // Empty template slot → light grey placeholder.
    ctx.fillStyle = '#d9d9d9';
    ctx.fillRect(0, 0, fw, fh);
  }

  ctx.restore();
}
