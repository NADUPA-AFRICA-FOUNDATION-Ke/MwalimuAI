// @vitest-environment node
import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { buildXlsx } from "@/lib/admin/xlsx";
import { readXlsx, type ReadSheet } from "@/lib/admin/xlsx-read";
import { buildExample, buildTemplate, parseWorkbook, TEMPLATES, type ImportItem, type TemplateKind } from "@/lib/admin/content-sheets";
import { PROGRAMS } from "@/lib/learning-paths-data";
import { FAQS } from "@/lib/faq-data";
import { NEEDS_FALLBACK, NEEDS_QUESTIONS, NEEDS_RULES, NEEDS_SECTIONS } from "@/lib/needs-assessment-data";

const roundTrip = async (kind: TemplateKind, existing: ImportItem[] | null) => {
  const { sheets } = buildTemplate(kind, existing);
  return parseWorkbook(kind, await readXlsx(buildXlsx(sheets)));
};
const errors = (r: { problems: { level: string; message: string }[] }) => r.problems.filter((p) => p.level === "error").map((p) => p.message);

function pathItems(): ImportItem[] {
  const p = PROGRAMS.find((x) => x.modules.length > 0 && x.preAssessment.length > 0)!;
  const { modules, preAssessment, postAssessment, id, lessons: _l, ...rest } = p as any;
  const items: ImportItem[] = [{ kind: "program", key: id, data: { ...rest, orderIndex: 0, tags: { cbcLevels: [], subjects: [], counties: [] } }, label: "p", where: "" }];
  items.push({ kind: "quiz", key: "pre", parent: { kind: "program", key: id }, data: { kind: "pre", questions: preAssessment, orderIndex: 0 }, label: "", where: "" });
  if (postAssessment.length) items.push({ kind: "quiz", key: "post", parent: { kind: "program", key: id }, data: { kind: "post", questions: postAssessment, orderIndex: 1 }, label: "", where: "" });
  modules.forEach((m: any, mi: number) => {
    items.push({ kind: "module", key: m.id, parent: { kind: "program", key: id }, data: { title: m.title, description: m.description, orderIndex: mi }, label: "", where: "" });
    m.lessons.forEach(({ id: lk, ...l }: any, li: number) => items.push({ kind: "lesson", key: lk, parent: { kind: "module", key: m.id }, data: { ...l, orderIndex: li }, label: "", where: "" }));
  });
  return items;
}

describe("blank templates", () => {
  for (const kind of Object.keys(TEMPLATES) as TemplateKind[])
    it(`${kind} template is a readable workbook with instructions and ignores its example rows`, async () => {
      const { filename, sheets } = buildTemplate(kind);
      expect(filename).toMatch(/-template\.xlsx$/);
      const read = await readXlsx(buildXlsx(sheets));
      expect(read[0].name).toBe("Start here");
      expect(read.length).toBeGreaterThan(1);
      const parsed = parseWorkbook(kind, read);
      // Nothing real has been entered, so there is nothing to import and the editor is told what is missing.
      expect(parsed.items.filter((i) => i.kind !== "program" && i.kind !== "assessment" && i.kind !== "resources" && i.kind !== "faq")).toHaveLength(0);
      expect(errors(parsed).length).toBeGreaterThan(0);
    });
});

