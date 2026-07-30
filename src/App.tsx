import { useState } from 'react';
import { Toolbar } from './editor/Toolbar';
import { CanvasStage } from './editor/CanvasStage';
import { LayerPanel } from './editor/LayerPanel';
import { LibraryPanel } from './editor/LibraryPanel';
import { useIsMobile } from './lib/useMediaQuery';
import { useT } from './i18n';

type Drawer = 'library' | 'layers' | null;

export function App() {
  const isMobile = useIsMobile();

  if (!isMobile) {
  // Desktop: fixed 3-column layout.
  return (
    <div className="app">
      <Toolbar />
      <div className="workspace">
        <LibraryPanel />
        <CanvasStage />
        <LayerPanel />
      </div>
    </div>
  );
  }

  return <MobileApp />;
}

/** Mobile: canvas fills the screen; Library/Layers open as slide-in drawers. */
function MobileApp() {
  const { t } = useT();
  const [drawer, setDrawer] = useState<Drawer>(null);
  const toggle = (which: Exclude<Drawer, null>) => () =>
    setDrawer((d) => (d === which ? null : which));

  return (
    <div className="app mobile">
      <Toolbar />
      <div className="workspace mobile">
        <CanvasStage />
      </div>

      <nav className="mobile-tabs">
        <button
          className={drawer === 'library' ? 'active' : ''}
          onClick={toggle('library')}
        >
          {t('library.title')}
        </button>
        <button
          className={drawer === 'layers' ? 'active' : ''}
          onClick={toggle('layers')}
        >
          {t('layers.title')}
        </button>
      </nav>

      {drawer && (
        <>
          <div className="drawer-backdrop" onClick={() => setDrawer(null)} />
          <aside className={`drawer ${drawer === 'library' ? 'left' : 'right'}`}>
            {drawer === 'library' ? <LibraryPanel /> : <LayerPanel />}
          </aside>
        </>
      )}
    </div>
  );
}
