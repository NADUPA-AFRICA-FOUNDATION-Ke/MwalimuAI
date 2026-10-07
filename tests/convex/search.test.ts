import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { fuzzyScore } from "../../convex/lib/fuzzy";
import { makeLearner, newTest } from "./helpers";

describe("typo-tolerant matching", () => {
  it("matches exact, prefix and misspelt words, and rejects unrelated text", () => {
    expect(fuzzyScore("rubric", "Designing a CBC rubric")).toBeGreaterThan(0);
    expect(fuzzyScore("rubr", "Designing a CBC rubric")).toBeGreaterThan(0);
    expect(fuzzyScore("rubrik", "Designing a CBC rubric")).toBeGreaterThan(0);
    expect(fuzzyScore("asessment", "Formative assessment for learning")).toBeGreaterThan(0);
    expect(fuzzyScore("tathmini", "Tathmini ya wanafunzi")).toBeGreaterThan(0);
    expect(fuzzyScore("rubric", "Classroom management tips")).toBe(0);
    expect(fuzzyScore("rubric zebra", "Designing a CBC rubric")).toBe(0); // every word must match
    expect(fuzzyScore("cbc rubric", "cbc rubric")).toBeGreaterThan(fuzzyScore("rubric", "cbc rubric"));
  });
});

describe("global search permissions", () => {
  it("returns only active posts and the caller's own journal and tickets", async () => {
    const t = newTest();
    const me = await makeLearner(t, { name: "Me" });
    const other = await makeLearner(t, { name: "Other" });
    await me.as.mutation(api.community.createPost, { title: "Rubric ideas for fractions", content: "Share yours", category: "Assessment" });
    const hiddenId = await other.as.mutation(api.community.createPost, { title: "Rubric secrets", content: "hidden", category: "Assessment" });
    await t.run((ctx) => ctx.db.patch(hiddenId, { status: "hidden" }));
    await other.as.mutation(api.journal.save, { clientId: "j1", entryDate: "2026-10-01", title: "Rubric reflection", content: "Private thoughts about rubrics", mood: 3 });
    await me.as.mutation(api.journal.save, { clientId: "j2", entryDate: "2026-10-01", title: "My rubric diary", content: "Mine", mood: 3 });
    await other.as.mutation(api.tickets.create, { category: "other", subject: "Rubric page broken", body: "It does not load" });

    const r = await me.as.query(api.search.global, { q: "rubrik" });
    expect(r.community.map((h) => h.title)).toEqual(["Rubric ideas for fractions"]);
    expect(r.journal.map((h) => h.title)).toEqual(["My rubric diary"]);
    expect(r.tickets).toEqual([]);
    await expect(newTest().query(api.search.global, { q: "rubric" })).rejects.toThrow();
  });
});