describe("learning path round trip", () => {
  it("re-reads an exported path exactly: content, order and question ids survive", async () => {
    const items = pathItems();
    const parsed = await roundTrip("path", items);
    expect(errors(parsed)).toEqual([]);
    const before = (k: string) => items.filter((i) => i.kind === k);
    const after = (k: string) => parsed.items.filter((i) => i.kind === k);
    expect(after("module").map((m) => [m.key, m.data.title, m.data.orderIndex])).toEqual(before("module").map((m) => [m.key, m.data.title, m.data.orderIndex]));
    expect(after("lesson").map((l) => [l.parent!.key, l.key, l.data.title, l.data.reading.trim(), l.data.videoPoints])).toEqual(
      before("lesson").map((l) => [l.parent!.key, l.key, l.data.title, l.data.reading.trim(), l.data.videoPoints]),
    );
    const q = (arr: ImportItem[]) => arr.map((x) => [x.data.kind, x.data.questions.map((qq: any) => [qq.id, qq.question, qq.options, qq.correct])]);
    expect(q(after("quiz"))).toEqual(q(before("quiz")));
    const prog = parsed.items.find((i) => i.kind === "program")!;
    expect(prog.key).toBe(items[0].key);
    expect(prog.data.track).toBe(items[0].data.track);
    expect(prog.data.assignment.hints).toEqual(items[0].data.assignment.hints);
  });

  it("carries Kiswahili through a round trip", async () => {
    const items = pathItems();
    const lesson = items.find((i) => i.kind === "lesson")!;
    lesson.data.sw = { title: "Kichwa", videoTitle: "", videoPoints: ["Hoja moja"], reading: "## Habari", reflectionPrompt: "Swali?", reflectionPlaceholder: "" };
    const quiz = items.find((i) => i.kind === "quiz")!;
    quiz.data.sw = { questions: quiz.data.questions.map((_: any, i: number) => ({ question: `Swali ${i + 1}`, options: ["a", "b", "c", "d"], explanation: "" })) };
    const parsed = await roundTrip("path", items);
    expect(errors(parsed)).toEqual([]);
    expect(parsed.items.find((i) => i.kind === "lesson")!.data.sw).toMatchObject({ title: "Kichwa", videoPoints: ["Hoja moja"], reading: "## Habari" });
    expect(parsed.items.find((i) => i.kind === "quiz")!.data.sw.questions[0].question).toBe("Swali 1");
  });

  it("explains mistakes by sheet and row", async () => {
    const { sheets } = buildTemplate("path", pathItems());
    const lessons = sheets.find((s) => s.name === "Lessons")!;
    lessons.rows[1][0] = "no-such-module";
    lessons.rows[2][6] = ""; // reading
    const quizzes = sheets.find((s) => s.name === "Quizzes")!;
    quizzes.rows[1][6] = "Z";
    quizzes.rows[2][4] = "";
    const parsed = parseWorkbook("path", await readXlsx(buildXlsx(sheets)));
    const msgs = parsed.problems.map((p) => `${p.where}: ${p.message}`).join("\n");
    expect(msgs).toContain("Lessons sheet, row 2: The module");
    expect(msgs).toContain("Lessons sheet, row 3: This lesson needs its Reading");
    expect(msgs).toContain("Quizzes sheet, row 2: Correct answer");
    expect(msgs).toContain("not on the Modules sheet");
    expect(msgs).toContain("Reading text");
    expect(msgs).toMatch(/Correct answer must be A, B, C or D/);
    expect(msgs).toMatch(/all four options/);
  });

  it("says plainly when a sheet or column is missing", async () => {
    const { sheets } = buildTemplate("path", pathItems());
    const parsed = parseWorkbook("path", await readXlsx(buildXlsx(sheets.filter((s) => s.name !== "Lessons"))));
    expect(errors(parsed).join(" ")).toContain("“Lessons” sheet is missing");
    const noCol = buildTemplate("path", pathItems()).sheets;
    noCol.find((s) => s.name === "Modules")!.rows[0][1] = "Name";
    expect(errors(parseWorkbook("path", await readXlsx(buildXlsx(noCol)))).join(" ")).toContain("missing the column");
  });

  it("ignores note rows, accepts bullets and numbers for lists, and generates ids for new rows", async () => {
    const { sheets } = buildTemplate("path", pathItems());
    const modules = sheets.find((s) => s.name === "Modules")!;
    modules.rows.push(["# note", "ignored", "", "", ""], ["", "A brand new module", "", "", ""]);
    const lessons = sheets.find((s) => s.name === "Lessons")!;
    const newModuleKey = `m${modules.rows.length - 2}`;
    lessons.rows.push([newModuleKey, "", "New lesson", "", "", "- one\n• two\n3. three", "Body", "", "", "", "", "", "", "", ""]);
    const parsed = parseWorkbook("path", await readXlsx(buildXlsx(sheets)));
    expect(errors(parsed)).toEqual([]);
    const lesson = parsed.items.find((i) => i.kind === "lesson" && i.data.title === "New lesson")!;
    expect(lesson.data.videoPoints).toEqual(["one", "two", "three"]);
    expect(lesson.data.duration).toBe("10 min");
    expect(lesson.key).toBe("l1");
  });
});

