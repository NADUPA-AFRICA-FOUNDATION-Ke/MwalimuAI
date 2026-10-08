// @vitest-environment node
import { describe, expect, it } from "vitest";
import { filterPrograms } from "@/lib/admin/analytics-filter";

const P = (id: string, title: string, enrolled: number, completionRate: number, completed: number, lessons: [string, string][]) => ({
  id, title, enrolled, completionRate, completed,
  funnel: lessons.map(([module, t], i) => ({ key: `${id}/${i}`, title: t, module })),
});

const programs = [
  P("a", "CBC Foundations", 40, 50, 20, [["Basics", "What is CBC"], ["Assessment", "Writing rubrics"]]),
  P("b", "Digital Literacy", 10, 10, 1, [["Devices", "Using a tablet"]]),
  P("c", "Pédagogie active", 0, 0, 0, [["Intro", "Group work"]]),
];
const ids = (r: ReturnType<typeof filterPrograms>) => r.map((x) => x.program.id);

describe("analytics program filter", () => {
  it("returns everything sorted by title with no query", () => {
    expect(ids(filterPrograms(programs, {}))).toEqual(["a", "b", "c"]);
    expect(filterPrograms(programs, {})[0].lessonMatches).toBeNull();
  });
  it("matches program titles case- and accent-insensitively", () => {
    expect(ids(filterPrograms(programs, { query: "pedagogie" }))).toEqual(["c"]);
    expect(ids(filterPrograms(programs, { query: "  digital " }))).toEqual(["b"]);
  });
  it("matches lessons and modules, reporting which lessons matched", () => {
    const r = filterPrograms(programs, { query: "rubric" });
    expect(ids(r)).toEqual(["a"]);
    expect([...r[0].lessonMatches!]).toEqual(["a/1"]);
    expect([...filterPrograms(programs, { query: "devices" })[0].lessonMatches!]).toEqual(["b/0"]);
  });
  it("filters by status", () => {
    expect(ids(filterPrograms(programs, { filter: "started" }))).toEqual(["a", "b"]);
    expect(ids(filterPrograms(programs, { filter: "not_started" }))).toEqual(["c"]);
    expect(ids(filterPrograms(programs, { filter: "low_completion" }))).toEqual(["b"]);
    expect(ids(filterPrograms(programs, { filter: "has_certificates" }))).toEqual(["a", "b"]);
  });
  it("combines filter, query and sort", () => {
    expect(ids(filterPrograms(programs, { sort: "enrolled" }))).toEqual(["a", "b", "c"]);
    expect(ids(filterPrograms(programs, { sort: "completion", filter: "started" }))).toEqual(["a", "b"]);
    expect(filterPrograms(programs, { query: "tablet", filter: "not_started" })).toEqual([]);
    expect(filterPrograms(programs, { query: "zzz" })).toEqual([]);
  });
});
