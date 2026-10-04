// @vitest-environment node
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildXlsx, crc32 } from "@/lib/admin/xlsx";

describe("xlsx writer", () => {
  it("produces a valid stored zip with the expected parts and escaped text", () => {
    const bytes = buildXlsx([
      { name: "Summary", rows: [["Program", "Rate %"], ["CBC <Foundations> & more", 42.5], ["=SUM(A1)", null]] },
      { name: "Bad/Name:*?", rows: [["a"]] },
    ]);
    // Local file header signature
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    // End of central directory: entry count = 4 fixed parts + styles + 2 sheets = 7
    const eocd = bytes.length - 22;
    expect(dv.getUint32(eocd, true)).toBe(0x06054b50);
    expect(dv.getUint16(eocd + 10, true)).toBe(7);

    // Walk the central directory and verify every entry's CRC against its data.
    let p = dv.getUint32(eocd + 16, true);
    const names: string[] = [];
    let sheet1 = "";
    for (let i = 0; i < 7; i++) {
      const crc = dv.getUint32(p + 16, true), size = dv.getUint32(p + 20, true);
      const nameLen = dv.getUint16(p + 28, true), off = dv.getUint32(p + 42, true);
      const name = new TextDecoder().decode(bytes.slice(p + 46, p + 46 + nameLen));
      const dataStart = off + 30 + dv.getUint16(off + 26, true);
      const data = bytes.slice(dataStart, dataStart + size);
      expect(crc32(data)).toBe(crc);
      names.push(name);
      if (name === "xl/worksheets/sheet1.xml") sheet1 = new TextDecoder().decode(data);
      p += 46 + nameLen;
    }
    expect(names).toContain("xl/workbook.xml");
    expect(sheet1).toContain("CBC &lt;Foundations&gt; &amp; more");
    expect(sheet1).toContain("<v>42.5</v>");
    // A leading "=" stays a text cell, never a formula.
    expect(sheet1).toMatch(/t="inlineStr"[^>]*><is><t[^>]*>=SUM\(A1\)/);
    expect(sheet1).not.toContain("<f>");
    if (process.env.XLSX_OUT) writeFileSync(process.env.XLSX_OUT, bytes);
  });
});
