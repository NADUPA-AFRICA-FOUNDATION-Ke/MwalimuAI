// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseQuestions } from "@/lib/admin/quiz-import";

describe("pasting quiz questions", () => {
  it("reads starred answers, Answer lines and explanations, and reports what is wrong", () => {
    const { questions, errors } = parseQuestions(`1. Which is a core competency?
a) Digital literacy *
b) Cooking
c) Sprinting
d) Chess
Why: It is one of the seven.

2) What does CBA stand for?
A. Curriculum-Based Assessment
B. Classroom-Based Assessment
C. Competency-Based Assessment
D. Continuous Basic Assessment
Answer: B

3. Only three options
a) one
b) two
c) three

4. No marked answer
a) one
b) two
c) three
d) four`);
    expect(questions).toHaveLength(2);
    expect(questions[0]).toMatchObject({ question: "Which is a core competency?", correct: 0, explanation: "It is one of the seven." });
    expect(questions[0].options[0]).toBe("Digital literacy");
    expect(questions[1]).toMatchObject({ question: "What does CBA stand for?", correct: 1 });
    expect(errors).toEqual([
      "Question 3: needs exactly 4 options labelled a) to d) (found 3)",
      'Question 4: mark the right option with * or add an "Answer: B" line',
    ]);
  });
});
