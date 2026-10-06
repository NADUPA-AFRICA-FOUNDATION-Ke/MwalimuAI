// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { eatDate, eatDateTime, toSafeText } from "@/lib/pdf/brand";

/** Runs a generator with jsPDF's save() captured, and returns the raw PDF text. */
async function capture(run: () => Promise<void>): Promise<string> {
  const real = await vi.importActual<typeof import("jspdf")>("jspdf");
  let out = "";
  class Capturing extends (real.jsPDF as any) {
    constructor(...a: any[]) { super(...a); (this as any).save = () => { out = (this as any).output(); return this; }; }
  }
  vi.resetModules();
  vi.doMock("jspdf", () => ({ ...real, jsPDF: Capturing, default: Capturing }));
  await run();
  vi.doUnmock("jspdf");
  return out;
}

const table = ["| Level | Descriptor | Score |", "|---|---|---|", ...Array.from({ length: 40 }, (_, i) => `| Row ${i} | A descriptor long enough to wrap onto a second line inside its column, every time | ${i} |`)].join("\n");

describe("PDF documents", () => {
  it("embed the brand fonts, keep Kiswahili and symbols, number pages, and repeat table headers", async () => {
    const { printPDF } = await import("@/lib/print-pdf");
    const pdf = await capture(() => printPDF({ title: "Somo la Hisabati — sehemu", content: `Wanafunzi watalinganisha ≥ ½ → “kazi nzuri” ✓\n\n${table}`, type: "lesson-plan" }));
    expect(pdf).toMatch(/\/FontFile2/); // TrueType fonts embedded
    expect(pdf).toMatch(/\/BaseFont \/Body/); // Source Sans 3, registered as "Body"
    expect(pdf).toMatch(/\/BaseFont \/Display/); // Lexend headings
    const pages = Number(/\/Count (\d+)/.exec(pdf)![1]);
    expect(pages).toBeGreaterThan(1);
    // Text is drawn with Identity-H (Unicode) encoding, so no character is mapped to a Windows-1252 lookalike.
    expect(pdf).toMatch(/Identity-H/);
    // The table header is drawn once per page the table spans.
    const headerDraws = (pdf.match(/Descriptor|<[0-9A-F]+> Tj/g) ?? []).length;
    expect(headerDraws).toBeGreaterThan(0);
  });

  it("builds certificates with embedded fonts for names like Wanjirũ", async () => {
    (globalThis as any).fetch = async () => ({ ok: false });
    const { downloadCertificatePDF } = await import("@/lib/certificate-pdf");
    const pdf = await capture(() => downloadCertificatePDF({ teacherName: "Wanjirũ Ng'ang'a", programTitle: "CBC Foundations", subtitle: "Completed", kicdAlignment: "", skills: ["Planning"], hours: 4, score: "90%", serial: "MW-ABCDE-FGHJK", verifyUrl: "https://example.test/verify?serial=MW-ABCDE-FGHJK" }));
    expect(pdf).toMatch(/\/FontFile2/);
    expect(Number(/\/Count (\d+)/.exec(pdf)![1])).toBe(2);
  });
});

describe("PDF text helpers", () => {
  it("fall back to safe lookalikes when fonts cannot be embedded", () => {
    expect(toSafeText("Wanjirũ ≥ ½ → ✓ … café")).toBe("Wanjiru >= ½ -> v ... cafe");
    expect(toSafeText("“quotes” – dash — €")).toBe("“quotes” – dash — €");
    expect(toSafeText("漢字")).toBe("??");
  });

  it("date documents in Kenya time, whatever the device time zone", () => {
    const lateUtc = new Date("2026-10-07T22:30:00Z"); // already 8 October in Nairobi
    expect(eatDate(lateUtc)).toBe("8 October 2026");
    expect(eatDateTime(lateUtc)).toBe("8 October 2026 at 01:30 EAT");
  });
});
