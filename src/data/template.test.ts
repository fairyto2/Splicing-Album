import { describe, expect, it } from 'vitest';
import type { Document } from './types';
import { createDocument } from './document';
import { builtInTemplates, parseTemplate, serializeTemplate, templateFromDocument } from './template';
import { TEMPLATE_VERSION } from './types';

describe('serializeTemplate / parseTemplate', () => {
  it('round-trips a template through JSON', () => {
    const [tpl] = builtInTemplates();
    const round = parseTemplate(serializeTemplate(tpl));
    expect(round).toEqual(tpl);
  });

  it('rejects an unsupported version', () => {
    expect(() => parseTemplate(JSON.stringify({ version: 99, canvas: {}, slots: [] }))).toThrow();
  });

  it('rejects a template missing slots', () => {
    expect(() => parseTemplate(JSON.stringify({ version: TEMPLATE_VERSION, canvas: {} }))).toThrow();
  });
});

describe('builtInTemplates', () => {
  it('provides a starter library with valid geometry', () => {
    const list = builtInTemplates();
    expect(list.length).toBeGreaterThan(0);
    for (const tpl of list) {
      expect(tpl.version).toBe(TEMPLATE_VERSION);
      expect(tpl.canvas.widthMM).toBeGreaterThan(0);
      expect(tpl.slots.length).toBeGreaterThan(0);
      for (const slot of tpl.slots) {
        expect(slot.w).toBeGreaterThan(0);
        expect(slot.h).toBeGreaterThan(0);
      }
    }
  });
});

describe('templateFromDocument', () => {
  it('captures canvas + each layer frame, ordered by zIndex', () => {
    const doc: Document = {
      ...createDocument(),
      layers: [
        { id: 'a', name: 'A', imageSrc: 'x', imageW: 10, imageH: 10, frame: { x: 0, y: 0, w: 10, h: 10 }, rotation: 0, placement: { x: 0, y: 0, scale: 1 }, opacity: 1, zIndex: 2, fit: 'cover' },
        { id: 'b', name: 'B', imageSrc: 'y', imageW: 10, imageH: 10, frame: { x: 5, y: 5, w: 20, h: 20 }, rotation: 0, placement: { x: 0, y: 0, scale: 1 }, opacity: 1, zIndex: 1, fit: 'cover' },
      ],
    };
    const tpl = templateFromDocument(doc, 'Test');
    expect(tpl.name).toBe('Test');
    // zIndex ascending: b (z=1) then a (z=2) → slots [b.frame, a.frame]
    expect(tpl.slots).toEqual([
      { x: 5, y: 5, w: 20, h: 20 },
      { x: 0, y: 0, w: 10, h: 10 },
    ]);
  });
});
