import { useEffect, useState } from 'react';
import { useEditorStore } from '@/state/editorStore';
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

  useEffect(() => {
    if (open) setName('');
  }, [open]);

  if (!open) return null;

  const save = () => {
    addUserTemplate(templateFromDocument(doc, name.trim() || 'My Template'));
    onClose();
  };

  const { w, h } = canvasDesignSize(doc.canvas);
  const slotCount = doc.layers.length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Save Template</h2>
        <label>
          Name
          <input
            autoFocus
            value={name}
            placeholder="My Template"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
            }}
          />
        </label>
        <p className="muted">
          {slotCount} slot(s) · {doc.canvas.widthMM}×{doc.canvas.heightMM}mm @ {doc.canvas.dpi} DPI ({w}×{h}px)
          <br />
          <small>Saved to this app and added to the Template list (persists across restarts).</small>
        </p>
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={save} disabled={slotCount === 0}>
            Save
          </button>
        </div>
        {slotCount === 0 && <p className="muted">Add at least one slot first.</p>}
      </div>
    </div>
  );
}
