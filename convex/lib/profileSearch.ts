import { fail } from "./errors";

export function normalizePhone(raw: string): string | undefined {
  const compact = raw.replace(/[\s().-]/g, "");
  if (!compact) return undefined;
  let digits: string;
  if (compact.startsWith("+")) digits = compact.slice(1);
  else if (compact.startsWith("00")) digits = compact.slice(2);
  else if (compact.startsWith("0") && compact.length === 10)
    digits = `254${compact.slice(1)}`; // Kenyan national format
  else if (compact.length === 9 && /^[17]/.test(compact)) digits = `254${compact}`;
  else digits = compact;
  if (!/^\d{8,15}$/.test(digits)) {
    throw fail("INVALID_ARGUMENT", "Phone number is not valid");
  }
  return `+${digits}`;
}

export function buildSearchText(p: { name?: string; email?: string; school?: string; phoneNormalized?: string }) {
  return [p.name, p.email, p.phoneNormalized, p.school]
    .filter((x): x is string => Boolean(x && x.trim()))
    .join(" ")
    .toLowerCase()
    .slice(0, 1000);
}
