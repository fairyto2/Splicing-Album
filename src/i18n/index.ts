import { create } from 'zustand';

export type Lang = 'en' | 'zh';

const LANG_KEY = 'splicing-album:lang';

function defaultLang(): Lang {
  try {
    return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  } catch {
    return 'en';
  }
}

function readLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return v === 'zh' || v === 'en' ? v : defaultLang();
  } catch {
    return 'en';
  }
}

type Dict = Record<string, string>;

const en: Dict = {
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.delete': 'Delete',
  'common.clear': 'Clear',

  'brand': 'Splicing Album',

  'toolbar.addPhoto': '+ Add Photo',
  'toolbar.template': 'Template',
  'toolbar.new': 'New',
  'toolbar.addSlot': '+ Slot',
  'toolbar.apply': 'Apply…',
  'toolbar.optBuiltIn': 'Built-in',
  'toolbar.optMine': 'My templates',
  'toolbar.save': 'Save',
  'toolbar.saveTitle': 'Save current layout as a template',
  'toolbar.import': 'Import',
  'toolbar.exportTpl': 'Export',
  'toolbar.canvas': 'Canvas (mm / dpi)',
  'toolbar.bleed': 'Bleed (mm)',
  'toolbar.lockFrames': '🔓 Lock frames',
  'toolbar.framesLocked': '🔒 Frames locked',
  'toolbar.undo': 'Undo',
  'toolbar.redo': 'Redo',
  'toolbar.saveDoc': 'Save Doc',
  'toolbar.open': 'Open',
  'toolbar.export': 'Export…',
  'toolbar.language': 'Language',

  'layers.title': 'Layers',
  'layers.empty': 'No layers yet. Add a photo.',
  'layers.bringForward': 'Bring forward',
  'layers.sendBackward': 'Send backward',
  'layers.opacity': 'Opacity',
  'layers.fit': 'Fit',
  'layers.fitCover': 'Cover',
  'layers.fitContain': 'Contain',
  'layers.emptySlotHint': 'Empty slot — select it, then “Add Photo” to fill.',

  'library.title': 'Library',
  'library.clearTitle': 'Clear library',
  'library.import': '+ Import images',
  'library.empty': 'Import images here, then drag a thumbnail onto a template slot.',
  'library.remove': 'Remove from library',
  'library.dragHint': '{w}×{h} — drag to a slot',

  'canvas.zoomOut': 'Zoom out',
  'canvas.zoomIn': 'Zoom in',
  'canvas.framesLocked': 'Frames locked',

  'export.title': 'Export',
  'export.colorMode': 'Color mode',
  'export.cmyk': 'CMYK (print, TIFF)',
  'export.rgb': 'RGB (PNG)',
  'export.resolution': 'Resolution (DPI)',
  'export.output': 'Output:',
  'export.inclBleed': 'incl. {bleed} mm bleed',
  'export.cmykNote':
    'CMYK separation via matrix/UCR (offline). ICC-managed lcms-wasm is the documented upgrade path.',
  'export.exporting': 'Exporting…',
  'export.failed': 'Export failed: {msg}',

  'saveTpl.title': 'Save Template',
  'saveTpl.name': 'Name',
  'saveTpl.placeholder': 'My Template',
  'saveTpl.summary': '{count} slot(s) · {wmm}×{hmm}mm @ {dpi} DPI ({wpx}×{hpx}px)',
  'saveTpl.note': 'Saved to this app and added to the Template list (persists across restarts).',
  'saveTpl.addSlotFirst': 'Add at least one slot first.',

  'alert.invalidTemplate': 'Invalid template: {msg}',
  'alert.invalidDocument': 'Invalid document: {msg}',
};

