import { useEffect, useState } from 'react';
import { useEditorStore } from '@/state/editorStore';
import { useT } from '@/i18n';
import { templateFromDocument } from '@/data/template';
import { canvasDesignSize } from '@/data/geometry';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Save the current layout (its frames) as a reusable, persisted template. */
export function SaveTemplateDialog({ open, onClose }: Props) {
  const doc = useEditorStore((s) => s.document);
  const addUserTemplate = useEditorStore((s) => s.addUserTemplate);
  const [name, setName] = useState('');
  const { t } = useT();

  useEffect(() => {
    if (open) setName('');
  }, [open]);

  if (!open) return null;

  const save = () => {
    addUserTemplate(templateFromDocument(doc, name.trim() || t('saveTpl.placeholder')));
    onClose();
  };

  const { w, h } = canvasDesignSize(doc.canvas);
  const slotCount = doc.layers.length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('saveTpl.title')}</h2>
        <label>
          {t('saveTpl.name')}
          <input
            autoFocus
            value={name}
            placeholder={t('saveTpl.placeholder')}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
            }}
          />
        </label>
        <p className="muted">
          {t('saveTpl.summary', {
            count: slotCount,
            wmm: doc.canvas.widthMM,
            hmm: doc.canvas.heightMM,
            dpi: doc.canvas.dpi,
            wpx: w,
            hpx: h,
          })}
          <br />
          <small>{t('saveTpl.note')}</small>
        </p>
        <div className="modal-actions">
          <button onClick={onClose}>{t('common.cancel')}</button>
          <button className="primary" onClick={save} disabled={slotCount === 0}>
            {t('common.save')}
          </button>
        </div>
        {slotCount === 0 && <p className="muted">{t('saveTpl.addSlotFirst')}</p>}
      </div>
    </div>
  );
}
