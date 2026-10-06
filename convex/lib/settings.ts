import type { QueryCtx } from "../_generated/server";

export const DEFAULT_AI_SETTINGS = {
  /** AI requests per learner per day (Kenya time) on the free plan, and on a paid plan. */
  dailyFree: 40,
  dailyPaid: 200,
  /** Requests across all learners per day; when reached, AI pauses for everyone until midnight. */
  dailyGlobal: 30_000,
  /** Emergency stop: AI is off for learners while true. */
  paused: false,
};
export type AiSettings = typeof DEFAULT_AI_SETTINGS;

export async function readAiSettings(ctx: Pick<QueryCtx, "db">): Promise<AiSettings> {
  const row = await ctx.db.query("appSettings").withIndex("by_key", (q) => q.eq("key", "ai")).unique();
  const v = (row?.value ?? {}) as Partial<AiSettings>;
  const num = (x: unknown, d: number) => (typeof x === "number" && Number.isFinite(x) && x >= 0 ? Math.floor(x) : d);
  return {
    dailyFree: num(v.dailyFree, DEFAULT_AI_SETTINGS.dailyFree),
    dailyPaid: num(v.dailyPaid, DEFAULT_AI_SETTINGS.dailyPaid),
    dailyGlobal: num(v.dailyGlobal, DEFAULT_AI_SETTINGS.dailyGlobal),
    paused: v.paused === true,
  };
}
