import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { makeLearner, makeStaff, newTest } from "./helpers";

const REASON = "Contains a phone number and is off topic";

describe("community moderation", () => {
  it("reports reach staff grouped, hiding removes the post for learners and tells the author, restoring brings it back", async () => {
    const t = newTest();
    const author = await makeLearner(t, { name: "Wanjiru" });
    const a = await makeLearner(t);
    const b = await makeLearner(t);
    const agent = await makeStaff(t, "support_agent");

    const postId = await author.as.mutation(api.community.createPost, { title: "Call me", content: "My number is 0700 000 000", category: "Resources" });
    await a.as.mutation(api.community.report, { postId, reason: "personal_info" });
    await a.as.mutation(api.community.report, { postId, reason: "personal_info" }); // same person again: no duplicate
    await b.as.mutation(api.community.report, { postId, reason: "spam", note: "Looks like an advert" });
    await expect(author.as.mutation(api.community.report, { postId, reason: "spam" })).rejects.toThrow(/own post/);

    const queue = await agent.as.query(api.admin.community.reports, {});
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ kind: "post", count: 2, title: "Call me" });
    expect(queue[0].reasons.sort()).toEqual(["personal_info", "spam"]);

    await agent.as.mutation(api.admin.community.hidePost, { postId, reason: REASON });
    expect((await a.as.query(api.community.listPosts, {})).map((p) => p._id)).not.toContain(postId);
    expect(await agent.as.query(api.admin.community.reports, {})).toHaveLength(0);
    const notes = await author.as.query(api.notifications.listMine, {});
    expect(notes[0].title).toMatch(/post of yours was hidden/i);
    const hidden = await agent.as.query(api.admin.community.posts, { status: "hidden", paginationOpts: { numItems: 10, cursor: null } });
    expect(hidden.page[0]).toMatchObject({ _id: postId, moderationReason: REASON });

    await agent.as.mutation(api.admin.community.restorePost, { postId, reason: "Reviewed: number removed by author" });
    expect((await a.as.query(api.community.listPosts, {})).map((p) => p._id)).toContain(postId);
  });

  it("hides a single reply without touching the post, and dismissed reports leave content alone", async () => {
    const t = newTest();
    const author = await makeLearner(t);
    const replier = await makeLearner(t);
    const reader = await makeLearner(t);
    const agent = await makeStaff(t, "support_agent");
    const postId = await author.as.mutation(api.community.createPost, { title: "Question", content: "How do I plan?", category: "Ask a Question" });
    const replyId = await replier.as.mutation(api.community.addComment, { postId, body: "Rude reply" });
    await replier.as.mutation(api.community.addComment, { postId, body: "A kind reply" });
    await reader.as.mutation(api.community.report, { postId, commentId: replyId, reason: "abusive" });

    await agent.as.mutation(api.admin.community.hideComment, { commentId: replyId, reason: REASON });
    expect((await reader.as.query(api.community.comments, { postId })).map((c) => c.body)).toEqual(["A kind reply"]);
    expect((await reader.as.query(api.community.listPosts, {})).map((p) => p._id)).toContain(postId);

    await reader.as.mutation(api.community.report, { postId, reason: "other" });
    await agent.as.mutation(api.admin.community.dismiss, { postId, reason: "Checked, it is fine" });
    expect((await reader.as.query(api.community.listPosts, {})).map((p) => p._id)).toContain(postId);
    expect(await agent.as.query(api.admin.community.reports, {})).toHaveLength(0);
  });

  it("is members-only, role-gated and rate limited", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const content = await makeStaff(t, "content_manager");
    await expect(t.query(api.community.listPosts, {})).rejects.toThrow(/UNAUTHENTICATED/);
    await expect(content.as.query(api.admin.community.reports, {})).rejects.toThrow(/FORBIDDEN/);
    for (let i = 0; i < 20; i++) await learner.as.mutation(api.community.createPost, { title: `T${i}`, content: "x", category: "Pedagogy" });
    await expect(learner.as.mutation(api.community.createPost, { title: "One more", content: "x", category: "Pedagogy" })).rejects.toThrow(/quickly/);
    await expect(learner.as.mutation(api.community.createPost, { title: " ", content: "x", category: "Pedagogy" })).rejects.toThrow();
  });
});

describe("error reporting", () => {
  it("groups repeats, scrubs identifying text, reopens on regression and stays bounded", async () => {
    const t = newTest();
    const admin = await makeStaff(t, "super_admin");
    const viewer = await makeStaff(t, "viewer");
    const report = (message: string, stack?: string) => t.mutation(api.errors.report, { source: "browser", message, stack, route: "/dashboard/lesson?token=abc123" });

    await report("Cannot read properties of undefined (reading 'x') for jane@school.ke", "Error\n    at Lesson (app.js:10:5)");
    await report("Cannot read properties of undefined (reading 'x') for joe@other.ke", "Error\n    at Lesson (app.js:99:1)"); // same cause, different person and line numbers
    const list = await viewer.as.query(api.admin.errors.list, {});
    expect(list).toHaveLength(1);
    expect(list[0].count).toBe(2);
    expect(list[0].message).not.toMatch(/@school\.ke/);
    expect(list[0].route).toBe("/dashboard/lesson");

    await expect(viewer.as.mutation(api.admin.errors.resolve, { errorId: list[0]._id })).rejects.toThrow(/FORBIDDEN/);
    await admin.as.mutation(api.admin.errors.resolve, { errorId: list[0]._id });
    expect(await viewer.as.query(api.admin.errors.list, {})).toHaveLength(0);
    await report("Cannot read properties of undefined (reading 'x') for a@b.ke", "Error\n    at Lesson (app.js:1:1)");
    expect(await viewer.as.query(api.admin.errors.list, {})).toHaveLength(1); // came back, so it reopened

    for (let i = 0; i < 210; i++) await t.mutation(api.errors.report, { source: "server", message: `Distinct failure kind ${"x".repeat(i % 50)}${String.fromCharCode(65 + (i % 26))}${i > 25 ? "z".repeat(Math.floor(i / 26)) : ""}` });
    const stored = await t.run(async (ctx) => (await ctx.db.query("clientErrors").collect()).length);
    expect(stored).toBeLessThanOrEqual(201);
    expect(await t.query(api.errors.ping, {})).toMatchObject({ ok: true });
  });
});
