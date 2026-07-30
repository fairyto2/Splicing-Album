import { create, useStore } from 'zustand';
import { temporal } from 'zundo';
import { v4 as uuid } from 'uuid';
import type { CanvasSpec, Document, Fit, ImagePlacement, Layer, LibraryImage, Rect, Template } from '@/data/types';
import { DOCUMENT_VERSION } from '@/data/types';
import { createDocument, maxZIndex } from '@/data/document';
import { canvasDesignSize, clampFrameToCanvas, clampPlacement, defaultFrameForAspect, fitPlacement, normalizeAngle } from '@/data/geometry';

export interface EditorState {
  /** The document under edit. This is the only slice tracked by undo/redo. */
  document: Document;
  selectedLayerId: string | null;
  zoom: number;
  /** Working image library (待选图库) — a palette, not persisted in the document. */
  library: LibraryImage[];

  // --- document mutators (each creates one undo entry) ---
  addPhoto(src: string, naturalW: number, naturalH: number): void;
  /** Fill an empty template-slot layer with an image, cover-fit. */
  fillSlot(id: string, src: string, naturalW: number, naturalH: number): void;
  updateLayer(id: string, patch: Partial<Layer>): void;
  updateLayerFrame(id: string, frame: Rect): void;
  setLayerPlacement(id: string, placement: ImagePlacement): void;
  removeLayer(id: string): void;
  moveLayerZ(id: string, dir: 'up' | 'down'): void;
  setLayerOpacity(id: string, opacity: number): void;
  setLayerFit(id: string, fit: Fit): void;
  /** Rotate a layer around its frame centre. Degrees, normalized to (-180, 180]. */
  setLayerRotation(id: string, degrees: number): void;
  setCanvas(patch: Partial<CanvasSpec>): void;
  setFrameLocked(locked: boolean): void;
  applyTemplate(template: Template): void;
  loadDocument(doc: Document): void;

  // --- template authoring ---
  /** Start a blank, unlocked layout for designing a new template. */
  newTemplate(): void;
  /** Add an empty, resizable frame (a slot) in the centre of the canvas. */
  addSlot(): void;

  // --- library (non-history) ---
  addToLibrary(items: LibraryImage[]): void;
  removeFromLibrary(id: string): void;
  clearLibrary(): void;

  // --- user templates (persisted to localStorage, non-history) ---
  userTemplates: Template[];
  addUserTemplate(template: Template): void;
  deleteUserTemplate(name: string): void;

  // --- non-history UI state ---
  selectLayer(id: string | null): void;
  setZoom(zoom: number): void;
}

const mutateLayer = (layers: Layer[], id: string, fn: (layer: Layer) => Layer): Layer[] =>
  layers.map((layer) => (layer.id === id ? fn(layer) : layer));

// --- user-template persistence (localStorage) ---
const USER_TEMPLATES_KEY = 'splicing-album:user-templates';

function readUserTemplates(): Template[] {
  try {
    const raw = localStorage.getItem(USER_TEMPLATES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as Template[]) : [];
  } catch {
    return [];
  }
}

