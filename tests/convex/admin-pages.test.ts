import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { makeLearner, makeStaff, newTest } from "./helpers";
import { blogPosts } from "../../lib/blog-data";

const REASON = "Reviewed the wording, good to publish";

describe("resource library, FAQ and blog under management", () => {
  it("brings the built-in content under management unchanged, and serves it publicly", async () => {
    const t = newTest();
    const manager = await makeStaff(t, "content_manager");
    expect(await t.query(api.content.faq, {})).toBeNull();
    expect(await t.query(api.content.blogPosts, {})).toEqual([]);

    await manager.as.mutation(api.admin.content.importBuiltIn, { what: "faq" });
    await manager.as.mutation(api.admin.content.importBuiltIn, { what: "resources" });
    const posts = await manager.as.mutation(api.admin.content.importBuiltIn, { what: "posts" });
    expect(posts.created).toBe(blogPosts.length);
    await expect(manager.as.mutation(api.admin.content.importBuiltIn, { what: "faq" })).rejects.toThrow(/already/);

    const faq = await t.query(api.content.faq, {});
    expect(faq?.[0].category).toBe("Getting Started");
    const list = await t.query(api.content.blogPosts, {});
    expect(list).toHaveLength(blogPosts.length);
    const one = await t.query(api.content.blogPost, { slug: blogPosts[0].slug });
    expect(one?.content).toContain("Core Competencies");
    expect(await t.query(api.content.blogPost, { slug: "nope" })).toBeNull();
  });

  it("gates paid downloads on the server: free links open, Pro files stay locked until subscribed", async () => {
    const t = newTest();
    const author = await makeStaff(t, "content_manager");
    const reviewer = await makeStaff(t, "super_admin");
    const item = (id: string, title: string, url: string, free: boolean) => ({ id, title, description: "", type: "Link", url, size: "", tags: [], free });
    const rid = await author.as.mutation(api.admin.content.createItem, {
      kind: "resources",
      key: "resources",
      data: { title: "Resource library", orderIndex: 0, items: [item("r1", "Open guide", "https://example.org/guide", true), item("r2", "Subscriber toolkit", "https://example.org/toolkit", false)] },
    });
    await author.as.mutation(api.admin.content.submitForReview, { itemId: rid });
    await reviewer.as.mutation(api.admin.content.review, { itemId: rid, decision: "approve", reason: "Links checked and working" });
    await reviewer.as.mutation(api.admin.content.publish, { itemId: rid, reason: "Ready for learners" });
    const free = await makeLearner(t);
    const paying = await makeLearner(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("subscriptions", { userId: paying.profileId, plan: "professional", status: "active", createdAt: Date.now(), updatedAt: Date.now() });
    });

    const forFree = (await free.as.query(api.content.resources, {}))!;
    const guide = forFree.find((r) => r.title === "Open guide")!;
    expect(guide).toMatchObject({ locked: false, url: expect.stringContaining("https://") });
    const pro = forFree.find((r) => !r.free)!;
    expect(pro).toMatchObject({ locked: true, url: null });
    // A subscriber is no longer locked out of the same item.
    const forPaying = (await paying.as.query(api.content.resources, {}))!;
    expect(forPaying.find((r) => r.id === pro.id)?.locked).toBe(false);
  });

  it("lets staff write a post: blank drafts save, incomplete ones cannot be submitted, a finished one goes live", async () => {
    const t = newTest();
    const author = await makeStaff(t, "content_manager");
    const reviewer = await makeStaff(t, "super_admin");
    const id = await author.as.mutation(api.admin.content.createItem, {
      kind: "post",
      key: "teaching-large-classes",
      data: { title: "Teaching large classes", excerpt: "", content: "", author: "", authorRole: "", category: "", readTime: "", date: "", image: "", orderIndex: 0 },
    });
    await expect(author.as.mutation(api.admin.content.submitForReview, { itemId: id })).rejects.toThrow(/summary/);
    const body = "## Start small\n" + "Group learners in fives and rotate the roles. ".repeat(10);
    await author.as.mutation(api.admin.content.saveDraft, {
      itemId: id,
      data: { title: "Teaching large classes", excerpt: "Practical ideas", content: body, author: "Wanjiru M.", authorRole: "Teacher", category: "Pedagogy", readTime: "4 min read", date: "October 5, 2026", image: "", orderIndex: 100 },
    });
    await author.as.mutation(api.admin.content.submitForReview, { itemId: id });
    await reviewer.as.mutation(api.admin.content.review, { itemId: id, decision: "approve", reason: REASON });
    await reviewer.as.mutation(api.admin.content.publish, { itemId: id, reason: REASON });
    expect((await t.query(api.content.blogPost, { slug: "teaching-large-classes" }))?.title).toBe("Teaching large classes");
  });
});

describe("announcements", () => {
  it("reach the right learners by county or level, and stop when cancelled", async () => {
    const t = newTest();
    const manager = await makeStaff(t, "content_manager");
    const support = await makeStaff(t, "support_agent");
    const nakuru = await makeLearner(t, { county: "Nakuru", grades: ["Grade 4"] });
    const kisumu = await makeLearner(t, { county: "Kisumu", grades: ["Grade 8"] });

    await expect(support.as.mutation(api.admin.announcements.send, { title: "Hi there", body: "Hello all", all: true, counties: [], levels: [] })).rejects.toThrow(/FORBIDDEN/);
    await expect(manager.as.mutation(api.admin.announcements.send, { title: "Hi there", body: "Hello all", all: false, counties: [], levels: [] })).rejects.toThrow(/Choose who/);

    await manager.as.mutation(api.admin.announcements.send, { title: "Nakuru workshop", body: "Join us on Saturday", all: false, counties: ["Nakuru"], levels: [] });
    await manager.as.mutation(api.admin.announcements.send, { title: "Junior secondary update", body: "New guidance is out", all: false, counties: [], levels: ["Grade 8"], link: "/dashboard/learning" });
    const everyone = await manager.as.mutation(api.admin.announcements.send, { title: "Platform news", body: "We added new lessons", all: true, counties: [], levels: [] });

    expect((await nakuru.as.query(api.announcements.listMine, {})).map((a) => a.title).sort()).toEqual(["Nakuru workshop", "Platform news"]);
    expect((await kisumu.as.query(api.announcements.listMine, {})).map((a) => a.title).sort()).toEqual(["Junior secondary update", "Platform news"]);

    await manager.as.mutation(api.admin.announcements.cancel, { announcementId: everyone, reason: "Sent by mistake" });
    expect((await nakuru.as.query(api.announcements.listMine, {})).map((a) => a.title)).toEqual(["Nakuru workshop"]);
    expect((await manager.as.query(api.admin.announcements.list, {})).find((a) => a._id === everyone)?.state).toBe("cancelled");
  });
});
