import { Toolbar } from './editor/Toolbar';
import { CanvasStage } from './editor/CanvasStage';
import { LayerPanel } from './editor/LayerPanel';
import { LibraryPanel } from './editor/LibraryPanel';

export function App() {
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
