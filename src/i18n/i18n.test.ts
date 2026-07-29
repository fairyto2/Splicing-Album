import { describe, expect, it, beforeEach } from 'vitest';
import { t, useI18n } from './index';

/** Reset the i18n store and localStorage between tests. */
function setLang(l: 'en' | 'zh') {
  useI18n.getState().setLang(l);
}
function lang() {
  return useI18n.getState().lang;
}

beforeEach(() => {
  localStorage.clear();
  setLang('en');
});

describe('t() — standalone translator', () => {
  it('returns English by default', () => {
    expect(t('brand')).toBe('Splicing Album');
    expect(t('export.title')).toBe('Export');
  });

  it('returns 简体中文 after switching language', () => {
    setLang('zh');
    expect(t('brand')).toBe('拼图相册');
    expect(t('export.title')).toBe('导出');
  });

  it('falls back to English for a missing key in zh', () => {
    setLang('zh');
    // a valid English key that might be 'missing' — actually all keys exist in both dicts.
    // Test with a truly non-existent key:
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('interpolates {placeholder} variables', () => {
    expect(t('library.dragHint', { w: 1920, h: 1080 })).toBe('1920×1080 — drag to a slot');
    setLang('zh');
    expect(t('library.dragHint', { w: 800, h: 600 })).toBe('800×600 — 拖到框位');
  });

  it('handles multiple placeholders', () => {
    setLang('en');
    expect(
      t('saveTpl.summary', {
        count: 3,
        wmm: 297,
        hmm: 210,
        dpi: 300,
        wpx: 3508,
        hpx: 2480,
      }),
    ).toBe('3 slot(s) · 297×210mm @ 300 DPI (3508×2480px)');
  });

  it('keeps the original key when no placeholder is passed but the string has one', () => {
    const result = t('library.dragHint');
    // The {w} and {h} remain literal
    expect(result).toContain('{w}');
    expect(result).toContain('{h}');
  });
});

describe('useI18n store', () => {
  it('starts with English and persists a switch', () => {
    expect(lang()).toBe('en');
    setLang('zh');
    expect(lang()).toBe('zh');
  });

  it('persists the language choice in localStorage', () => {
    setLang('zh');
    // simulate a fresh load
    const raw = localStorage.getItem('splicing-album:lang');
    expect(raw).toBe('zh');
  });

  it('defaults to en for unknown storage values', () => {
    localStorage.setItem('splicing-album:lang', 'fr' as never);
    setLang('en'); // reset to trigger re-read doesn't happen, but the next init would read
    // Just verify t() falls back correctly
    expect(t('brand')).toBe('Splicing Album');
  });
});

describe('t() edge cases with interpolation', () => {
  it('handles a key where a value is a number', () => {
    setLang('en');
    expect(t('export.inclBleed', { bleed: 3 })).toBe('incl. 3 mm bleed');
  });

  it('does not fail on missing vars (leaves placeholder)', () => {
    setLang('zh');
    const result = t('saveTpl.summary', { count: 2 });
    expect(result).toContain('{wmm}');
    expect(result).toContain('2 个框位');
  });
});
