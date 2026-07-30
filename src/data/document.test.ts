import { describe, expect, it } from 'vitest';
import { createDocument, maxZIndex, parseDocument, serializeDocument } from './document';
import { DEFAULT_CANVAS } from './document';
import { DOCUMENT_VERSION } from './types';

describe('createDocument', () => {
  it('starts empty with the default A4 canvas', () => {
    const doc = createDocument();
    expect(doc.version).toBe(DOCUMENT_VERSION);
    expect(doc.layers).toEqual([]);
    expect(doc.canvas).toEqual(DEFAULT_CANVAS);
  });
});

describe('serializeDocument / parseDocument', () => {
  it('round-trips through JSON', () => {
    const doc = createDocument();
    doc.layers.push({
      id: '1',
      name: 'Photo 1',
      imageSrc: 'data:,',
      imageW: 100,
      imageH: 50,
      frame: { x: 10, y: 10, w: 100, h: 50 },
      rotation: 37,
      placement: { x: 0, y: 0, scale: 1 },
      opacity: 1,
      zIndex: 1,
      fit: 'cover',
    });
    expect(parseDocument(serializeDocument(doc))).toEqual(doc);
  });

  it('rejects an unsupported version', () => {
    expect(() => parseDocument(JSON.stringify({ version: 7, canvas: {}, layers: [] }))).toThrow();
  });
});

describe('maxZIndex', () => {
  it('returns 0 for an empty layer list', () => {
    expect(maxZIndex([])).toBe(0);
  });
  it('returns the largest zIndex', () => {
    expect(maxZIndex([{ zIndex: 1 }, { zIndex: 5 }, { zIndex: 3 }] as never[])).toBe(5);
  });
});
