import type { CanvasSpec, Document, Rect, Template } from './types';
import { TEMPLATE_VERSION } from './types';
import { canvasDesignSize } from './geometry';
import { defaultCanvas } from './document';

export function serializeTemplate(template: Template): string {
  return JSON.stringify(template, null, 2);
}

export function parseTemplate(json: string): Template {
  const data = JSON.parse(json);
  if (!data || data.version !== TEMPLATE_VERSION) {
    throw new Error(`Unsupported template version: ${data?.version}`);
  }
  if (!data.canvas || !Array.isArray(data.slots)) {
    throw new Error('Invalid template: missing canvas or slots');
  }
  return data as Template;
}

/** Capture the current layout (canvas + each layer's frame) as a reusable template. */
export function templateFromDocument(doc: Document, name: string): Template {
  return {
    version: TEMPLATE_VERSION,
    name,
    canvas: { ...doc.canvas },
    slots: [...doc.layers]
      .sort((a, b) => a.zIndex - b.zIndex)
      .map((layer) => ({ ...layer.frame })),
  };
}

function grid(
  canvas: CanvasSpec,
  cols: number,
  rows: number,
  padFraction = 0.04,
): Rect[] {
  const { w, h } = canvasDesignSize(canvas);
  const pad = Math.round(Math.min(w, h) * padFraction);
  const gap = pad;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const cellW = (innerW - gap * (cols - 1)) / cols;
  const cellH = (innerH - gap * (rows - 1)) / rows;
  const slots: Rect[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push({
        x: pad + c * (cellW + gap),
        y: pad + r * (cellH + gap),
        w: cellW,
        h: cellH,
      });
    }
  }
  return slots;
}

function full(canvas: CanvasSpec, padFraction = 0.04): Rect {
  const { w, h } = canvasDesignSize(canvas);
  const pad = Math.round(Math.min(w, h) * padFraction);
  return { x: pad, y: pad, w: w - pad * 2, h: h - pad * 2 };
}

/** A small library of starter layouts. */
export function builtInTemplates(): Template[] {
  const canvas: CanvasSpec = defaultCanvas();
  const mk = (name: string, slots: Rect[]): Template => ({
    version: TEMPLATE_VERSION,
    name,
    canvas: { ...canvas },
    slots,
  });
  return [
    mk('Single', [full(canvas)]),
    mk('2-Up', grid(canvas, 2, 1)),
    mk('3-Up', grid(canvas, 3, 1)),
    mk('4-Up Grid', grid(canvas, 2, 2)),
    mk('6-Up Grid', grid(canvas, 3, 2)),
  ];
}
