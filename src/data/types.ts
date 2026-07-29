/**
 * Plain, serializable data model for Splicing Album.
 *
 * Konva's `stage.toJSON()` drops clipFunc + image content, so the editor never
 * serializes the scene graph. Instead it keeps this plain model and derives
 * Konva nodes (and the export render) from it. This is what gets saved/loaded,
 * imported/exported as templates, and snapshotted for undo/redo.
 *
 * All layer geometry (frames) is expressed in **canvas design pixels** — i.e.
 * millimetres converted at the document's `canvas.dpi`. The editor renders at
 * this resolution scaled by a view zoom; export scales it again to the target
 * export DPI.
 */

export const DOCUMENT_VERSION = 1 as const;
export const TEMPLATE_VERSION = 1 as const;

export type Fit = 'cover' | 'contain';

/** A rectangle in canvas design-pixel space. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Physical print canvas definition. Bleed is added on every side at export. */
export interface CanvasSpec {
  widthMM: number;
  heightMM: number;
  dpi: number;
  bleedMM: number;
}

/**
 * Where the source image sits inside its frame, in frame-local coordinates.
 * `scale` is applied to the image's natural pixels; (x, y) is the top-left of
 * the scaled image relative to the frame's top-left. This lets the user
 * pan/zoom ("reframe") the photo within its crop window.
 */
export interface ImagePlacement {
  x: number;
  y: number;
  scale: number;
}

/**
 * One photo on the canvas. The `frame` is the visible crop window (the mask);
 * the image is positioned by `placement` and clipped to the frame. The visible
 * pixels of a layer are exactly `image ∩ frame`.
 */
export interface Layer {
  id: string;
  name: string;
  /** Object URL / data URL. Empty string == an unfilled template slot (placeholder). */
  imageSrc: string;
  /** Natural image dimensions in pixels (0 for an empty placeholder). */
  imageW: number;
  imageH: number;
  /** Visible crop window + mask, in canvas design px. */
  frame: Rect;
  /** Degrees, around the frame centre. */
  rotation: number;
  placement: ImagePlacement;
  opacity: number;
  zIndex: number;
  fit: Fit;
}

export interface Document {
  version: typeof DOCUMENT_VERSION;
  canvas: CanvasSpec;
  layers: Layer[];
  /**
   * When true (e.g. after applying a template) frame positions are locked: the
   * user can only fill slots with images and reframe each image within its
   * frame, not move or resize the frames themselves.
   */
  frameLocked: boolean;
}

/** An image in the working library (待选图库) — a palette, not part of the document. */
export interface LibraryImage {
  id: string;
  src: string;
  w: number;
  h: number;
}

/**
 * A layout template: a physical canvas plus a set of preset frame positions
 * ("slots"). Pure geometry — no images. Imported/exported as JSON.
 */
export interface Template {
  version: typeof TEMPLATE_VERSION;
  name: string;
  canvas: CanvasSpec;
  slots: Rect[];
}
