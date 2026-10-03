// RFC 6238 TOTP and AES-GCM secret storage on Web Crypto (available in the
// Convex default runtime), so no third-party dependency is needed.

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(bytes: Uint8Array) {
  let bits = 0,
    value = 0,
    out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(input: string) {
  let bits = 0,
    value = 0;
  const out: number[] = [];
  for (const ch of input.replace(/=+$/, "").toUpperCase()) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error("Invalid base32");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

export function generateTotpSecret() {
  return base32Encode(crypto.getRandomValues(new Uint8Array(20)));
}

async function hotp(secret: Uint8Array, counter: number) {
  const key = await crypto.subtle.importKey("raw", secret as BufferSource, { name: "HMAC", hash: "SHA-1" }, false, [
    "sign",
  ]);
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, buf));
  const offset = mac[mac.length - 1] & 15;
  const bin = ((mac[offset] & 127) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(bin % 1_000_000).padStart(6, "0");
}

const TOTP_STEP_SECONDS = 30;

export async function totpCode(base32Secret: string, atMs: number) {
  return hotp(base32Decode(base32Secret), Math.floor(atMs / 1000 / TOTP_STEP_SECONDS));
}

/** Returns the matched time step (for replay protection) or null. Allows ±1 step of clock drift. */
export async function verifyTotp(base32Secret: string, code: string, nowMs: number): Promise<number | null> {
  if (!/^\d{6}$/.test(code)) return null;
  const secret = base32Decode(base32Secret);
  const current = Math.floor(nowMs / 1000 / TOTP_STEP_SECONDS);
  for (const step of [current, current - 1, current + 1]) {
    if ((await hotp(secret, step)) === code) return step;
  }
  return null;
}

export function otpauthUri(email: string, base32Secret: string) {
  const label = encodeURIComponent(`Mwalimu AI Admin:${email}`);
  return `otpauth://totp/${label}?secret=${base32Secret}&issuer=${encodeURIComponent("Mwalimu AI Admin")}&digits=6&period=30`;
}

async function encryptionKey() {
  const raw = process.env.ADMIN_MFA_ENC_KEY;
  if (!raw || raw.length < 32) throw new Error("ADMIN_MFA_ENC_KEY must be set (32+ characters)");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

const toB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function encryptSecret(plain: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), new TextEncoder().encode(plain)),
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return toB64(out);
}

export async function decryptSecret(stored: string) {
  const bytes = fromB64(stored);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes.slice(0, 12) },
    await encryptionKey(),
    bytes.slice(12),
  );
  return new TextDecoder().decode(plain);
}
