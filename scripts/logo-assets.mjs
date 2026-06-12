// One-off: derive favicon/app-icon assets from the master Mwalimu AI logo.
// Pure Node (zlib only) so it runs without sharp/imagemagick.
// Decodes the 8-bit RGBA PNG, isolates the "M" mark (top cluster, above the
// wordmark), and writes square transparent crops. Resizing is left to sips.
import { readFileSync, writeFileSync } from 'node:fs'
import zlib from 'node:zlib'

// ---- CRC32 (PNG) ----
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// ---- decode 8-bit RGBA, non-interlaced ----
function decode(buf) {
  let p = 8
  let width, height, colorType, bitDepth
  const idat = []
  while (p < buf.length) {
    const len = buf.readUInt32BE(p); p += 4
    const type = buf.toString('ascii', p, p + 4); p += 4
    const data = buf.subarray(p, p + len); p += len; p += 4 // skip crc
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4)
      bitDepth = data[8]; colorType = data[9]
    } else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
  }
  if (bitDepth !== 8 || colorType !== 6) throw new Error(`unsupported PNG: bd=${bitDepth} ct=${colorType}`)
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const bpp = 4, stride = width * bpp
  const out = Buffer.alloc(height * stride)
  for (let y = 0; y < height; y++) {
    const ft = raw[y * (stride + 1)]
    const row = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride)
    const o = y * stride, po = (y - 1) * stride
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[o + x - bpp] : 0
      const b = y > 0 ? out[po + x] : 0
      const c = x >= bpp && y > 0 ? out[po + x - bpp] : 0
      let v = row[x]
      if (ft === 1) v += a
      else if (ft === 2) v += b
      else if (ft === 3) v += (a + b) >> 1
      else if (ft === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      out[o + x] = v & 0xff
    }
  }
  return { width, height, data: out }
}

// ---- encode RGBA (filter 0) ----
function encode({ width, height, data }) {
  const stride = width * 4
  const raw = Buffer.alloc(height * (stride + 1))
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    data.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const comp = zlib.deflateSync(raw, { level: 9 })
  const chunk = (type, d) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(d.length)
    const t = Buffer.from(type, 'ascii')
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, d])))
    return Buffer.concat([len, t, d, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', comp), chunk('IEND', Buffer.alloc(0)),
  ])
}

function cropSquare(img, x0, y0, x1, y1, pad) {
  const w = x1 - x0, h = y1 - y0
  const side = Math.max(w, h) + pad * 2
  const out = Buffer.alloc(side * side * 4) // transparent
  const ox = Math.floor((side - w) / 2), oy = Math.floor((side - h) / 2)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const src = ((y0 + y) * img.width + (x0 + x)) * 4
      const dst = ((oy + y) * side + (ox + x)) * 4
      img.data.copy(out, dst, src, src + 4)
    }
  return { width: side, height: side, data: out }
}

const SRC = process.argv[2]
const img = decode(readFileSync(SRC))
console.log(`source ${img.width}x${img.height}`)

// Row opacity profile -> find the top (mark) cluster vs the wordmark below it.
const A = 24 // alpha threshold
const rowOpaque = new Array(img.height).fill(0)
for (let y = 0; y < img.height; y++) {
  let n = 0
  for (let x = 0; x < img.width; x++) if (img.data[(y * img.width + x) * 4 + 3] > A) n++
  rowOpaque[y] = n
}
// first cluster: from first opaque row until a sustained transparent gap
let top = rowOpaque.findIndex((n) => n > 2)
let bottom = top
let gap = 0
for (let y = top; y < img.height; y++) {
  if (rowOpaque[y] > 2) { bottom = y; gap = 0 }
  else if (++gap > 14) break // 14px sustained gap = end of mark
}
// horizontal bbox within [top,bottom]
let left = img.width, right = 0
for (let y = top; y <= bottom; y++)
  for (let x = 0; x < img.width; x++)
    if (img.data[(y * img.width + x) * 4 + 3] > A) { if (x < left) left = x; if (x > right) right = x }
console.log(`mark bbox: x[${left}-${right}] y[${top}-${bottom}]  (${right - left}x${bottom - top})`)

// Transparent master (tight 18px pad) — for favicons that sit on any surface.
const mark = cropSquare(img, left, top, right + 1, bottom + 1, 18)
writeFileSync('public/_mark-master.png', encode(mark))
console.log(`wrote public/_mark-master.png ${mark.width}x${mark.height}`)

// Composite an RGBA image over a solid background -> opaque RGBA.
function flatten(src, [r, g, b]) {
  const out = Buffer.alloc(src.data.length)
  for (let i = 0; i < src.data.length; i += 4) {
    const a = src.data[i + 3] / 255
    out[i] = Math.round(src.data[i] * a + r * (1 - a))
    out[i + 1] = Math.round(src.data[i + 1] * a + g * (1 - a))
    out[i + 2] = Math.round(src.data[i + 2] * a + b * (1 - a))
    out[i + 3] = 255
  }
  return { width: src.width, height: src.height, data: out }
}

// Maskable / Apple master: generous 12% safe-zone padding, flattened on the
// brand's near-white (#f9fcfb) so iOS does not slap a black box behind it.
const padded = cropSquare(img, left, top, right + 1, bottom + 1, Math.round((right - left) * 0.16))
writeFileSync('public/_mark-onwhite.png', encode(flatten(padded, [249, 252, 251])))
console.log(`wrote public/_mark-onwhite.png ${padded.width}x${padded.height}`)
