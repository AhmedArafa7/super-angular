const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Simple CRC32 table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crcBuf = Buffer.alloc(4 + len);
  chunk.copy(crcBuf, 0, 4, 8 + len);
  const crcVal = crc32(crcBuf);
  chunk.writeUInt32BE(crcVal, 8 + len);
  return chunk;
}

function generatePng(width, height, isMaskable = false) {
  const rawScanlines = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  // Center and radius for styling
  const cx = width / 2;
  const cy = height / 2;
  const radius = isMaskable ? width / 2 : width * 0.44;
  const cornerRadius = isMaskable ? 0 : width * 0.22;

  for (let y = 0; y < height; y++) {
    rawScanlines[offset++] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      // Calculate normalized gradient coordinate
      const nx = x / width;
      const ny = y / height;

      // Check rounded rect boundaries for non-maskable icons
      let inBounds = true;
      if (!isMaskable) {
        // Distance to box with corner radius
        const dx = Math.max(0, Math.abs(x - cx) - (cx - cornerRadius));
        const dy = Math.max(0, Math.abs(y - cy) - (cy - cornerRadius));
        if (Math.hypot(dx, dy) > cornerRadius) {
          inBounds = false;
        }
      }

      if (!inBounds) {
        rawScanlines[offset++] = 0;
        rawScanlines[offset++] = 0;
        rawScanlines[offset++] = 0;
        rawScanlines[offset++] = 0; // Transparent
        continue;
      }

      // Background gradient from Indigo (#4f46e5 / #6366f1) to Cyan (#06b6d4) to Violet (#8b5cf6)
      const grad = (nx + ny) / 2;
      let r = Math.round(79 * (1 - grad) + 6 * grad);
      let g = Math.round(70 * (1 - grad) + 182 * grad);
      let b = Math.round(229 * (1 - grad) + 212 * grad);

      // Add a modern subtle circular glow at the center
      const distToCenter = Math.hypot(x - cx, y - cy);
      const glow = Math.max(0, 1 - distToCenter / (width * 0.6));
      r = Math.min(255, Math.round(r + glow * 40));
      g = Math.min(255, Math.round(g + glow * 40));
      b = Math.min(255, Math.round(b + glow * 40));

      // Draw stylized "S" glyph
      // Grid resolution for glyph rasterization
      const gx = (x - cx) / (width * 0.38); // -1 to 1 range
      const gy = (y - cy) / (height * 0.44); // -1 to 1 range

      let isGlyph = false;
      const thickness = 0.22;

      // Top arc of S
      if (gy < -0.15 && gy > -0.9) {
        const topCy = -0.52;
        const dist = Math.hypot(gx * 0.9, gy - topCy);
        const angle = Math.atan2(gy - topCy, gx * 0.9);
        if (dist > 0.38 - thickness && dist < 0.38 + thickness) {
          // Open on bottom-right of top circle
          if (angle < 0.6 || angle > 2.6 || gy < -0.52) {
            isGlyph = true;
          }
        }
      }
      // Bottom arc of S
      if (gy > 0.15 && gy < 0.9) {
        const botCy = 0.52;
        const dist = Math.hypot(gx * 0.9, gy - botCy);
        const angle = Math.atan2(gy - botCy, gx * 0.9);
        if (dist > 0.38 - thickness && dist < 0.38 + thickness) {
          // Open on top-left of bottom circle
          if (angle > -0.6 || angle < -2.6 || gy > 0.52) {
            isGlyph = true;
          }
        }
      }
      // Diagonal spine connecting the two
      if (Math.abs(gy) <= 0.25) {
        const expectedX = -gy * 1.5;
        if (Math.abs(gx - expectedX) < thickness * 1.1) {
          isGlyph = true;
        }
      }

      if (isGlyph) {
        // Crisp white glyph with slight subtle shadow
        rawScanlines[offset++] = 255;
        rawScanlines[offset++] = 255;
        rawScanlines[offset++] = 255;
        rawScanlines[offset++] = 255;
      } else {
        rawScanlines[offset++] = r;
        rawScanlines[offset++] = g;
        rawScanlines[offset++] = b;
        rawScanlines[offset++] = 255;
      }
    }
  }

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Standard filter
  ihdrData[12] = 0; // No interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT
  const compressed = zlib.deflateSync(rawScanlines, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const targetDirs = [
  path.join(__dirname, '..', 'src', 'assets', 'icons'),
  path.join(__dirname, '..', 'public', 'assets', 'icons')
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Generate standard icon sizes
  const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];
  for (const s of sizes) {
    const pngBuf = generatePng(s, s, false);
    fs.writeFileSync(path.join(dir, `icon-${s}x${s}.png`), pngBuf);
  }

  // Generate maskable 512x512
  const maskableBuf = generatePng(512, 512, true);
  fs.writeFileSync(path.join(dir, 'icon-maskable-512x512.png'), maskableBuf);

  // Generate apple touch icon (180x180)
  const appleBuf = generatePng(180, 180, false);
  fs.writeFileSync(path.join(dir, 'apple-touch-icon.png'), appleBuf);
}

console.log('✅ Successfully generated all PWA PNG icons in src/assets/icons and public/assets/icons');