function writeUserTemplates(list: Template[]): void {
  try {
    localStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export const useEditorStore = create<EditorState>()(
  temporal(
    (set, get) => ({
      document: createDocument(),
      selectedLayerId: null,
      zoom: 1,
      library: [],
      userTemplates: readUserTemplates(),

      addPhoto: (src, naturalW, naturalH) => {
        const { document, selectedLayerId } = get();

        // Template mode: only fill existing empty slots.
        if (document.frameLocked) {
          const layers = document.layers;
          const selectedEmpty = selectedLayerId
            ? layers.find((l) => l.id === selectedLayerId && l.imageSrc === '')
            : undefined;
          const target = selectedEmpty ?? layers.find((l) => l.imageSrc === '');
          if (target) {
            get().fillSlot(target.id, src, naturalW, naturalH);
            get().selectLayer(target.id);
          }
          return;
        }

        // Free mode: add a new movable, resizable layer.
        const selected = selectedLayerId
          ? document.layers.find((l) => l.id === selectedLayerId)
          : undefined;
        if (selected && selected.imageSrc === '') {
          get().fillSlot(selected.id, src, naturalW, naturalH);
          return;
        }
        const frame = clampFrameToCanvas(
          defaultFrameForAspect(document.canvas, naturalW / naturalH),
          document.canvas,
        );
        const layer: Layer = {
          id: uuid(),
          name: `Photo ${document.layers.length + 1}`,
          imageSrc: src,
          imageW: naturalW,
          imageH: naturalH,
          frame,
          rotation: 0,
          placement: fitPlacement(naturalW, naturalH, frame.w, frame.h, 'cover'),
          opacity: 1,
          zIndex: maxZIndex(document.layers) + 1,
          fit: 'cover',
        };
        set((s) => ({
          document: { ...s.document, layers: [...s.document.layers, layer] },
          selectedLayerId: layer.id,
        }));
      },

      fillSlot: (id, src, naturalW, naturalH) =>
        set((s) => ({
          document: {
            ...s.document,
            layers: mutateLayer(s.document.layers, id, (l) => ({
              ...l,
              imageSrc: src,
              imageW: naturalW,
              imageH: naturalH,
              placement: clampPlacement(
                fitPlacement(naturalW, naturalH, l.frame.w, l.frame.h, 'cover'),
                naturalW,
                naturalH,
                l.frame.w,
                l.frame.h,
              ),
            })),
          },
        })),

      updateLayer: (id, patch) =>
        set((s) => ({
          document: { ...s.document, layers: mutateLayer(s.document.layers, id, (l) => ({ ...l, ...patch })) },
        })),

      updateLayerFrame: (id, frame) => get().updateLayer(id, { frame }),

      setLayerPlacement: (id, placement) =>
        set((s) => ({
          document: {
            ...s.document,
            layers: mutateLayer(s.document.layers, id, (l) => ({
              ...l,
              placement: clampPlacement(placement, l.imageW, l.imageH, l.frame.w, l.frame.h),
            })),
          },
        })),

      removeLayer: (id) =>
        set((s) => ({
          document: { ...s.document, layers: s.document.layers.filter((l) => l.id !== id) },
          selectedLayerId: s.selectedLayerId === id ? null : s.selectedLayerId,
        })),

      moveLayerZ: (id, dir) =>
        set((s) => {
          const byZ = [...s.document.layers].sort((a, b) => a.zIndex - b.zIndex);
          const i = byZ.findIndex((l) => l.id === id);
          const j = dir === 'up' ? i + 1 : i - 1;
          if (i < 0 || j < 0 || j >= byZ.length) return {};
          const idA = byZ[i].id;
          const idB = byZ[j].id;
          const zA = byZ[i].zIndex;
          const zB = byZ[j].zIndex;
          return {
            document: {
              ...s.document,
              layers: s.document.layers.map((l) => {
                if (l.id === idA) return { ...l, zIndex: zB };
                if (l.id === idB) return { ...l, zIndex: zA };
                return l;
              }),
            },
          };
        }),

      setLayerOpacity: (id, opacity) =>
        set((s) => ({ document: { ...s.document, layers: mutateLayer(s.document.layers, id, (l) => ({ ...l, opacity })) } })),

      setLayerRotation: (id, degrees) =>
        set((s) => ({
          document: {
            ...s.document,
            layers: mutateLayer(s.document.layers, id, (l) => ({ ...l, rotation: normalizeAngle(degrees) })),
          },
        })),

      setLayerFit: (id, fit) =>
        set((s) => ({
          document: {
            ...s.document,
            layers: mutateLayer(s.document.layers, id, (l) => ({
              ...l,
              fit,
              placement: clampPlacement(
                fitPlacement(l.imageW, l.imageH, l.frame.w, l.frame.h, fit),
                l.imageW,
                l.imageH,
                l.frame.w,
                l.frame.h,
              ),
            })),
          },
        })),

      setCanvas: (patch) =>
        set((s) => ({ document: { ...s.document, canvas: { ...s.document.canvas, ...patch } } })),

      setFrameLocked: (locked) => set((s) => ({ document: { ...s.document, frameLocked: locked } })),

      applyTemplate: (template) =>
        set(() => ({
          document: {
            version: DOCUMENT_VERSION,
            canvas: { ...template.canvas },
            frameLocked: true,
            layers: template.slots.map((frame, i) => ({
              id: uuid(),
              name: `Slot ${i + 1}`,
              imageSrc: '',
              imageW: 0,
              imageH: 0,
              frame: { ...frame },
              rotation: 0,
              placement: { x: 0, y: 0, scale: 1 },
              opacity: 1,
              zIndex: i + 1,
              fit: 'cover',
            })),
          },
          selectedLayerId: null,
        })),

      loadDocument: (doc) => set(() => ({ document: doc, selectedLayerId: null })),

      newTemplate: () =>
        set((s) => ({
          document: {
            version: DOCUMENT_VERSION,
            canvas: { ...s.document.canvas },
            layers: [],
            frameLocked: false,
          },
          selectedLayerId: null,
        })),

      addSlot: () =>
        set((s) => {
          const { w, h } = canvasDesignSize(s.document.canvas);
          const sw = Math.round(w * 0.4);
          const sh = Math.round(h * 0.4);
          const layer: Layer = {
            id: uuid(),
            name: `Slot ${s.document.layers.length + 1}`,
            imageSrc: '',
            imageW: 0,
            imageH: 0,
            frame: { x: Math.round((w - sw) / 2), y: Math.round((h - sh) / 2), w: sw, h: sh },
            rotation: 0,
            placement: { x: 0, y: 0, scale: 1 },
            opacity: 1,
            zIndex: maxZIndex(s.document.layers) + 1,
            fit: 'cover',
          };
          return {
            document: { ...s.document, frameLocked: false, layers: [...s.document.layers, layer] },
            selectedLayerId: layer.id,
          };
        }),

      addToLibrary: (items) => set((s) => ({ library: [...s.library, ...items] })),
      removeFromLibrary: (id) => set((s) => ({ library: s.library.filter((i) => i.id !== id) })),
      clearLibrary: () => set(() => ({ library: [] })),

      addUserTemplate: (template) =>
        set((s) => {
          const list = [...s.userTemplates.filter((t) => t.name !== template.name), template];
          writeUserTemplates(list);
          return { userTemplates: list };
        }),
      deleteUserTemplate: (name) =>
        set((s) => {
          const list = s.userTemplates.filter((t) => t.name !== name);
          writeUserTemplates(list);
          return { userTemplates: list };
        }),

      selectLayer: (id) => set(() => ({ selectedLayerId: id })),
      setZoom: (zoom) => set(() => ({ zoom })),
    }),
    {
      // Only the document is undoable; selection/zoom/library are transient.
      partialize: (state) => ({ document: state.document }),
      limit: 100,
    },
  ),
);

// --- history helpers (zundo temporal store) ---
const temporalStore = useEditorStore.temporal;

export const undo = (): void => void temporalStore.getState().undo();
export const redo = (): void => void temporalStore.getState().redo();

/** React hook for reactive undo/redo availability. */
export function useHistory() {
  const past = useStore(temporalStore, (s) => s.pastStates.length);
  const future = useStore(temporalStore, (s) => s.futureStates.length);
  return { canUndo: past > 0, canRedo: future > 0 };
}
