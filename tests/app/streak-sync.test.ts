// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/convex/client", () => ({ getConvexClient: () => null }));

const store = new Map<string, string>();
const events: string[] = [];
beforeEach(() => {
  store.clear();
  events.length = 0;
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
  vi.stubGlobal("window", { dispatchEvent: (e: { type: string }) => void events.push(e.type) });
  vi.stubGlobal("Event", class { constructor(public type: string) {} });
});

describe("device streak follows the server", () => {
  it("adds days staff restored, then drops them when staff reverse it", async () => {
    const { applyServerActivity, getStreak, ACTIVITY_SYNCED_EVENT } = await import("@/lib/streak");
    const day = (ago: number) => new Date(Date.now() + 3 * 3600_000 - ago * 86_400_000).toISOString().slice(0, 10);

    // Real activity today and 3 days ago; a gap on days 1-2 broke the streak.
    store.set("mwalimu_activity", JSON.stringify([{ date: day(0), type: "login" }, { date: day(3), type: "lesson" }]));
    expect(getStreak().current).toBe(1);

    const changed = applyServerActivity({
      rows: [
        { date: day(2), type: "login" },
        { date: day(1), type: "login" },
      ],
      revokedDates: [],
    });
    expect(changed).toBe(true);
    expect(events).toContain(ACTIVITY_SYNCED_EVENT);
    expect(getStreak().current).toBe(4);

    // Same data again changes nothing and does not re-render.
    events.length = 0;
    expect(applyServerActivity({ rows: [{ date: day(2), type: "login" }, { date: day(1), type: "login" }], revokedDates: [] })).toBe(false);
    expect(events).toHaveLength(0);

    // Staff reverse the restoration.
    applyServerActivity({ rows: [], revokedDates: [day(2), day(1)] });
    expect(getStreak().current).toBe(1);
  });
});
