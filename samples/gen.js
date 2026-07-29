// Dependency-free sample image generator (valid PNG via Node's zlib).
// Produces a few colorful gradient "photos" of varying aspect ratios so you can
// immediately try the editor without hunting for real photos. Run: node samples/gen.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function writePNG(file, w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  fs.writeFileSync(file, Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]));
}

function gradient(w, h, c1, c2, label) {
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = (x / w + y / h) / 2;
      const i = (y * w + x) * 4;
      buf[i] = Math.round(c1[0] + (c2[0] - c1[0]) * t);
      buf[i + 1] = Math.round(c1[1] + (c2[1] - c1[1]) * t);
      buf[i + 2] = Math.round(c1[2] + (c2[2] - c1[2]) * t);
      buf[i + 3] = 255;
    }
  }
  // Simple label block so each sample is visually distinct.
  const bw = Math.round(w * 0.34);
  const bh = Math.round(h * 0.16);
  const bx = Math.round((w - bw) / 2);
  const by = Math.round((h - bh) / 2);
  for (let y = by; y < by + bh; y++) {
    for (let x = bx; x < bx + bw; x++) {
      const i = (y * w + x) * 4;
      buf[i] = Math.min(255, buf[i] + 60);
      buf[i + 1] = Math.min(255, buf[i + 1] + 60);
      buf[i + 2] = Math.min(255, buf[i + 2] + 60);
    }
  }
  return buf;
}

const out = __dirname;
const samples = [
  ['sample-blue.png', 1600, 1200, [10, 60, 160], [40, 200, 210]],
  ['sample-orange.png', 1200, 1600, [200, 80, 20], [240, 170, 30]],
  ['sample-green.png', 1600, 900, [20, 120, 50], [170, 220, 60]],
  ['sample-purple.png', 1000, 1000, [90, 30, 150], [230, 90, 180]],
];

for (const [name, w, h, c1, c2] of samples) {
  writePNG(path.join(out, name), w, h, gradient(w, h, c1, c2));
  console.log('wrote', name, `${w}x${h}`);
}
