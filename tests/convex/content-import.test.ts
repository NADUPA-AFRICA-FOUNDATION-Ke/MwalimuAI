import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { buildTemplate, parseWorkbook, type ImportItem } from "../../lib/admin/content-sheets";
import { makeStaff, newTest, type T } from "./helpers";

const REASON = "Imported from spreadsheet";
const sheetsOf = (items: ImportItem[]) => buildTemplate("path", items).sheets.map((s) => ({ name: s.name, rows: s.rows.map((r) => r.map((c) => (c === null || c === undefined ? "" : String(c)))) }));
const tags = { cbcLevels: [], subjects: [], counties: [] };

function path(over: { reading?: string } = {}): ImportItem[] {
  const w = (kind: any, key: string, data: any, parent?: any): ImportItem => ({ kind, key, data, parent, label: "", where: "" });
  return [
    w("program", "inclusive-classrooms", { title: "Inclusive classrooms", shortTitle: "Inclusive", tagline: "", description: "How to teach every learner", track: "core", hours: 3, kicdAlignment: "", available: true, launchingSoon: false, shortCourse: false, assignment: { title: "Plan a lesson", context: "", task: "Write a plan", hints: ["Keep it short"], rubric: [] }, certificate: { subtitle: "Completed the path", skills: ["Inclusion"] }, tags }),
    w("module", "m1", { title: "Basics", description: "", orderIndex: 0 }, { kind: "program", key: "inclusive-classrooms" }),
    w("lesson", "l1", { title: "Why inclusion", duration: "10 min", videoTitle: "", videoPoints: [], reading: over.reading ?? "## Why\nReal text.", reflectionPrompt: "", reflectionPlaceholder: "", orderIndex: 0 }, { kind: "module", key: "m1" }),
    w("quiz", "pre", { kind: "pre", orderIndex: 0, questions: [{ id: "q1", question: "Which is right?", options: ["a", "b", "c", "d"], correct: 1, explanation: "b" }] }, { kind: "program", key: "inclusive-classrooms" }),
  ];
}
const bundle = (items: ImportItem[]) => {
  const parsed = parseWorkbook("path", sheetsOf(items));
  expect(parsed.problems.filter((p) => p.level === "error")).toEqual([]);
  return parsed.items.map(({ kind, key, parent, data }) => ({ kind, key, ...(parent ? { parent } : {}), data }));
};
type Staff = Awaited<ReturnType<typeof makeStaff>>;
const upload = (s: Staff, items: any[]) => s.as.mutation(api.admin.contentImport.apply, { items, reason: REASON, filename: "path.xlsx" });
const listItems = (s: Staff) => s.as.query(api.admin.content.itemsForProgram, { programKey: "inclusive-classrooms" });

