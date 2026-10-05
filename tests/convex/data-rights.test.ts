import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { eraseBatch, type EraseState } from "../../convex/lib/erase";
import { addActivity, days, makeLearner, makeStaff, newTest, type T } from "./helpers";

async function eraseAll(t: T, profileId: any) {
  let state: EraseState | null = { profileId, phase: 0, cursor: null };
  let guard = 0;
  while (state && guard++ < 500) {
    const s: EraseState = state;
    state = await t.run((ctx) => eraseBatch(ctx, s));
  }
  expect(state).toBeNull();
}

async function seed(t: T, learner: Awaited<ReturnType<typeof makeLearner>>) {
  await addActivity(t, learner.profileId, [days(1), days(2)]);
  await learner.as.mutation(api.learningProgress.save, { programId: "cbc-foundations", progress: { completedLessons: ["m1/l1"], reflections: { "m1/l1": "My private reflection" }, cohortJoined: false } });
  await learner.as.mutation(api.tickets.create, { subject: "Help", category: "other", body: "Private message" });
  const postId = await learner.as.mutation(api.community.createPost, { title: "My post", content: "Some content", category: "Pedagogy" });
  await t.run(async (ctx) => {
    await ctx.db.insert("journalEntries", { userId: learner.profileId, clientId: "j1", entryDate: "2026-10-01", title: "Diary", content: "Dear diary", mood: 4, createdAt: Date.now(), updatedAt: Date.now() });
    await ctx.db.insert("certificates", { serial: "MW-AAAAA-BBBBB", userId: learner.profileId, programId: "cbc-foundations", programTitle: "CBC Foundations", teacherName: "Learner One", earnedAt: Date.now() });
  });
  return postId;
}

describe("learner data rights", () => {
  it("exports what the platform holds, without staff-only notes or system ids", async () => {
    const t = newTest();
    const learner = await makeLearner(t, { name: "Wanjiru" });
    const support = await makeStaff(t, "support_agent");
    await seed(t, learner);
    const { ticketId } = await learner.as.mutation(api.tickets.create, { subject: "Second", category: "other", body: "Hello" });
    await support.as.mutation(api.admin.tickets.note, { ticketId, body: "INTERNAL note about this person" });

    const data = await learner.as.query(api.dataRights.exportMine, {});
    expect((data.profile as { name: string }).name).toBe("Wanjiru");
    expect((data.journal[0] as any).content).toBe("Dear diary");
    expect((data.learningProgress[0] as any).reflections["m1/l1"]).toBe("My private reflection");
    expect(data.activity).toHaveLength(2);
    expect((data.communityPosts[0] as any).title).toBe("My post");
    expect(JSON.stringify(data)).not.toContain("INTERNAL note");
    expect(JSON.stringify(data)).not.toMatch(/tokenIdentifier|authSubject|activeSessionId/);
    expect(data.truncated).toEqual([]);
    await learner.as.mutation(api.dataRights.logExport, {});
    const log = await t.run((ctx) => ctx.db.query("privacyRequests").collect());
    expect(log.map((r) => r.kind)).toEqual(["export"]);
  });

  it("erases the account for real: personal data gone, shared records anonymised, sessions ended, others untouched", async () => {
    const t = newTest();
    const learner = await makeLearner(t, { name: "Wanjiru" });
    const other = await makeLearner(t, { name: "Otieno" });
    const postId = await seed(t, learner);
    await other.as.mutation(api.community.addComment, { postId, body: "Nice post" });
    await other.as.mutation(api.tickets.create, { subject: "Other's ticket", category: "other", body: "Mine" });
    const sessionUser = learner.userId;
    await t.run(async (ctx) => { await ctx.db.insert("authAccounts", { userId: sessionUser, provider: "password", providerAccountId: learner.email }); });

    await expect(learner.as.mutation(api.dataRights.deleteMine, { confirm: "delete please" })).rejects.toThrow(/Type DELETE/);
    await learner.as.mutation(api.dataRights.deleteMine, { confirm: "DELETE" });
    // Locked immediately, before the background erasure has run.
    await expect(learner.as.query(api.activity.listMine, {})).rejects.toThrow(/suspended/);

    await eraseAll(t, learner.profileId);

    const left = await t.run(async (ctx) => ({
      profile: await ctx.db.get(learner.profileId),
      user: await ctx.db.get(learner.userId),
      accounts: (await ctx.db.query("authAccounts").collect()).filter((a) => a.userId === learner.userId).length,
      journal: (await ctx.db.query("journalEntries").collect()).length,
      progress: (await ctx.db.query("learningProgress").collect()).filter((p) => p.userId === learner.profileId).length,
      activity: (await ctx.db.query("activityLog").collect()).filter((a) => a.userId === learner.profileId).length,
      tickets: (await ctx.db.query("tickets").collect()).map((x) => x.subject),
      post: await ctx.db.get(postId),
      cert: (await ctx.db.query("certificates").collect())[0],
      requests: (await ctx.db.query("privacyRequests").collect()).map((r) => r.kind).sort(),
      otherProfile: await ctx.db.get(other.profileId),
    }));
    expect(left.profile).toBeNull();
    expect(left.user).toBeNull();
    expect(left.accounts).toBe(0);
    expect(left.journal).toBe(0);
    expect(left.progress).toBe(0);
    expect(left.activity).toBe(0);
    expect(left.tickets).toEqual(["Other's ticket"]);
    expect(left.post).toMatchObject({ title: "[removed]", content: "[removed]", authorName: "Deleted user", status: "deleted" });
    expect(left.cert).toMatchObject({ serial: "MW-AAAAA-BBBBB", teacherName: "Deleted learner" }); // still verifiable, no longer names them
    expect(left.requests).toEqual(["erasure_completed", "erasure_requested"]);
    expect(left.otherProfile).not.toBeNull();
  });

  it("will not delete staff accounts or learners with a live paid plan", async () => {
    const t = newTest();
    const staffy = await makeLearner(t);
    await t.run(async (ctx) => { await ctx.db.insert("staff", { email: staffy.email, role: "viewer", status: "active", updatedAt: Date.now() }); });
    await expect(staffy.as.mutation(api.dataRights.deleteMine, { confirm: "DELETE" })).rejects.toThrow(/staff access/);

    const payer = await makeLearner(t);
    await t.run(async (ctx) => { await ctx.db.insert("subscriptions", { userId: payer.profileId, plan: "professional", status: "active", createdAt: Date.now(), updatedAt: Date.now() }); });
    await expect(payer.as.mutation(api.dataRights.deleteMine, { confirm: "DELETE" })).rejects.toThrow(/Cancel your paid plan/);
    await t.run(async (ctx) => { const s = (await ctx.db.query("subscriptions").first())!; await ctx.db.patch(s._id, { status: "canceled" }); });
    await expect(payer.as.mutation(api.dataRights.deleteMine, { confirm: "DELETE" })).resolves.toBeNull();
  });
});
