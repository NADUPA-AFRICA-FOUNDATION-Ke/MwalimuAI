// @vitest-environment node
import { describe, expect, it } from "vitest";
import { checkLesson, checkOutline, checkQuiz, checkTranslation } from "@/lib/admin-ai-checks";

const goodReading = `## Why groups work\n${"Learners talk more in small groups, and quieter learners find a voice. ".repeat(40)}\n## Try it this week\n- Group learners in fives\n- Give each a role\n1. Explain\n2. Rotate\nIn your classroom, run this activity for ten minutes.`;

describe("AI draft quality rules", () => {
  it("passes a good lesson and names every problem in a bad one", () => {
    const good = { duration: "12 min", videoTitle: "", videoPoints: ["a", "b", "c"], reading: goodReading, reflectionPrompt: "What will you try?", reflectionPlaceholder: "" };
    expect(checkLesson(good)).toEqual([]);
    const bad = { ...good, reading: "Short <b>text</b> see https://made-up.example Write the lesson here.", videoPoints: ["a"], reflectionPrompt: "" };
    const problems = checkLesson(bad).join(" | ");
    for (const piece of ["too short", "no ## headings", "no list", "HTML", "web address", "placeholder", "Fewer than 3", "No reflection"]) expect(problems).toContain(piece);
  });

  it("flags quizzes that are easy to game", () => {
    const q = (correct: number, options = ["Alpha option", "Bravo option", "Charlie option", "Delta option"]) => ({ question: "Which is right?", options, correct, explanation: "Because." });
    expect(checkQuiz({ questions: [q(0), q(1), q(2), q(3)] }, { count: 4 })).toEqual([]);
    const bad = checkQuiz({ questions: [q(1, ["a", "b", "All of the above", "x".repeat(200)]), { ...q(1), explanation: "", question: "Tell me" }, q(1), q(1)] }, { count: 5 }).join(" | ");
    for (const piece of ["Wanted 5", "same few places", "all/none of the above", "uneven", "no explanation", "does not read as a question"]) expect(bad).toContain(piece);
  });

  it("checks that an outline has the requested shape", () => {
    const lesson = (t: string) => ({ title: t, duration: "10 min", objective: "Explain it" });
    const outline = { title: "T", tagline: "", description: "", track: "core" as const, hours: 4, outcomes: [], modules: [{ title: "M1", description: "", lessons: [lesson("A"), lesson("B")] }], assignment: { title: "t", context: "", task: "do", hints: [], rubric: ["a", "b", "c"] }, certificate: { subtitle: "s", skills: ["a", "b", "c"] } };
    expect(checkOutline(outline, { modules: 1, lessonsPerModule: 2 })).toEqual([]);
    expect(checkOutline({ ...outline, modules: [{ ...outline.modules[0], lessons: [lesson("A"), lesson("A")] }] }, { modules: 2, lessonsPerModule: 3 }).join("|")).toMatch(/Wanted 2 modules.*wanted 3 lessons.*share a title/);
  });

  it("keeps a translation's shape and rejects English passed off as Kiswahili", () => {
    const en = "## Start\n- one\n- two\nTeachers can group learners and give each a role so everyone takes part in the lesson today.";
    const sw = "## Anza\n- moja\n- mbili\nWalimu wanaweza kuwapanga wanafunzi katika makundi na kumpa kila mmoja jukumu ili wote washiriki katika somo la leo na kujifunza kwa pamoja.";
    expect(checkTranslation(en, sw)).toEqual([]);
    expect(checkTranslation(en, en).join()).toMatch(/Kiswahili/);
    expect(checkTranslation(en, "Anza\n" + sw.split("\n").slice(3).join("\n")).join()).toMatch(/Heading|List/);
  });
});