const zh: Dict = {
  'common.cancel': '取消',
  'common.save': '保存',
  'common.delete': '删除',
  'common.clear': '清空',

  'brand': '拼图相册',

  'toolbar.addPhoto': '+ 添加图片',
  'toolbar.template': '模板',
  'toolbar.new': '新建',
  'toolbar.addSlot': '+ 框位',
  'toolbar.apply': '应用…',
  'toolbar.optBuiltIn': '内置',
  'toolbar.optMine': '我的模板',
  'toolbar.save': '保存模板',
  'toolbar.saveTitle': '将当前排版保存为模板',
  'toolbar.import': '导入',
  'toolbar.exportTpl': '导出',
  'toolbar.canvas': '画布 (毫米 / DPI)',
  'toolbar.bleed': '出血 (毫米)',
  'toolbar.lockFrames': '🔓 锁定框位',
  'toolbar.framesLocked': '🔒 框位已锁定',
  'toolbar.undo': '撤销',
  'toolbar.redo': '重做',
  'toolbar.saveDoc': '保存文档',
  'toolbar.open': '打开',
  'toolbar.export': '导出…',
  'toolbar.language': '语言',

  'layers.title': '图层',
  'layers.empty': '暂无图层，请添加图片。',
  'layers.bringForward': '上移一层',
  'layers.sendBackward': '下移一层',
  'layers.opacity': '不透明度',
  'layers.fit': '适配',
  'layers.fitCover': '填充',
  'layers.fitContain': '适应',
  'layers.emptySlotHint': '空框位——选中后点“添加图片”填充。',

  'library.title': '图库',
  'library.clearTitle': '清空图库',
  'library.import': '+ 导入图片',
  'library.empty': '在此导入图片，再将缩略图拖到模板框位中。',
  'library.remove': '从图库移除',
  'library.dragHint': '{w}×{h} — 拖到框位',

  'canvas.zoomOut': '缩小',
  'canvas.zoomIn': '放大',
  'canvas.framesLocked': '框位已锁定',

  'export.title': '导出',
  'export.colorMode': '颜色模式',
  'export.cmyk': 'CMYK（打印，TIFF）',
  'export.rgb': 'RGB（PNG）',
  'export.resolution': '分辨率 (DPI)',
  'export.output': '输出：',
  'export.inclBleed': '含 {bleed} 毫米出血',
  'export.cmykNote': 'CMYK 分色采用矩阵/UCR（离线）。基于 ICC 的 lcms-wasm 为后续升级方案。',
  'export.exporting': '导出中…',
  'export.failed': '导出失败：{msg}',

  'saveTpl.title': '保存模板',
  'saveTpl.name': '名称',
  'saveTpl.placeholder': '我的模板',
  'saveTpl.summary': '{count} 个框位 · {wmm}×{hmm} 毫米 @ {dpi} DPI（{wpx}×{hpx} 像素）',
  'saveTpl.note': '将保存到本应用并加入模板列表（重启后保留）。',
  'saveTpl.addSlotFirst': '请先添加至少一个框位。',

  'alert.invalidTemplate': '模板无效：{msg}',
  'alert.invalidDocument': '文档无效：{msg}',
};

const dicts: Record<Lang, Dict> = { en, zh };

function format(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  let out = s;
  for (const k of Object.keys(vars)) {
    out = out.split(`{${k}}`).join(String(vars[k]));
  }
  return out;
}

interface I18nState {
  lang: Lang;
  setLang(lang: Lang): void;
}

export const useI18n = create<I18nState>((set) => ({
  lang: readLang(),
  setLang: (lang) => {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }
    set({ lang });
  },
}));

/** Non-reactive translator for use in event handlers / alerts. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const lang = useI18n.getState().lang;
  return format(dicts[lang][key] ?? en[key] ?? key, vars);
}

/** Reactive translator hook — components re-render when the language changes. */
export function useT() {
  const lang = useI18n((s) => s.lang);
  const setLang = useI18n((s) => s.setLang);
  const tt = (key: string, vars?: Record<string, string | number>) =>
    format(dicts[lang][key] ?? en[key] ?? key, vars);
  return { t: tt, lang, setLang };
}
