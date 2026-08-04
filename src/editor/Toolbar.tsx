import { useRef, useState } from 'react';
import { useEditorStore, undo, redo, useHistory } from '@/state/editorStore';
import { useT } from '@/i18n';
import type { Lang } from '@/i18n';
import { builtInTemplates, parseTemplate, serializeTemplate, templateFromDocument } from '@/data/template';
import { parseDocument, serializeDocument } from '@/data/document';
import { openJsonText, saveBytes } from '@/platform';
import { fileToImageInfo } from './imageUtils';
import { ExportDialog } from './ExportDialog';
import { SaveTemplateDialog } from './SaveTemplateDialog';
import { useIsMobile } from '@/lib/useMediaQuery';

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
  const { t, lang, setLang } = useT();

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
    const tpl = templateFromDocument(doc, t('saveTpl.placeholder'));
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
      alert(t('alert.invalidTemplate', { msg: (e as Error).message }));
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
      alert(t('alert.invalidDocument', { msg: (e as Error).message }));
    }
  };

  const isMobile = useIsMobile();
  const [more, setMore] = useState(false);

  const photoInputEl = (
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
  );

  // Secondary control groups, reused by both layouts (desktop inline, mobile sheet).
  const templateGroup = (
    <div className="group">
      <span className="label">{t('toolbar.template')}</span>
      <button onClick={newTemplate} title={t('toolbar.new')}>
        {t('toolbar.new')}
      </button>
      <button onClick={addSlot} title={t('toolbar.addSlot')}>
        {t('toolbar.addSlot')}
      </button>
      <select
        defaultValue=""
        onChange={(e) => {
          const tpl = [...builtInTemplates(), ...userTemplates].find(
            (tm) => tm.name === e.target.value,
          );
          if (tpl) applyTemplate(tpl);
          e.target.value = '';
        }}
      >
        <option value="" disabled>
          {t('toolbar.apply')}
        </option>
        <optgroup label={t('toolbar.optBuiltIn')}>
          {builtInTemplates().map((tm) => (
            <option key={tm.name} value={tm.name}>
              {tm.name}
            </option>
          ))}
        </optgroup>
        {userTemplates.length > 0 && (
          <optgroup label={t('toolbar.optMine')}>
            {userTemplates.map((tm) => (
              <option key={tm.name} value={tm.name}>
                {tm.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <button onClick={() => setShowSaveTpl(true)} title={t('toolbar.saveTitle')}>
        {t('toolbar.save')}
      </button>
      <button onClick={importTemplate} title={t('toolbar.import')}>
        {t('toolbar.import')}
      </button>
      <button onClick={exportTemplate} title={t('toolbar.exportTpl')}>
        {t('toolbar.exportTpl')}
      </button>
    </div>
  );

  const canvasGroup = (
    <div className="group">
      <span className="label">{t('toolbar.canvas')}</span>
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
        title={t('toolbar.bleed')}
        onChange={(e) => setCanvas({ bleedMM: Number(e.target.value) })}
      />
      <button
        className={frameLocked ? 'primary' : ''}
        title={frameLocked ? t('toolbar.framesLocked') : t('toolbar.lockFrames')}
        onClick={() => setFrameLocked(!frameLocked)}
      >
        {frameLocked ? t('toolbar.framesLocked') : t('toolbar.lockFrames')}
      </button>
    </div>
  );

  const historyGroup = (
    <div className="group">
      <button onClick={undo} disabled={!canUndo} title={t('toolbar.undo')}>
        ↶
      </button>
      <button onClick={redo} disabled={!canRedo} title={t('toolbar.redo')}>
        ↷
      </button>
      <button onClick={saveDoc} title={t('toolbar.saveDoc')}>
        {t('toolbar.saveDoc')}
      </button>
      <button onClick={() => docInput.current?.click()} title={t('toolbar.open')}>
        {t('toolbar.open')}
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
              alert(t('alert.invalidDocument', { msg: (err as Error).message }));
            }
          }
          e.target.value = '';
        }}
      />
    </div>
  );

  const langSelect = (
    <select
      value={lang}
      title={t('toolbar.language')}
      onChange={(e) => setLang(e.target.value as Lang)}
    >
      <option value="en">EN</option>
      <option value="zh">中文</option>
    </select>
  );

  const dialogs = (
    <>
      <ExportDialog open={showExport} onClose={() => setShowExport(false)} />
      <SaveTemplateDialog open={showSaveTpl} onClose={() => setShowSaveTpl(false)} />
    </>
  );

  if (isMobile) {
    return (
      <header className="toolbar mobile-toolbar">
        <div className="mobile-bar">
          <span className="brand">{t('brand')}</span>
          <button className="primary" onClick={() => photoInput.current?.click()}>
            {t('toolbar.addPhoto')}
          </button>
          {photoInputEl}
          <div className="group right">
            <button className="primary" onClick={() => setShowExport(true)}>
              {t('toolbar.export')}
            </button>
            <button
              className={more ? 'primary' : ''}
              aria-label="More"
              onClick={() => setMore((v) => !v)}
            >
              ⋯
            </button>
          </div>
        </div>

        {more && (
          <>
            <div className="more-backdrop" onClick={() => setMore(false)} />
            <div className="more-sheet">
              {templateGroup}
              {canvasGroup}
              {historyGroup}
              {langSelect}
            </div>
          </>
        )}

        {dialogs}
      </header>
    );
  }

  return (
    <header className="toolbar">
      <div className="brand">{t('brand')}</div>

      <div className="group">
        <button className="primary" onClick={() => photoInput.current?.click()}>
          {t('toolbar.addPhoto')}
        </button>
        {photoInputEl}
      </div>

      {templateGroup}
      {canvasGroup}
      {historyGroup}

      <div className="group right">
        {langSelect}
        <button className="primary" onClick={() => setShowExport(true)}>
          {t('toolbar.export')}
        </button>
      </div>

      {dialogs}
    </header>
  );
}
