// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mutations: { name: string; args: any }[] = [];
let online = false;
let cloudRows: any[] = [];
vi.mock("@/lib/convex/client", () => ({
  getConvexClient: () => ({
    mutation: async (ref: { name?: string }, args: unknown) => {
      if (!online) throw new Error("offline");
      mutations.push({ name: String((ref as any)[Symbol.for("functionName")] ?? "m"), args });
      return null;
    },
    query: async () => cloudRows,
  }),
}));

const store = new Map<string, string>();
beforeEach(() => {
  store.clear(); mutations.length = 0; online = false; cloudRows = [];
  vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) });
  vi.stubGlobal("window", { dispatchEvent: () => true });
  vi.stubGlobal("Event", class { constructor(public type: string) {} });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("work done offline is never lost", () => {
  it("keeps a finished lesson pending until the server confirms, and a cloud load does not erase it", async () => {
    const lp = await import("@/lib/learning-progress");
    lp.setLearningProgressUser("user-1");
    lp.completeLesson("cbc-foundations", "m1", "l1"); // offline: the send fails
    await new Promise((r) => setTimeout(r, 0));
    expect(JSON.parse(store.get("mwalimu_sync_pending")!)).toEqual(["cbc-foundations"]);

    // The device starts again; the server only knows about a different lesson.
    cloudRows = [{ programId: "cbc-foundations", completedLessons: ["m1/l2"], reflections: {}, cohortJoined: false }];
    await lp.loadProgressFromCloud("user-1");
    const merged = JSON.parse(store.get("mwalimu_learning_progress")!)["cbc-foundations"];
    expect(merged.completedLessons.sort()).toEqual(["m1/l1", "m1/l2"]); // nothing dropped

    // Connection returns: everything waiting is sent, then the list is empty.
    online = true;
    lp.flushPendingProgress();
    await new Promise((r) => setTimeout(r, 0));
    expect(mutations.length).toBeGreaterThan(0);
    expect(mutations.at(-1)!.args.progress.completedLessons.sort()).toEqual(["m1/l1", "m1/l2"]);
    expect(JSON.parse(store.get("mwalimu_sync_pending")!)).toEqual([]);
  });

  it("queues streak activity and sends it when back online", async () => {
    const st = await import("@/lib/streak");
    st.recordActivity("login", "user-1"); // offline
    await new Promise((r) => setTimeout(r, 0));
    expect(JSON.parse(store.get("mwalimu_activity_pending")!)).toHaveLength(1);
    online = true;
    st.flushPendingActivity();
    await new Promise((r) => setTimeout(r, 0));
    expect(mutations).toHaveLength(1);
    expect(JSON.parse(store.get("mwalimu_activity_pending")!)).toEqual([]);
  });
});
