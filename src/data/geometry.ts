import type { CanvasSpec, Fit, ImagePlacement, Rect } from './types';

export const MM_PER_INCH = 25.4;

export function mmToPx(mm: number, dpi: number): number {
  return (mm / MM_PER_INCH) * dpi;
}

/** Canvas size in design pixels (at the document's own DPI). */
export function canvasDesignSize(canvas: CanvasSpec): { w: number; h: number } {
  return { w: Math.round(mmToPx(canvas.widthMM, canvas.dpi)), h: Math.round(mmToPx(canvas.heightMM, canvas.dpi)) };
}

/** Canvas size at the export DPI, including bleed on every side. */
export function canvasExportSize(canvas: CanvasSpec, exportDpi: number): { w: number; h: number } {
  const w = mmToPx(canvas.widthMM + canvas.bleedMM * 2, exportDpi);
  const h = mmToPx(canvas.heightMM + canvas.bleedMM * 2, exportDpi);
  return { w: Math.round(w), h: Math.round(h) };
}

/**
 * Place an image of natural size (imageW x imageH) inside a frame so it `fit`s
 * and is centred. Returns frame-local coordinates for the scaled image.
 */
export function fitPlacement(
  imageW: number,
  imageH: number,
  frameW: number,
  frameH: number,
  fit: Fit,
): ImagePlacement {
  if (imageW <= 0 || imageH <= 0) {
    return { x: 0, y: 0, scale: 1 };
  }
  const scale =
    fit === 'cover'
      ? Math.max(frameW / imageW, frameH / imageH)
      : Math.min(frameW / imageW, frameH / imageH);
  const drawW = imageW * scale;
  const drawH = imageH * scale;
  return { x: (frameW - drawW) / 2, y: (frameH - drawH) / 2, scale };
}

/** Centre a rect of the given size inside a bounding rect. */
export function centreRect(bound: Rect, w: number, h: number): Rect {
  return { x: bound.x + (bound.w - w) / 2, y: bound.y + (bound.h - h) / 2, w, h };
}

/** A centred rectangle filling `fraction` of the shorter side, preserving `aspect`. */
export function defaultFrameForAspect(canvas: CanvasSpec, aspect: number, fraction = 0.6): Rect {
  const { w, h } = canvasDesignSize(canvas);
  const maxW = w * fraction;
  const maxH = h * fraction;
  let frameW: number;
  let frameH: number;
  if (aspect >= 1) {
    frameW = maxW;
    frameH = maxW / aspect;
    if (frameH > maxH) {
      frameH = maxH;
      frameW = maxH * aspect;
    }
  } else {
    frameH = maxH;
    frameW = maxH * aspect;
    if (frameW > maxW) {
      frameW = maxW;
      frameH = maxW / aspect;
    }
  }
  return centreRect({ x: 0, y: 0, w, h }, frameW, frameH);
}

/** Clamp a frame so it stays inside the canvas design bounds. */
export function clampFrameToCanvas(frame: Rect, canvas: CanvasSpec): Rect {
  const { w, h } = canvasDesignSize(canvas);
  return {
    x: Math.max(0, Math.min(frame.x, Math.max(0, w - frame.w))),
    y: Math.max(0, Math.min(frame.y, Math.max(0, h - frame.h))),
    w: Math.min(frame.w, w),
    h: Math.min(frame.h, h),
  };
}

/** Minimal context shape used by Konva `clipFunc` and the export renderer. */
interface PathCtx {
  beginPath(): void;
  rect(x: number, y: number, w: number, h: number): void;
  closePath(): void;
}

/**
 * Returns a Konva-compatible `clipFunc` that clips a node to its frame rectangle
 * in local coordinates (0..w, 0..h). Deriving this at render time means the clip
 * never has to be serialized.
 */
export function rectClipFunc(frame: Rect) {
  return (ctx: PathCtx) => {
    ctx.beginPath();
    ctx.rect(0, 0, frame.w, frame.h);
    ctx.closePath();
  };
}

/** Draw the frame rectangle path onto a plain 2D canvas context (used by export). */
export function rectPath(ctx: CanvasRenderingContext2D, frame: Rect): void {
  ctx.beginPath();
  ctx.rect(frame.x, frame.y, frame.w, frame.h);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// Reframe (image pan/zoom within a locked frame)
// ---------------------------------------------------------------------------

export function clamp(n: number, min: number, max: number): number {
  return n < min ? min : n > max ? max : n;
}

/** Smallest scale at which the image covers the frame. */
export function coverScale(imageW: number, imageH: number, frameW: number, frameH: number): number {
  if (imageW <= 0 || imageH <= 0) return 1;
  return Math.max(frameW / imageW, frameH / imageH);
}

/**
 * Clamp an image placement so the image always fully covers the frame (no gaps),
 * and the scale never drops below the cover scale. Coordinates are frame-local.
 */
export function clampPlacement(
  p: ImagePlacement,
  imageW: number,
  imageH: number,
  frameW: number,
  frameH: number,
): ImagePlacement {
  const minScale = coverScale(imageW, imageH, frameW, frameH);
  const scale = Math.max(p.scale, minScale);
  const drawW = imageW * scale;
  const drawH = imageH * scale;
  const x = drawW >= frameW ? clamp(p.x, frameW - drawW, 0) : (frameW - drawW) / 2;
  const y = drawH >= frameH ? clamp(p.y, frameH - drawH, 0) : (frameH - drawH) / 2;
  return { x, y, scale };
}

/**
 * Zoom an image around a frame-local anchor point so that point stays under the
 * cursor. Scale is clamped to [coverScale, coverScale * 12].
 */
export function zoomPlacement(
  p: ImagePlacement,
  imageW: number,
  imageH: number,
  frame: Rect,
  factor: number,
  anchorX: number,
  anchorY: number,
): ImagePlacement {
  const minScale = coverScale(imageW, imageH, frame.w, frame.h);
  const maxScale = minScale * 12;
  const newScale = clamp(p.scale * factor, minScale, maxScale);
  const k = newScale / p.scale;
  const nx = anchorX - (anchorX - p.x) * k;
  const ny = anchorY - (anchorY - p.y) * k;
  return clampPlacement({ x: nx, y: ny, scale: newScale }, imageW, imageH, frame.w, frame.h);
}

