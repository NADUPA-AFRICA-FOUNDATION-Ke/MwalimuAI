// @vitest-environment node
import { describe, expect, it } from "vitest";
import { lessonPrompt, lessonSchema, outlinePrompt, parseJsonLoose, quizSchema } from "@/lib/admin-ai";

describe("admin AI helpers", () => {
  it("parses JSON from fenced or chatty replies, including braces inside strings", () => {
    expect(parseJsonLoose('Sure!\n```json\n{"text":"a } brace","n":1}\n```\nHope that helps')).toEqual({ text: "a } brace", n: 1 });
    expect(() => parseJsonLoose("no json here")).toThrow();
    expect(() => parseJsonLoose('{"a":')).toThrow(/cut off/);
  });

  it("validates model output before it can reach a draft", () => {
    const ok = quizSchema.safeParse({ questions: [{ question: "Which is right?", options: ["a", "b", "c", "d"], correct: 2, explanation: "c" }] });
    expect(ok.success).toBe(true);
    // wrong option count and out-of-range answer are rejected
    expect(quizSchema.safeParse({ questions: [{ question: "Which?", options: ["a", "b"], correct: 5, explanation: "" }] }).success).toBe(false);
    expect(lessonSchema.safeParse({ duration: "10 min", reading: "too short" }).success).toBe(false);
  });

  it("puts the author's inputs into the prompt and caps their length", () => {
    const p = outlinePrompt({ topic: "Inclusive classrooms", audience: "Grades 4–6", modules: 3, lessonsPerModule: 4 });
    expect(p).toContain("Inclusive classrooms");
    expect(p).toContain("exactly 3 modules");
    expect(lessonPrompt({ path: "P", module: "M", title: "T", existing: "x".repeat(50000) }).length).toBeLessThan(9000);
  });
});
