import { useEffect, useRef } from 'react';
import { Group, Image as KonvaImage, Rect } from 'react-konva';
import type Konva from 'konva';
import type { Layer } from '@/data/types';
import { clamp, rectClipFunc } from '@/data/geometry';
import { useImage } from '@/lib/imageCache';
import { useEditorStore } from '@/state/editorStore';

interface Props {
  layer: Layer;
  selected: boolean;
  zoom: number;
  frameLocked: boolean;
  registerNode: (id: string, node: Konva.Rect | null) => void;
}

/**
 * One photo. Two interaction modes:
 *
 *  • Locked (template mode): the frame is fixed; the image is draggable to pan
 *    and wheel-zoomed to reframe, always staying clipped to (covering) the frame.
 *    Empty slots show a placeholder and accept library drops.
 *
 *  • Unlocked (free mode): the frame handle is draggable + Transformer-resizable
 *    (the original behaviour).
 *
 * In both modes the image is inside a clipped Group, so visible pixels are
 * always exactly image ∩ frame.
 */
export function PhotoLayer({ layer, selected, zoom, frameLocked, registerNode }: Props) {
  const img = useImage(layer.imageSrc);
  const rectRef = useRef<Konva.Rect>(null);
  const setLayerPlacement = useEditorStore((s) => s.setLayerPlacement);
  const updateLayerFrame = useEditorStore((s) => s.updateLayerFrame);
  const selectLayer = useEditorStore((s) => s.selectLayer);

  useEffect(() => {
    if (!frameLocked) registerNode(layer.id, rectRef.current ?? null);
    return () => registerNode(layer.id, null);
  }, [layer.id, registerNode, frameLocked]);

  const onSelect = () => selectLayer(layer.id);
  const hasImage = layer.imageW > 0 && !!img;

  // --- locked mode: pan the image within the frame (clamped to stay covering) ---
  const clampDrag = (node: Konva.Node) => {
    const drawW = layer.imageW * layer.placement.scale;
    const drawH = layer.imageH * layer.placement.scale;
    const cx = drawW >= layer.frame.w ? clamp(node.x(), layer.frame.w - drawW, 0) : node.x();
    const cy = drawH >= layer.frame.h ? clamp(node.y(), layer.frame.h - drawH, 0) : node.y();
    if (cx !== node.x()) node.x(cx);
    if (cy !== node.y()) node.y(cy);
  };

  // --- unlocked mode: commit frame move/resize ---
  const commitFrame = (node: Konva.Rect) => {
    const x = node.x();
    const y = node.y();
    const w = Math.max(1, node.width() * node.scaleX());
    const h = Math.max(1, node.height() * node.scaleY());
    node.scaleX(1);
    node.scaleY(1);
    node.width(w);
    node.height(h);
    updateLayerFrame(layer.id, { x, y, w, h });
  };

  return (
    <>
      <Group
        x={layer.frame.x}
        y={layer.frame.y}
        clipFunc={rectClipFunc(layer.frame) as never}
        listening={frameLocked}
      >
        {hasImage ? (
          <KonvaImage
            image={img}
            x={layer.placement.x}
            y={layer.placement.y}
            width={layer.imageW}
            height={layer.imageH}
            scaleX={layer.placement.scale}
            scaleY={layer.placement.scale}
            draggable={frameLocked}
            onMouseDown={onSelect}
            onTap={onSelect}
            onDragMove={(e) => clampDrag(e.target)}
            onDragEnd={(e) =>
              setLayerPlacement(layer.id, {
                x: e.target.x(),
                y: e.target.y(),
                scale: layer.placement.scale,
              })
            }
          />
        ) : (
          <Rect
            width={layer.frame.w}
            height={layer.frame.h}
            fill={frameLocked ? '#2a2a33' : '#d9d9d9'}
            onMouseDown={onSelect}
            onTap={onSelect}
          />
        )}
      </Group>

      {/* Frame handle / border */}
      <Rect
        ref={rectRef}
        x={layer.frame.x}
        y={layer.frame.y}
        width={layer.frame.w}
        height={layer.frame.h}
        fill="rgba(0,0,0,0)"
        stroke={selected ? '#2d7ff9' : 'rgba(255,255,255,0.45)'}
        strokeWidth={1 / zoom}
        dash={selected ? undefined : [6 / zoom, 4 / zoom]}
        listening={!frameLocked}
        draggable={!frameLocked}
        onMouseDown={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => commitFrame(e.target as Konva.Rect)}
        onTransformEnd={(e) => commitFrame(e.target as Konva.Rect)}
      />
    </>
  );
}
