import { sha256Hex } from "./audit";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const BACKUP_CODE_COUNT = 10;
export const BACKUP_CODE_PATTERN = /^[A-HJKMNP-Z2-9]{4}-?[A-HJKMNP-Z2-9]{4}$/i;

const randomCode = () => {
  // Rejection sampling keeps every character equally likely (plain modulo would favour the first few).
  const limit = 256 - (256 % ALPHABET.length);
  let chars = "";
  while (chars.length < 8) for (const b of crypto.getRandomValues(new Uint8Array(16))) if (b < limit && chars.length < 8) chars += ALPHABET[b % ALPHABET.length];
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
};
const normalize = (code: string) => code.replace(/-/g, "").toUpperCase();

/** Ten fresh codes: the plain text to show once, and salted hashes to store. */
export async function generateBackupCodes() {
  const plain: string[] = [];
  const stored: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = randomCode();
    const salt = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    plain.push(code);
    stored.push(`${salt}$${await sha256Hex(`${salt}:${normalize(code)}`)}`);
  }
  return { plain, stored };
}

/** Index of the stored code that matches the input, or -1. */
export async function matchBackupCode(stored: string[], input: string) {
  const code = normalize(input);
  for (const [i, entry] of stored.entries()) {
    const [salt, hash] = entry.split("$");
    if (salt && hash && (await sha256Hex(`${salt}:${code}`)) === hash) return i;
  }
  return -1;
}
