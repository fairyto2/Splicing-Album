/**
 * Minimal CMYK TIFF writer — uncompressed, single strip, little-endian.
 *
 * PhotometricInterpretation = 5 (CMYK), SamplesPerPixel = 4, 8 bits each.
 * Uncompressed CMYK TIFF is a perfectly standard print deliverable; this keeps
 * the MVP dependency-free. Optional ICC profile is embedded via tag 34675 when
 * provided.
 *
 * Pure byte manipulation — no canvas, no DOM — so it is fully unit-testable.
 */

export interface WriteTiffOptions {
  width: number;
  height: number;
  dpi: number;
  icc?: Uint8Array;
}

const TYPE_SHORT = 3;
const TYPE_LONG = 4;
const TYPE_RATIONAL = 5;
const TYPE_UNDEFINED = 7;

export function writeCmykTiff(cmyk: Uint8Array, opts: WriteTiffOptions): Uint8Array {
  const { width, height, dpi, icc } = opts;
  if (cmyk.length !== width * height * 4) {
    throw new Error(`cmyk buffer size ${cmyk.length} != width*height*4 (${width * height * 4})`);
  }

  const hasIcc = !!icc && icc.length > 0;
  const entryCount = hasIcc ? 13 : 12;

  // Layout: header(8) | IFD | external values | strip data
  const headerSize = 8;
  const ifdOffset = headerSize;
  const ifdSize = 2 + entryCount * 12 + 4;
  const extOffset = ifdOffset + ifdSize;
  const bitsOffset = extOffset; // 4 × SHORT = 8 bytes
  const xresOffset = bitsOffset + 8; // RATIONAL = 8 bytes
  const yresOffset = xresOffset + 8; // RATIONAL = 8 bytes
  const iccOffset = yresOffset + 8;
  const extSize = 8 + 8 + 8 + (hasIcc ? icc!.length : 0);
  const stripOffset = extOffset + extSize;
  const stripSize = cmyk.length;
  const total = stripOffset + stripSize;

  const buf = new ArrayBuffer(total);
  const dv = new DataView(buf);
  const u8 = new Uint8Array(buf);
  const put16 = (o: number, v: number) => dv.setUint16(o, v, true);
  const put32 = (o: number, v: number) => dv.setUint32(o, v >>> 0, true);

  // --- Header ---
  u8[0] = 0x49; // 'I'
  u8[1] = 0x49; // 'I'  → little-endian
  put16(2, 42); // magic
  put32(4, ifdOffset);

  // --- IFD ---
  let o = ifdOffset;
  put16(o, entryCount);
  o += 2;
  const entry = (tag: number, type: number, count: number, value: number) => {
    put16(o, tag);
    put16(o + 2, type);
    put32(o + 4, count);
    put32(o + 8, value >>> 0);
    o += 12;
  };

  entry(0x0100, TYPE_LONG, 1, width); // ImageWidth
  entry(0x0101, TYPE_LONG, 1, height); // ImageLength
  entry(0x0102, TYPE_SHORT, 4, bitsOffset); // BitsPerSample → [8,8,8,8]
  entry(0x0103, TYPE_SHORT, 1, 1); // Compression = none
  entry(0x0106, TYPE_SHORT, 1, 5); // PhotometricInterpretation = CMYK
  entry(0x0111, TYPE_LONG, 1, stripOffset); // StripOffsets
  entry(0x0115, TYPE_SHORT, 1, 4); // SamplesPerPixel
  entry(0x0116, TYPE_LONG, 1, height); // RowsPerStrip
  entry(0x0117, TYPE_LONG, 1, stripSize); // StripByteCounts
  entry(0x011a, TYPE_RATIONAL, 1, xresOffset); // XResolution
  entry(0x011b, TYPE_RATIONAL, 1, yresOffset); // YResolution
  entry(0x0128, TYPE_SHORT, 1, 2); // ResolutionUnit = inch
  if (hasIcc) entry(0x8773, TYPE_UNDEFINED, icc!.length, iccOffset); // ICCProfile
  put32(o, 0); // next IFD = none
  o += 4;

  // --- External values ---
  put16(bitsOffset, 8);
  put16(bitsOffset + 2, 8);
  put16(bitsOffset + 4, 8);
  put16(bitsOffset + 6, 8);
  put32(xresOffset, Math.round(dpi));
  put32(xresOffset + 4, 1);
  put32(yresOffset, Math.round(dpi));
  put32(yresOffset + 4, 1);
  if (hasIcc) u8.set(icc!, iccOffset);

  // --- Strip data ---
  u8.set(cmyk, stripOffset);

  return u8;
}
