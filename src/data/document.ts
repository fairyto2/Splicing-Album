import type { CanvasSpec, Document, Layer } from './types';
import { DOCUMENT_VERSION } from './types';

/** Default physical canvas: A4 landscape @ 300 DPI with a 3 mm bleed. */
export const DEFAULT_CANVAS: CanvasSpec = {
  widthMM: 297,
  heightMM: 210,
  dpi: 300,
  bleedMM: 3,
};

export function defaultCanvas(overrides: Partial<CanvasSpec> = {}): CanvasSpec {
  return { ...DEFAULT_CANVAS, ...overrides };
}

export function createDocument(canvas: CanvasSpec = defaultCanvas()): Document {
  return { version: DOCUMENT_VERSION, canvas: { ...canvas }, layers: [], frameLocked: false };
}

export function serializeDocument(doc: Document): string {
  return JSON.stringify(doc, null, 2);
}

export function parseDocument(json: string): Document {
  const data = JSON.parse(json);
  if (!data || data.version !== DOCUMENT_VERSION) {
    throw new Error(`Unsupported document version: ${data?.version}`);
  }
  if (!data.canvas || !Array.isArray(data.layers)) {
    throw new Error('Invalid document: missing canvas or layers');
  }
  return { ...data, frameLocked: data.frameLocked === true } as Document;
}

/** Highest zIndex currently in use (0 for an empty document). */
export function maxZIndex(layers: Layer[]): number {
  return layers.reduce((max, layer) => Math.max(max, layer.zIndex), 0);
}
