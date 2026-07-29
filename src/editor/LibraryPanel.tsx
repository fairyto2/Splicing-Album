import { useRef } from 'react';
import { v4 as uuid } from 'uuid';
import { useEditorStore } from '@/state/editorStore';
import { useT } from '@/i18n';
import { fileToImageInfo } from './imageUtils';

/**
 * 待选图库 — a working palette of images. Import images here first, then drag
 * any thumbnail onto a canvas frame (template slot) to fill it. The library is
 * session-local and lives outside the document.
 */
export function LibraryPanel() {
  const library = useEditorStore((s) => s.library);
  const addToLibrary = useEditorStore((s) => s.addToLibrary);
  const removeFromLibrary = useEditorStore((s) => s.removeFromLibrary);
  const clearLibrary = useEditorStore((s) => s.clearLibrary);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useT();

  const importFiles = async (files: FileList | null) => {
    if (!files) return;
    const items = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const { src, w, h } = await fileToImageInfo(file);
      items.push({ id: uuid(), src, w, h });
    }
    if (items.length) addToLibrary(items);
  };

  return (
    <aside className="library">
      <div className="library-head">
        <h2>{t('library.title')}</h2>
        <button onClick={() => clearLibrary()} disabled={!library.length} title={t('library.clearTitle')}>
          {t('common.clear')}
        </button>
      </div>

      <button className="primary block" onClick={() => inputRef.current?.click()}>
        {t('library.import')}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          void importFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {library.length === 0 ? (
        <p className="muted">{t('library.empty')}</p>
      ) : (
        <div className="library-grid">
          {library.map((item) => (
            <div
              key={item.id}
              className="library-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/x-library-id', item.id);
                e.dataTransfer.setData('text/plain', item.id);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              title={t('library.dragHint', { w: item.w, h: item.h })}
            >
              <img src={item.src} alt="" draggable={false} />
              <button
                className="remove"
                title={t('library.remove')}
                onClick={() => removeFromLibrary(item.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