describe("other content", () => {
  it("round-trips the FAQ", async () => {
    const items: ImportItem[] = [{ kind: "faq", key: "faq", data: { title: "FAQ", sections: FAQS.map((s) => ({ title: s.category, items: s.questions })) }, label: "", where: "" }];
    const parsed = await roundTrip("faq", items);
    expect(errors(parsed)).toEqual([]);
    expect(parsed.items[0].data.sections).toEqual(items[0].data.sections);
  });

  it("round-trips the needs assessment, including rules", async () => {
    const questions = NEEDS_QUESTIONS.map((q: any) => ({ ...q, section: q.sectionIndex, subtext: q.subtext ?? "", options: q.type === "scale" ? [] : q.options }));
    const data = { title: "Needs", intro: "Hello", sections: NEEDS_SECTIONS, questions, rules: NEEDS_RULES, fallbackProgramIds: NEEDS_FALLBACK };
    const parsed = await roundTrip("needs", [{ kind: "assessment", key: "needs-assessment", data, label: "", where: "" }]);
    expect(errors(parsed)).toEqual([]);
    const back = parsed.items[0].data;
    const shape = (q: any) => [q.id, q.type, q.section ?? q.sectionIndex, q.options ?? [], q.type === "knowledge" ? q.correctIndex : 0];
    expect(back.questions.map(shape)).toEqual(NEEDS_QUESTIONS.map((q: any) => shape({ ...q, options: q.type === "scale" ? [] : q.options })));
    expect(back.rules).toEqual(NEEDS_RULES);
    expect(back.fallbackProgramIds).toEqual(NEEDS_FALLBACK);
  });

  it("reads posts, makes slugs, and turns bare numbers into text", async () => {
    const { sheets } = buildTemplate("posts");
    sheets[1].rows.push(["", "Five ways to check understanding", "Short summary.", "x".repeat(300), "Jane", "Teacher", "Assessment", 5, ""]);
    const parsed = parseWorkbook("posts", await readXlsx(buildXlsx(sheets)));
    expect(errors(parsed)).toEqual([]);
    expect(parsed.items[0]).toMatchObject({ key: "five-ways-to-check-understanding" });
    expect(parsed.items[0].data.readTime).toBe("5 min read");
  });

  it("validates resources: link and type", async () => {
    const { sheets } = buildTemplate("resources");
    sheets[1].rows.push(["", "Guide", "", "PDF", "http://insecure.example", "", "a, b", "yes"], ["", "Other", "", "Poster", "", "", "", ""]);
    const msgs = errors(parseWorkbook("resources", await readXlsx(buildXlsx(sheets)))).join("\n");
    expect(msgs).toContain("must start with https://");
    expect(msgs).toContain("Type must be one of");
  });

  it("warns, but does not block, when a draft cannot be published yet", async () => {
    const { sheets } = buildTemplate("posts");
    sheets[1].rows.push(["", "Short post", "", "Too short", "", "", "", "", ""]);
    const parsed = parseWorkbook("posts", await readXlsx(buildXlsx(sheets)));
    expect(errors(parsed)).toEqual([]);
    expect(parsed.problems.some((p) => p.level === "warning")).toBe(true);
  });
});

