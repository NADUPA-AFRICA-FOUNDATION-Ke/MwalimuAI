import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { makeLearner, makeStaff, newTest } from "./helpers";

const REASON = "Raising the allowance for the school pilot";

describe("AI usage limits", () => {
  it("stops a learner at their daily allowance, gives paying learners more, and counts per tool", async () => {
    const t = newTest();
    const admin = await makeStaff(t, "super_admin");
    const free = await makeLearner(t);
    const paid = await makeLearner(t);
    await t.run(async (ctx) => { await ctx.db.insert("subscriptions", { userId: paid.profileId, plan: "professional", status: "active", createdAt: Date.now(), updatedAt: Date.now() }); });
    await admin.as.mutation(api.admin.aiUsage.setLimits, { dailyFree: 3, dailyPaid: 5, dailyGlobal: 1000, paused: false, reason: REASON });

    for (let i = 0; i < 3; i++) await free.as.mutation(api.aiUsage.consume, { tool: "chat" });
    await expect(free.as.mutation(api.aiUsage.consume, { tool: "chat" })).rejects.toThrow(/today's AI allowance \(3 requests\)/);
    expect(await free.as.query(api.aiUsage.mine, {})).toEqual({ used: 3, limit: 3 });
    for (let i = 0; i < 5; i++) await paid.as.mutation(api.aiUsage.consume, { tool: "tools" });
    await expect(paid.as.mutation(api.aiUsage.consume, { tool: "tools" })).rejects.toThrow(/AI allowance/);

    const o = await admin.as.query(api.admin.aiUsage.overview, {});
    const today = o.days[o.days.length - 1];
    expect(today).toMatchObject({ total: 8 });
    expect(today.byTool).toMatchObject({ chat: 3, tools: 5 });
    expect(o.heaviestToday[0].count).toBe(5);
  });

  it("has a platform ceiling and an emergency stop, and only a Super Admin can change them", async () => {
    const t = newTest();
    const admin = await makeStaff(t, "super_admin");
    const support = await makeStaff(t, "support_agent");
    const a = await makeLearner(t);
    const b = await makeLearner(t);
    await expect(support.as.mutation(api.admin.aiUsage.setLimits, { dailyFree: 1, dailyPaid: 1, dailyGlobal: 1, paused: false, reason: REASON })).rejects.toThrow(/FORBIDDEN/);
    await admin.as.mutation(api.admin.aiUsage.setLimits, { dailyFree: 50, dailyPaid: 50, dailyGlobal: 2, paused: false, reason: REASON });
    await a.as.mutation(api.aiUsage.consume, { tool: "chat" });
    await b.as.mutation(api.aiUsage.consume, { tool: "chat" });
    await expect(a.as.mutation(api.aiUsage.consume, { tool: "chat" })).rejects.toThrow(/very busy/);
    await admin.as.mutation(api.admin.aiUsage.setLimits, { dailyFree: 50, dailyPaid: 50, dailyGlobal: 100, paused: true, reason: REASON });
    await expect(a.as.mutation(api.aiUsage.consume, { tool: "chat" })).rejects.toThrow(/paused/);
    await expect(admin.as.mutation(api.admin.aiUsage.setLimits, { dailyFree: -1, dailyPaid: 1, dailyGlobal: 1, paused: false, reason: REASON })).rejects.toThrow(/whole number/);
  });
});
