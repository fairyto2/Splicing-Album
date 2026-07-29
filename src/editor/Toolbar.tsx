import { useRef, useState } from 'react';
import { useEditorStore, undo, redo, useHistory } from '@/state/editorStore';
import { builtInTemplates, parseTemplate, serializeTemplate, templateFromDocument } from '@/data/template';
import { parseDocument, serializeDocument } from '@/data/document';
import { openJsonText, saveBytes } from '@/platform';
import { fileToImageInfo } from './imageUtils';
import { ExportDialog } from './ExportDialog';
import { SaveTemplateDialog } from './SaveTemplateDialog';

export function Toolbar() {
  const doc = useEditorStore((s) => s.document);
  const addPhoto = useEditorStore((s) => s.addPhoto);
  const setCanvas = useEditorStore((s) => s.setCanvas);
  const applyTemplate = useEditorStore((s) => s.applyTemplate);
  const loadDocument = useEditorStore((s) => s.loadDocument);
  const frameLocked = useEditorStore((s) => s.document.frameLocked);
  const setFrameLocked = useEditorStore((s) => s.setFrameLocked);
  const newTemplate = useEditorStore((s) => s.newTemplate);
  const addSlot = useEditorStore((s) => s.addSlot);
  const userTemplates = useEditorStore((s) => s.userTemplates);
  const { canUndo, canRedo } = useHistory();

  const [showExport, setShowExport] = useState(false);
  const [showSaveTpl, setShowSaveTpl] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);

  const onPickPhotos = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const { src, w, h } = await fileToImageInfo(file);
      addPhoto(src, w, h);
    }
  };

  const exportTemplate = async () => {
    const tpl = templateFromDocument(doc, 'My Template');
    await saveBytes(
      'template.json',
      new TextEncoder().encode(serializeTemplate(tpl)),
      'application/json',
    );
  };

  const importTemplate = async () => {
    const text = await openJsonText();
    if (!text) return;
    try {
      applyTemplate(parseTemplate(text));
    } catch (e) {
      alert(`Invalid template: ${(e as Error).message}`);
    }
  };

  const saveDoc = async () => {
    await saveBytes(
      'album.json',
      new TextEncoder().encode(serializeDocument(doc)),
      'application/json',
    );
  };

  const loadDoc = async () => {
    const text = await openJsonText();
    if (!text) return;
    try {
      loadDocument(parseDocument(text));
    } catch (e) {
      alert(`Invalid document: ${(e as Error).message}`);
    }
  };

  return (
    <header className="toolbar">
      <div className="brand">Splicing Album</div>

      <div className="group">
        <button className="primary" onClick={() => photoInput.current?.click()}>
          + Add Photo
        </button>
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            void onPickPhotos(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <div className="group">
        <span className="label">Template</span>
        <button onClick={newTemplate} title="Start a blank layout to design a new template">
          New
        </button>
        <button onClick={addSlot} title="Add an empty, resizable frame (slot)">
          + Slot
        </button>
        <select
          defaultValue=""
          onChange={(e) => {
            const tpl = [...builtInTemplates(), ...userTemplates].find(
              (t) => t.name === e.target.value,
            );
            if (tpl) applyTemplate(tpl);
            e.target.value = '';
          }}
        >
          <option value="" disabled>
            Apply…
          </option>
          <optgroup label="Built-in">
            {builtInTemplates().map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </optgroup>
          {userTemplates.length > 0 && (
            <optgroup label="My templates">
              {userTemplates.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <button onClick={() => setShowSaveTpl(true)} title="Save current layout as a template">
          Save
        </button>
        <button onClick={importTemplate} title="Import template JSON">
          Import
        </button>
        <button onClick={exportTemplate} title="Export current layout as template JSON">
          Export
        </button>
      </div>

      <div className="group">
        <span className="label">Canvas (mm / dpi)</span>
        <input
          className="num"
          type="number"
          value={doc.canvas.widthMM}
          onChange={(e) => setCanvas({ widthMM: Number(e.target.value) })}
        />
        <span>×</span>
        <input
          className="num"
          type="number"
          value={doc.canvas.heightMM}
          onChange={(e) => setCanvas({ heightMM: Number(e.target.value) })}
        />
        <input
          className="num"
          type="number"
          value={doc.canvas.dpi}
          onChange={(e) => setCanvas({ dpi: Number(e.target.value) })}
        />
        <input
          className="num"
          type="number"
          value={doc.canvas.bleedMM}
          title="Bleed (mm)"
          onChange={(e) => setCanvas({ bleedMM: Number(e.target.value) })}
        />
        <button
          className={frameLocked ? 'primary' : ''}
          title="Lock frame positions (template mode)"
          onClick={() => setFrameLocked(!frameLocked)}
        >
          {frameLocked ? '🔒 Frames locked' : '🔓 Lock frames'}
        </button>
      </div>

      <div className="group">
        <button onClick={undo} disabled={!canUndo} title="Undo">
          ↶
        </button>
        <button onClick={redo} disabled={!canRedo} title="Redo">
          ↷
        </button>
        <button onClick={saveDoc} title="Save document (album.json)">
          Save Doc
        </button>
        <button onClick={() => docInput.current?.click()} title="Open document">
          Open
        </button>
        <input
          ref={docInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) {
              try {
                loadDocument(parseDocument(await f.text()));
              } catch (err) {
                alert(`Invalid document: ${(err as Error).message}`);
              }
            }
            e.target.value = '';
          }}
        />
      </div>

      <div className="group right">
        <button className="primary" onClick={() => setShowExport(true)}>
          Export…
        </button>
      </div>

      <ExportDialog open={showExport} onClose={() => setShowExport(false)} />
      <SaveTemplateDialog open={showSaveTpl} onClose={() => setShowSaveTpl(false)} />
    </header>
  );
}