describe("workbook reader", () => {
  const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  const crc = (d: Buffer) => {
    let c = 0xffffffff;
    for (const b of d) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  /** A deflated zip with shared strings, the way Excel saves, rather than the stored/inline form our writer uses. */
  function excelStyle(): Uint8Array {
    const files: Record<string, string> = {
      "[Content_Types].xml": "<Types/>",
      "xl/workbook.xml": '<workbook xmlns:r="x"><sheets><sheet name="Data &amp; more" sheetId="1" r:id="rId1"/></sheets></workbook>',
      "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId1" Type="t" Target="worksheets/sheet1.xml"/></Relationships>',
      "xl/sharedStrings.xml": '<sst><si><t>Name</t></si><si><r><t>Rich </t></r><r><t xml:space="preserve">text &amp; &lt;b&gt;</t></r></si><si><t>Line1&#10;Line2</t></si></sst>',
      "xl/worksheets/sheet1.xml":
        '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row><row r="3"><c r="B3"><v>12.5</v></c><c r="C3" t="s"><v>2</v></c><c r="D3" t="b"><v>1</v></c></row></sheetData></worksheet>',
    };
    const parts: Buffer[] = [];
    const central: Buffer[] = [];
    let offset = 0;
    for (const [name, text] of Object.entries(files)) {
      const raw = Buffer.from(text);
      const comp = deflateRawSync(raw);
      const n = Buffer.from(name);
      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8);
      local.writeUInt32LE(crc(raw), 14); local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(n.length, 26);
      const cd = Buffer.alloc(46);
      cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(8, 10);
      cd.writeUInt32LE(crc(raw), 16); cd.writeUInt32LE(comp.length, 20); cd.writeUInt32LE(raw.length, 24); cd.writeUInt16LE(n.length, 28); cd.writeUInt32LE(offset, 42);
      parts.push(local, n, comp);
      central.push(Buffer.concat([cd, n]));
      offset += 30 + n.length + comp.length;
    }
    const cdBuf = Buffer.concat(central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(central.length, 8); end.writeUInt16LE(central.length, 10);
    end.writeUInt32LE(cdBuf.length, 12); end.writeUInt32LE(offset, 16);
    return new Uint8Array(Buffer.concat([...parts, cdBuf, end]));
  }

  it("reads deflated parts, shared and rich-text strings, numbers, booleans and gaps", async () => {
    const sheets: ReadSheet[] = await readXlsx(excelStyle());
    expect(sheets).toHaveLength(1);
    expect(sheets[0].name).toBe("Data & more");
    expect(sheets[0].rows[0]).toEqual(["Name", "", "Rich text & <b>"]);
    expect(sheets[0].rows[1] ?? []).toEqual([]);
    expect(sheets[0].rows[2]).toEqual(["", "12.5", "Line1\nLine2", "Yes"]);
  });

  it("rejects files that are not workbooks", async () => {
    await expect(readXlsx(new TextEncoder().encode("name,title\na,b"))).rejects.toThrow(/not an Excel workbook/);
  });
});

describe("keeping it simple for first-time editors", () => {
  const read = async (sheets: any) => parseWorkbook("path", await readXlsx(buildXlsx(sheets)));

  it("leaves the Kiswahili columns out unless asked, so the sheets stay short", () => {
    const plain = buildTemplate("path");
    expect(plain.sheets.find((s) => s.name === "Lessons")!.rows[0]).toHaveLength(9);
    expect(plain.sheets.flatMap((s) => s.rows[0]).some((h) => /kiswahili/i.test(String(h)))).toBe(false);
    const sw = buildTemplate("path", null, { kiswahili: true });
    expect(sw.filename).toContain("with-kiswahili");
    expect(sw.sheets.find((s) => s.name === "Lessons")!.rows[0]).toHaveLength(15);
  });

  it("does not wipe existing translations when the file has no Kiswahili columns", async () => {
    const items = pathItems();
    items.find((i) => i.kind === "lesson")!.data.sw = { title: "Kichwa", videoTitle: "", videoPoints: [], reading: "Habari", reflectionPrompt: "", reflectionPlaceholder: "" };
    const { sheets } = buildTemplate("path", items, { kiswahili: false });
    const parsed = await read(sheets);
    for (const i of parsed.items) expect("sw" in i.data).toBe(false);
  });

  it("lets a lesson name its module by title instead of ID", async () => {
    const { sheets } = buildTemplate("path", pathItems());
    const mods = sheets.find((s) => s.name === "Modules")!;
    const lessons = sheets.find((s) => s.name === "Lessons")!;
    const first = String(mods.rows[1][1]);
    lessons.rows[1][0] = first.toUpperCase();
    const parsed = await read(sheets);
    expect(errors(parsed)).toEqual([]);
    expect(parsed.items.find((i) => i.kind === "lesson")!.parent!.key).toBe(String(mods.rows[1][0]));
  });

  for (const kind of Object.keys(TEMPLATES) as TemplateKind[])
    it(`the ${kind} example opens cleanly: no errors and nothing left to fix before publishing`, async () => {
      const { filename, sheets } = buildExample(kind);
      expect(filename).toMatch(/-example\.xlsx$/);
      const parsed = parseWorkbook(kind, await readXlsx(buildXlsx(sheets)));
      expect(parsed.problems).toEqual([]);
      expect(parsed.items.length).toBeGreaterThan(0);
    });
});
