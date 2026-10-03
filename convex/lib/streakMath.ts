const DAY_MS = 86_400_000;
// Kenya (EAT) is UTC+3 with no DST. Streak days roll over at local midnight.
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

export function eatDateKey(nowMs: number) {
  return new Date(nowMs + EAT_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(dateKey: string, days: number) {
  return new Date(Date.parse(`${dateKey}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(fromKey: string, toKey: string) {
  return Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / DAY_MS);
}

export function dateRange(fromKey: string, toKey: string) {
  const out: string[] = [];
  for (let d = fromKey; d <= toKey; d = addDays(d, 1)) out.push(d);
  return out;
}

type StreakSummary = { current: number; longest: number; totalDays: number };

/** Mirrors lib/streak.ts getStreak (today may be empty without breaking the streak). */
export function computeStreak(activeDates: Iterable<string>, today: string): StreakSummary {
  const set = new Set(activeDates);
  const dates = [...set].sort();
  let current = 0;
  for (let offset = 0; offset < 365; offset++) {
    const day = addDays(today, -offset);
    if (set.has(day)) current++;
    else if (offset === 0) continue;
    else break;
  }
  let longest = dates.length ? 1 : 0,
    run = 1;
  for (let i = 1; i < dates.length; i++) {
    if (daysBetween(dates[i - 1], dates[i]) === 1) {
      run++;
      longest = Math.max(longest, run);
    } else run = 1;
  }
  return { current, longest: Math.max(longest, current), totalDays: dates.length };
}
