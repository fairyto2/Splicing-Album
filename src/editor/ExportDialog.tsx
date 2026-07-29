import { useState } from 'react';
import { useEditorStore } from '@/state/editorStore';
import { useT } from '@/i18n';
import { exportDocument } from '@/export/ExportService';
import type { LoadedImages } from '@/export/render';
import { getLoadedImagesBySrc } from '@/lib/imageCache';
import { saveBytes } from '@/platform';
import { canvasExportSize } from '@/data/geometry';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ExportDialog({ open, onClose }: Props) {
  const doc = useEditorStore((s) => s.document);
  const [dpi, setDpi] = useState(doc.canvas.dpi);
  const [colorMode, setColorMode] = useState<'cmyk' | 'rgb'>('cmyk');
  const [busy, setBusy] = useState(false);
  const { t } = useT();

  if (!open) return null;

  const size = canvasExportSize(doc.canvas, dpi);

  const run = async () => {
    setBusy(true);
    try {
      const bySrc = getLoadedImagesBySrc();
      const images: LoadedImages = {};
      for (const layer of doc.layers) {
        if (layer.imageSrc) {
          const el = bySrc.get(layer.imageSrc);
          if (el) images[layer.id] = el;
        }
      }
      const result = await exportDocument(doc, images, { dpi, colorMode });
      const name = `splicing-album-${doc.canvas.widthMM}x${doc.canvas.heightMM}.${result.ext}`;
      await saveBytes(name, result.bytes, result.mime);
      onClose();
    } catch (e) {
      alert(t('export.failed', { msg: (e as Error).message }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('export.title')}</h2>

        <label>
          {t('export.colorMode')}
          <select value={colorMode} onChange={(e) => setColorMode(e.target.value as 'cmyk' | 'rgb')}>
            <option value="cmyk">{t('export.cmyk')}</option>
            <option value="rgb">{t('export.rgb')}</option>
          </select>
        </label>

        <label>
          {t('export.resolution')}
          <input
            type="number"
            min={72}
            max={600}
            value={dpi}
            onChange={(e) => setDpi(Number(e.target.value))}
          />
        </label>

        <p className="muted">
          {t('export.output')} <strong>{size.w} × {size.h}px</strong> ({t('export.inclBleed', { bleed: doc.canvas.bleedMM })})
          {colorMode === 'cmyk' && (
            <>
              <br />
              <small>{t('export.cmykNote')}</small>
            </>
          )}
        </p>

        <div className="modal-actions">
          <button onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button className="primary" onClick={run} disabled={busy}>
            {busy ? t('export.exporting') : t('export.title')}
          </button>
        </div>
      </div>
    </div>
  );
}
