import { useEffect, useState } from 'react';

/**
 * Subscribe to a CSS media query. State is initialized synchronously so there
 * is no flash of the wrong layout on first paint, and it updates on change.
 * Returns `false` when `matchMedia` is unavailable (SSR / very old webview).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/**
 * Whether the viewport should get the mobile layout. Driven by screen
 * proportion: portrait orientation (e.g. a phone, including on rotation) or a
 * very narrow width. Landscape phones and normal desktop windows stay desktop.
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(orientation: portrait), (max-width: 640px)');
}
