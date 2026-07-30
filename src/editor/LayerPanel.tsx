import { useEditorStore } from '@/state/editorStore';
import { useT } from '@/i18n';

export function LayerPanel() {
  const doc = useEditorStore((s) => s.document);
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId);
  const selectLayer = useEditorStore((s) => s.selectLayer);
  const removeLayer = useEditorStore((s) => s.removeLayer);
  const moveLayerZ = useEditorStore((s) => s.moveLayerZ);
  const setLayerOpacity = useEditorStore((s) => s.setLayerOpacity);
  const setLayerFit = useEditorStore((s) => s.setLayerFit);
  const setLayerRotation = useEditorStore((s) => s.setLayerRotation);
  const { t } = useT();

  const layersTopFirst = [...doc.layers].sort((a, b) => b.zIndex - a.zIndex);
  const selected = doc.layers.find((l) => l.id === selectedLayerId);

  return (
    <aside className="layers">
      <h2>{t('layers.title')}</h2>

      {layersTopFirst.length === 0 && <p className="muted">{t('layers.empty')}</p>}

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
                title={t('layers.bringForward')}
                onClick={(e) => {
                  e.stopPropagation();
                  moveLayerZ(layer.id, 'up');
                }}
              >
                ↑
              </button>
              <button
                title={t('layers.sendBackward')}
                onClick={(e) => {
                  e.stopPropagation();
                  moveLayerZ(layer.id, 'down');
                }}
              >
                ↓
              </button>
              <button
                title={t('common.delete')}
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
            {t('layers.opacity')}
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
            {t('layers.fit')}
            <select
              value={selected.fit}
              onChange={(e) => setLayerFit(selected.id, e.target.value as 'cover' | 'contain')}
            >
              <option value="cover">{t('layers.fitCover')}</option>
              <option value="contain">{t('layers.fitContain')}</option>
            </select>
          </label>
          <label>
            {t('layers.rotation')}
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={selected.rotation}
              onChange={(e) => setLayerRotation(selected.id, Number(e.target.value))}
            />
            <span>{Math.round(selected.rotation)}°</span>
          </label>
          <div className="rotate-buttons">
            <button title={t('layers.rotateLeft')} onClick={() => setLayerRotation(selected.id, selected.rotation - 90)}>
              ⟲ 90°
            </button>
            <button title={t('layers.resetRotation')} onClick={() => setLayerRotation(selected.id, 0)}>
              {t('layers.resetRotation')}
            </button>
            <button title={t('layers.rotateRight')} onClick={() => setLayerRotation(selected.id, selected.rotation + 90)}>
              ⟳ 90°
            </button>
          </div>
          {selected.imageSrc === '' && <p className="hint">{t('layers.emptySlotHint')}</p>}
        </div>
      )}
    </aside>
  );
}