describe("spreadsheet import", () => {
  it("creates a whole path as drafts, nothing live, and audits it once", async () => {
    const t = newTest();
    const author = await makeStaff(t, "content_manager");
    const r = await upload(author, bundle(path()));
    expect(r).toMatchObject({ created: 4, updated: 0, unchanged: 0, programKey: "inclusive-classrooms" });
    const items = await listItems(author);
    expect(items).toHaveLength(4);
    expect(items.every((i: any) => i.published === null && i.draft?.status === "draft")).toBe(true);
    const audit = await t.run(async (ctx) => (await ctx.db.query("auditLog").collect()).filter((a) => a.action === "content.import"));
    expect(audit).toHaveLength(1);
  });

  it("is safe to upload again: unchanged items are left alone, edits become one new draft", async () => {
    const t = newTest();
    const author = await makeStaff(t, "content_manager");
    await upload(author, bundle(path()));
    const again = await upload(author, bundle(path()));
    expect(again).toMatchObject({ created: 0, updated: 0, unchanged: 4 });
    const edited = await upload(author, bundle(path({ reading: "## Why\nBetter text." })));
    expect(edited).toMatchObject({ created: 0, updated: 1, unchanged: 3 });
    const lesson = (await listItems(author)).find((i: any) => i.kind === "lesson")!;
    const d = await author.as.query(api.admin.content.getItem, { itemId: lesson._id });
    expect((d.draft!.data as any).reading).toContain("Better text.");
  });

  it("previews what would happen without saving", async () => {
    const t = newTest();
    const author = await makeStaff(t, "content_manager");
    const p = await author.as.query(api.admin.contentImport.preview, { items: bundle(path()) });
    expect(p).toMatchObject({ created: 4, problems: [] });
    expect(await listItems(author).catch(() => [])).toHaveLength(0);
  });

  it("saves nothing when any item is invalid, and says which", async () => {
    const t = newTest();
    const author = await makeStaff(t, "content_manager");
    const items = bundle(path());
    (items.find((i) => i.kind === "lesson")!.data as any).title = "";
    const p = await author.as.query(api.admin.contentImport.preview, { items });
    expect(p.problems.length).toBeGreaterThan(0);
    await expect(upload(author, items)).rejects.toThrow(/Nothing was saved/);
    expect(await t.run((ctx) => ctx.db.query("cmsItems").collect())).toHaveLength(0);
  });

  it("will not overwrite a draft that is waiting for review, and changes nothing", async () => {
    const t = newTest();
    const author = await makeStaff(t, "content_manager");
    await upload(author, bundle(path()));
    await author.as.mutation(api.admin.contentBuilder.submitProgram, { programKey: "inclusive-classrooms" });
    await expect(upload(author, bundle(path({ reading: "## Why\nSneaky change." })))).rejects.toThrow(/Awaiting review/);
  });

  it("flows through review and publish like any other content", async () => {
    const t = newTest();
    const author = await makeStaff(t, "content_manager");
    const reviewer = await makeStaff(t, "super_admin");
    await upload(author, bundle(path()));
    const sub = await author.as.mutation(api.admin.contentBuilder.submitProgram, { programKey: "inclusive-classrooms" });
    expect(sub.skipped).toEqual([]);
    expect(sub.submitted).toBe(4);
    await reviewer.as.mutation(api.admin.contentBuilder.reviewProgram, { programKey: "inclusive-classrooms", decision: "approve", reason: "Looks right to me" });
    const pub = await reviewer.as.mutation(api.admin.contentBuilder.publishProgram, { programKey: "inclusive-classrooms", reason: "Ready for learners" });
    expect(pub.published).toBe(4);
    // Editing live content through a spreadsheet makes a new draft; learners keep seeing the live version.
    const r = await upload(author, bundle(path({ reading: "## Why\nUpdated live lesson." })));
    expect(r.updated).toBe(1);
    const lesson = (await listItems(author)).find((i: any) => i.kind === "lesson")!;
    expect(lesson.published).toMatchObject({ status: "published" });
    expect(lesson.draft).toMatchObject({ status: "draft" });
  });

  it("only editors can upload", async () => {
    const t = newTest();
    for (const role of ["viewer", "support_agent"] as const) {
      const s = await makeStaff(t, role);
      await expect(upload(s, bundle(path()))).rejects.toThrow();
    }
  });

  it("keeps files attached to resources and replaces the list, telling the editor what is removed", async () => {
    const t = newTest();
    const author = await makeStaff(t, "content_manager");
    const first: any[] = [{ kind: "resources", key: "resources", data: { title: "Resource library", items: [{ id: "r1", title: "Guide", description: "", type: "PDF", url: "", size: "", tags: [], free: true }, { id: "r2", title: "Other", description: "", type: "Link", url: "https://example.org/x", size: "", tags: [], free: true }] } }];
    await upload(author, first);
    const item = (await t.run((ctx) => ctx.db.query("cmsItems").collect()))[0];
    const storageId = await t.run((ctx) => ctx.storage.store(new Blob(["pdf"])));
    const draft = await author.as.query(api.admin.content.getItem, { itemId: item._id });
    const data = draft.draft!.data as any;
    data.items[0].file = { storageId, name: "guide.pdf" };
    await author.as.mutation(api.admin.content.saveDraft, { itemId: item._id, data });
    const fewer: any[] = [{ kind: "resources", key: "resources", data: { title: "Resource library", items: [{ id: "r1", title: "Guide (renamed)", description: "", type: "PDF", url: "", size: "", tags: [], free: true }] } }];
    const p = await author.as.query(api.admin.contentImport.preview, { items: fewer });
    expect(p.items[0].note).toMatch(/Replaces the current 2 resources with 1.*1 will be removed/);
    await upload(author, fewer);
    const after = await author.as.query(api.admin.content.getItem, { itemId: item._id });
    expect((after.draft!.data as any).items).toEqual([expect.objectContaining({ id: "r1", title: "Guide (renamed)", file: { storageId, name: "guide.pdf" } })]);
  });

  it("exports the working copy in upload shape, so download then upload round-trips as unchanged", async () => {
    const t = newTest();
    const author = await makeStaff(t, "content_manager");
    await upload(author, bundle(path()));
    const exported = await author.as.query(api.admin.contentImport.exportItems, { what: "path", key: "inclusive-classrooms" });
    expect(exported.map((e: any) => e.kind).sort()).toEqual(["lesson", "module", "program", "quiz"]);
    const again = await upload(author, bundle(exported.map((e: any) => ({ ...e, label: "", where: "" }))));
    expect(again).toMatchObject({ created: 0, updated: 0, unchanged: 4 });
  });
});
