/**
 * Remove hidden metadata (EXIF including GPS location, XMP, comments, text chunks) from JPEG, PNG and WebP files
 * without re-encoding the picture. Pure byte work, so it runs in the default Convex runtime.
 * Returns null when the bytes are not a well-formed file of the declared type.
 */
export function stripMetadata(bytes: Uint8Array, type: string): Uint8Array | null {
  if (type === "image/jpeg") return stripJpeg(bytes);
  if (type === "image/png") return stripPng(bytes);
  if (type === "image/webp") return stripWebp(bytes);
  return null;
}

function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

function stripJpeg(b: Uint8Array): Uint8Array | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  const parts: Uint8Array[] = [b.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker === 0xda) { parts.push(b.subarray(i)); return concat(parts); } // start of scan: the rest is picture data
    const len = (b[i + 2] << 8) | b[i + 3];
    if (len < 2 || i + 2 + len > b.length) return null;
    // Drop APP1 (EXIF/XMP), APP3–APP15 and comments. Keep APP0 (JFIF) and APP2 (colour profile).
    const drop = marker === 0xe1 || (marker >= 0xe3 && marker <= 0xef) || marker === 0xfe;
    if (!drop) parts.push(b.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  return null;
}

function stripPng(b: Uint8Array): Uint8Array | null {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length < 8 || sig.some((x, k) => b[k] !== x)) return null;
  const parts: Uint8Array[] = [b.subarray(0, 8)];
  const drop = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);
  let i = 8;
  while (i + 12 <= b.length) {
    const len = ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
    const type = String.fromCharCode(b[i + 4], b[i + 5], b[i + 6], b[i + 7]);
    const end = i + 12 + len;
    if (end > b.length) return null;
    if (!drop.has(type)) parts.push(b.subarray(i, end));
    i = end;
    if (type === "IEND") return concat(parts);
  }
  return null;
}

function stripWebp(b: Uint8Array): Uint8Array | null {
  const tag = (o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
  if (b.length < 12 || tag(0) !== "RIFF" || tag(8) !== "WEBP") return null;
  const parts: Uint8Array[] = [];
  let i = 12;
  while (i + 8 <= b.length) {
    const type = tag(i);
    const len = b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | ((b[i + 7] << 24) >>> 0);
    const end = i + 8 + len + (len % 2);
    if (i + 8 + len > b.length) return null;
    if (type === "VP8X") {
      const chunk = b.slice(i, Math.min(end, b.length));
      chunk[8] &= ~(0x08 | 0x04); // clear the "has EXIF" and "has XMP" flags
      parts.push(chunk);
    } else if (type !== "EXIF" && type !== "XMP ") parts.push(b.subarray(i, Math.min(end, b.length)));
    i = end;
  }
  const body = concat(parts);
  const size = body.length + 4;
  const head = new Uint8Array([0x52, 0x49, 0x46, 0x46, size & 0xff, (size >> 8) & 0xff, (size >> 16) & 0xff, (size >>> 24) & 0xff, 0x57, 0x45, 0x42, 0x50]);
  return concat([head, body]);
}
