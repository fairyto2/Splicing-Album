import { useEffect, useReducer } from 'react';

/**
 * Global cache of decoded HTMLImageElements keyed by source (object URL / data
 * URL). Shared by the editor (for display) and the export pipeline (which needs
 * real image elements to composite). Keeping it outside React state avoids
 * re-decoding and keeps photo identity stable across renders.
 */

const cache = new Map<string, HTMLImageElement>();
const listeners = new Map<string, Set<() => void>>();

function load(src: string): void {
  if (!src || cache.has(src)) return;
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    listeners.get(src)?.forEach((fn) => fn());
  };
  img.src = src;
  cache.set(src, img);
}

export function getCachedImage(src: string): HTMLImageElement | undefined {
  const img = cache.get(src);
  if (img && img.complete && img.naturalWidth > 0) return img;
  return undefined;
}

/** React hook: returns the decoded image for `src`, or undefined until loaded. */
export function useImage(src: string): HTMLImageElement | undefined {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (!src) return;
    load(src);
    const set = listeners.get(src) ?? new Set();
    set.add(force);
    listeners.set(src, set);
    return () => {
      set.delete(force);
    };
  }, [src, force]);
  return getCachedImage(src);
}

/** Snapshot of all currently-decoded images, keyed by source. */
export function getLoadedImagesBySrc(): Map<string, HTMLImageElement> {
  const out = new Map<string, HTMLImageElement>();
  for (const [src, img] of cache) {
    if (img.complete && img.naturalWidth > 0) out.set(src, img);
  }
  return out;
}
