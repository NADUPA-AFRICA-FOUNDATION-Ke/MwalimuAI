// @vitest-environment node
import { describe, expect, it } from "vitest";
import { csvCell } from "@/lib/admin/csv";

describe("CSV cells", () => {
  it("quotes values and neutralises spreadsheet formulas", () => {
    expect(csvCell('a, "b"')).toBe('"a, ""b"""');
    for (const f of ["=HYPERLINK(\"http://x\")", "+1", "-2+3", "@SUM(A1)", "\tcmd"]) expect(csvCell(f)).toBe(`"'${f.replace(/"/g, '""')}"`);
    expect(csvCell(-5)).toBe('"-5"');
    expect(csvCell(null)).toBe('""');
  });
});
