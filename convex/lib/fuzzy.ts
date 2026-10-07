/**
 * Small typo-tolerant matcher shared by the server search and the in-app search box.
 * Every word typed must match a word in the text: exactly, as a prefix, inside it, or within one or two typos.
 * Returns 0 for no match; higher is better.
 */
export function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function withinEdits(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
}

export function fuzzyScore(query: string, text: string): number {
  const q = normalize(query);
  if (!q) return 0;
  const t = normalize(text);
  const words = t.split(" ");
  let total = 0;
  for (const token of q.split(" ")) {
    let best = 0;
    const edits = token.length >= 7 ? 2 : token.length >= 4 ? 1 : 0;
    for (const w of words) {
      if (w === token) { best = 3; break; }
      if (w.startsWith(token)) best = Math.max(best, 2.5);
      else if (token.length >= 3 && w.includes(token)) best = Math.max(best, 2);
      else if (edits && (withinEdits(token, w, edits) || (w.length > token.length && withinEdits(token, w.slice(0, token.length), edits)))) best = Math.max(best, 1.5);
    }
    if (!best) return 0;
    total += best;
  }
  return total + (t.includes(q) ? 2 : 0);
}
