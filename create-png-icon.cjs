const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createPng(width, height, pixelFn) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8 bits per channel
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // Compression
  ihdr.writeUInt8(0, 11); // Filter
  ihdr.writeUInt8(0, 12); // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with scanline filter 0
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData.writeUInt8(0, offset++); // Filter byte for scanline
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData.writeUInt8(r, offset++);
      rawData.writeUInt8(g, offset++);
      rawData.writeUInt8(b, offset++);
      rawData.writeUInt8(a, offset++);
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc >>> 0, 8 + len);
  return chunk;
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ 0xffffffff;
}

// Render Netrion Logo (64x64)
const size = 64;
const pngBuffer = createPng(size, size, (x, y) => {
  // Border radius check
  const r = 12;
  const inCorner =
    (x < r && y < r && Math.hypot(x - r, y - r) > r) ||
    (x > size - r && y < r && Math.hypot(x - (size - r), y - r) > r) ||
    (x < r && y > size - r && Math.hypot(x - r, y - (size - r)) > r) ||
    (x > size - r && y > size - r && Math.hypot(x - (size - r), y - (size - r)) > r);

  if (inCorner) return [0, 0, 0, 0];

  // Slate-900 background (#0f172a)
  let red = 15;
  let green = 23;
  let blue = 42;
  let alpha = 255;

  // Nodes: Top-Left (18, 18), Bottom-Left (18, 46), Top-Right (46, 18), Bottom-Right (46, 46)
  const nodes = [
    [18, 18],
    [18, 46],
    [46, 18],
    [46, 46],
  ];

  // Trunk lines: (18,18)->(18,46), (46,18)->(46,46)
  if (Math.abs(x - 18) <= 2 && y >= 18 && y <= 46) {
    red = 37; green = 99; blue = 235; // Blue-600
  }
  if (Math.abs(x - 46) <= 2 && y >= 18 && y <= 46) {
    red = 37; green = 99; blue = 235;
  }

  // Diagonal: (18,18) to (46,46)
  const distDiag = Math.abs((y - 18) - (x - 18));
  if (distDiag <= 2 && x >= 18 && x <= 46) {
    red = 59; green = 130; blue = 246; // Blue-500
  }

  // Activity Packet in Center (32, 32)
  if (Math.hypot(x - 32, y - 32) <= 3) {
    red = 16; green = 185; blue = 129; // Emerald-500
  }

  // Node Circles
  for (const [nx, ny] of nodes) {
    const d = Math.hypot(x - nx, y - ny);
    if (d <= 5) {
      if (d <= 2) {
        red = 15; green = 23; blue = 42; // inner core
      } else {
        red = 255; green = 255; blue = 255; // ring
      }
    }
  }

  return [red, green, blue, alpha];
});

const outPath = path.join(__dirname, 'public', 'netrion-logo.png');
fs.writeFileSync(outPath, pngBuffer);
console.log('Generated PNG icon at:', outPath, 'Bytes:', pngBuffer.length);
