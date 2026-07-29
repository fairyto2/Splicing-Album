import { useEffect, useRef, useState } from 'react';
import type { DragEvent as ReactDragEvent } from 'react';
import { Group, Layer as KLayer, Rect, Stage, Transformer } from 'react-konva';
import type Konva from 'konva';
import { useEditorStore } from '@/state/editorStore';
import { useT } from '@/i18n';
import type { Rect as RectT } from '@/data/types';
import { canvasDesignSize, mmToPx, zoomPlacement } from '@/data/geometry';
import { PhotoLayer } from './PhotoLayer';

function pointInFrame(x: number, y: number, frame: RectT): boolean {
  return x >= frame.x && x <= frame.x + frame.w && y >= frame.y && y <= frame.y + frame.h;
}

export function CanvasStage() {
  const doc = useEditorStore((s) => s.document);
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId);
  const library = useEditorStore((s) => s.library);
  const selectLayer = useEditorStore((s) => s.selectLayer);
  const setLayerPlacement = useEditorStore((s) => s.setLayerPlacement);
  const fillSlot = useEditorStore((s) => s.fillSlot);
  const { t } = useT();

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);

  const trRef = useRef<Konva.Transformer>(null);
  const nodesRef = useRef<Map<string, Konva.Rect>>(new Map());
  const registerNode = (id: string, node: Konva.Rect | null) => {
    if (node) nodesRef.current.set(id, node);
    else nodesRef.current.delete(id);
  };

  const { w: dw, h: dh } = canvasDesignSize(doc.canvas);
  const bleedPx = mmToPx(doc.canvas.bleedMM, doc.canvas.dpi);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setVp({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (vp.w && vp.h && dw && dh) {
      const fit = Math.min(vp.w / dw, vp.h / dh) * 0.9;
      if (Number.isFinite(fit) && fit > 0) setZoom(fit);
    }
  }, [vp.w, vp.h, dw, dh]);

  const offsetX = (vp.w - dw * zoom) / 2;
  const offsetY = (vp.h - dh * zoom) / 2;

  // Attach the Transformer only in free mode (frames unlocked).
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    if (doc.frameLocked || !selectedLayerId) {
      tr.nodes([]);
      return;
    }
    const node = nodesRef.current.get(selectedLayerId);
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedLayerId, doc.layers, doc.frameLocked]);

  // Wheel-zoom the image inside the frame under the cursor (locked mode reframe).
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    if (!doc.frameLocked) return;
    const stage = stageRef.current;
    if (!stage) return;
    e.evt.preventDefault();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const dx = (pointer.x - offsetX) / zoom;
    const dy = (pointer.y - offsetY) / zoom;
    const top = [...doc.layers]
      .sort((a, b) => b.zIndex - a.zIndex)
      .find((l) => l.imageW > 0 && pointInFrame(dx, dy, l.frame));
    if (!top) return;
    const factor = e.evt.deltaY < 0 ? 1.1 : 1 / 1.1;
    const np = zoomPlacement(
      top.placement,
      top.imageW,
      top.imageH,
      top.frame,
      factor,
      dx - top.frame.x,
      dy - top.frame.y,
    );
    setLayerPlacement(top.id, np);
  };

  // Drop a library image onto a frame to fill it.
  const handleDrop = (e: ReactDragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('application/x-library-id') || e.dataTransfer.getData('text/plain');
    if (!id) return;
    const item = library.find((i) => i.id === id);
    if (!item) return;
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.container().getBoundingClientRect();
    const dx = (e.clientX - rect.left - offsetX) / zoom;
    const dy = (e.clientY - rect.top - offsetY) / zoom;
    const slot = [...doc.layers]
      .sort((a, b) => b.zIndex - a.zIndex)
      .find((l) => pointInFrame(dx, dy, l.frame));
    if (!slot) return;
    fillSlot(slot.id, item.src, item.w, item.h);
    selectLayer(slot.id);
  };

  const sorted = [...doc.layers].sort((a, b) => a.zIndex - b.zIndex);

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const target = e.target;
    const name = target.attrs?.name;
    if (target === target.getStage() || name === 'background' || name === 'guide') {
      selectLayer(null);
    }
  };

  return (
    <div
      className="stage-wrap"
      ref={containerRef}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={handleDrop}
    >
      <div className="zoom-controls">
        <button onClick={() => setZoom((z) => Math.max(0.05, z * 0.8))} aria-label={t('canvas.zoomOut')}>
          −
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(8, z * 1.25))} aria-label={t('canvas.zoomIn')}>
          +
        </button>
        {doc.frameLocked && <span className="badge">{t('canvas.framesLocked')}</span>}
      </div>

      {vp.w > 0 && vp.h > 0 && (
        <Stage
          ref={stageRef}
          width={vp.w}
          height={vp.h}
          onMouseDown={handleStageMouseDown}
          onWheel={handleWheel}
        >
          <KLayer>
            <Group x={offsetX} y={offsetY} scaleX={zoom} scaleY={zoom}>
              <Rect
                name="background"
                x={0}
                y={0}
                width={dw}
                height={dh}
                fill="#ffffff"
                shadowBlur={24 / zoom}
                shadowColor="rgba(0,0,0,0.45)"
                shadowOffsetX={0}
                shadowOffsetY={4 / zoom}
              />
              {bleedPx > 0 && (
                <Rect
                  name="guide"
                  x={-bleedPx}
                  y={-bleedPx}
                  width={dw + bleedPx * 2}
                  height={dh + bleedPx * 2}
                  stroke="#ff5a5a"
                  strokeWidth={1 / zoom}
                  dash={[6 / zoom, 4 / zoom]}
                  listening={false}
                />
              )}

              {sorted.map((layer) => (
                <PhotoLayer
                  key={layer.id}
                  layer={layer}
                  selected={layer.id === selectedLayerId}
                  zoom={zoom}
                  frameLocked={doc.frameLocked}
                  registerNode={registerNode}
                />
              ))}

              <Transformer
                ref={trRef}
                rotateEnabled={false}
                keepRatio={false}
                flipEnabled={false}
                borderStroke="#2d7ff9"
                anchorStroke="#2d7ff9"
                anchorFill="#ffffff"
                anchorSize={9}
                ignoreStroke
                boundBoxFunc={(oldBox, newBox) =>
                  newBox.width < 10 || newBox.height < 10 ? oldBox : newBox
                }
              />
            </Group>
          </KLayer>
        </Stage>
      )}
    </div>
  );
}
