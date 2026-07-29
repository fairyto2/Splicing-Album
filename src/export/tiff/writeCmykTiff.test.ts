import { describe, expect, it } from 'vitest';
import { writeCmykTiff } from './writeCmykTiff';

interface Entry {
  type: number;
  count: number;
  values: number[];
}

/** Minimal TIFF IFD reader for verifying the writer output. */
function parseTiff(buf: Uint8Array): { magic: number; entries: Map<number, Entry> } {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  expect(buf[0]).toBe(0x49); // little-endian
  expect(buf[1]).toBe(0x49);
  const little = true;
  const magic = dv.getUint16(2, little);
  const ifdOff = dv.getUint32(4, little);
  const count = dv.getUint16(ifdOff, little);
  const typeSize: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1 };
  const entries = new Map<number, Entry>();
  let o = ifdOff + 2;
  for (let i = 0; i < count; i++) {
    const tag = dv.getUint16(o, little);
    const type = dv.getUint16(o + 2, little);
    const cnt = dv.getUint32(o + 4, little);
    const size = cnt * (typeSize[type] ?? 1);
    let dataOff = o + 8;
    if (size > 4) dataOff = dv.getUint32(o + 8, little);
    const values: number[] = [];
    for (let j = 0; j < cnt; j++) {
      if (type === 3) values.push(dv.getUint16(dataOff + j * 2, little));
      else if (type === 4) values.push(dv.getUint32(dataOff + j * 4, little));
      else values.push(dv.getUint8(dataOff + j));
    }
    entries.set(tag, { type, count: cnt, values });
    o += 12;
  }
  return { magic, entries };
}

describe('writeCmykTiff', () => {
  it('writes a valid little-endian CMYK TIFF structure', () => {
    const width = 4;
    const height = 2;
    const cmyk = new Uint8Array(width * height * 4);
    for (let i = 0; i < cmyk.length; i++) cmyk[i] = (i * 7) % 256;

    const bytes = writeCmykTiff(cmyk, { width, height, dpi: 300 });
    const { magic, entries } = parseTiff(bytes);

    expect(magic).toBe(42);
    expect(entries.get(0x0100)?.values[0]).toBe(width); // ImageWidth
    expect(entries.get(0x0101)?.values[0]).toBe(height); // ImageLength
    expect(entries.get(0x0102)?.values).toEqual([8, 8, 8, 8]); // BitsPerSample
    expect(entries.get(0x0103)?.values[0]).toBe(1); // Compression = none
    expect(entries.get(0x0106)?.values[0]).toBe(5); // PhotometricInterpretation = CMYK
    expect(entries.get(0x0115)?.values[0]).toBe(4); // SamplesPerPixel
  });

  it('embeds the strip data verbatim at the end of the file', () => {
    const cmyk = new Uint8Array(3 * 2 * 4);
    cmyk[cmyk.length - 1] = 123;
    const bytes = writeCmykTiff(cmyk, { width: 3, height: 2, dpi: 300 });
    expect(bytes[bytes.length - 1]).toBe(123);
    // Strip byte count tag equals the input length.
    const { entries } = parseTiff(bytes);
    expect(entries.get(0x0117)?.values[0]).toBe(cmyk.length);
  });

  it('includes an ICC profile tag when given one', () => {
    const cmyk = new Uint8Array(2 * 2 * 4);
    const icc = new Uint8Array([1, 2, 3, 4, 5]);
    const bytes = writeCmykTiff(cmyk, { width: 2, height: 2, dpi: 300, icc });
    const { entries } = parseTiff(bytes);
    expect(entries.get(0x8773)?.count).toBe(icc.length);
  });

  it('rejects a mismatched buffer size', () => {
    expect(() => writeCmykTiff(new Uint8Array(10), { width: 3, height: 3, dpi: 300 })).toThrow();
  });
});
