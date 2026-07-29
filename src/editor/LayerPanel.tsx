import { useEditorStore } from '@/state/editorStore';

export function LayerPanel() {
  const doc = useEditorStore((s) => s.document);
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId);
  const selectLayer = useEditorStore((s) => s.selectLayer);
  const removeLayer = useEditorStore((s) => s.removeLayer);
  const moveLayerZ = useEditorStore((s) => s.moveLayerZ);
  const setLayerOpacity = useEditorStore((s) => s.setLayerOpacity);
  const setLayerFit = useEditorStore((s) => s.setLayerFit);

  const layersTopFirst = [...doc.layers].sort((a, b) => b.zIndex - a.zIndex);
  const selected = doc.layers.find((l) => l.id === selectedLayerId);

  return (
    <aside className="layers">
      <h2>Layers</h2>

      {layersTopFirst.length === 0 && <p className="muted">No layers yet. Add a photo.</p>}

      <ul className="layer-list">
        {layersTopFirst.map((layer) => (
          <li
            key={layer.id}
            className={layer.id === selectedLayerId ? 'layer-item selected' : 'layer-item'}
            onClick={() => selectLayer(layer.id)}
          >
            <span className="layer-name">{layer.name || 'Untitled'}</span>
            <span className="layer-actions">
              <button
                title="Bring forward"
                onClick={(e) => {
                  e.stopPropagation();
                  moveLayerZ(layer.id, 'up');
                }}
              >
                ↑
              </button>
              <button
                title="Send backward"
                onClick={(e) => {
                  e.stopPropagation();
                  moveLayerZ(layer.id, 'down');
                }}
              >
                ↓
              </button>
              <button
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  removeLayer(layer.id);
                }}
              >
                ✕
              </button>
            </span>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="layer-props">
          <h3>{selected.name}</h3>
          <label>
            Opacity
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={selected.opacity}
              onChange={(e) => setLayerOpacity(selected.id, Number(e.target.value))}
            />
            <span>{Math.round(selected.opacity * 100)}%</span>
          </label>
          <label>
            Fit
            <select
              value={selected.fit}
              onChange={(e) => setLayerFit(selected.id, e.target.value as 'cover' | 'contain')}
            >
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
            </select>
          </label>
          {selected.imageSrc === '' && (
            <p className="hint">Empty slot — select it, then “Add Photo” to fill.</p>
          )}
        </div>
      )}
    </aside>
  );
}
