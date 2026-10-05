export interface ParsedQuestion {
  id: string
  question: string
  options: [string, string, string, string]
  correct: 0 | 1 | 2 | 3
  explanation: string
}

const OPTION = /^\(?([a-dA-D])[.)]\s*(.*\S)\s*$/
const ANSWER = /^(?:answer|ans|correct(?: answer)?)\s*[:\-]\s*\(?([a-dA-D])\)?\s*$/i
const WHY = /^(?:why|explanation|because|rationale)\s*[:\-]\s*(.+)$/i
const MARK = /\s*(?:\*|✓|✔|\(correct\))\s*$/i

/**
 * Reads multiple-choice questions pasted as plain text, so a whole quiz can be dropped in at once:
 *
 *   1. Which of these is a core competency?
 *   a) Digital literacy *
 *   b) Cooking
 *   c) Sprinting
 *   d) Chess
 *   Why: Digital literacy is one of the seven.
 *
 * Mark the right option with * (or ✓, or "(correct)"), or add an "Answer: A" line. Blank lines separate questions.
 */
export function parseQuestions(text: string, idPrefix = 'q'): { questions: ParsedQuestion[]; errors: string[] } {
  const blocks = text
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map((b) => b.split('\n').map((l) => l.trim()).filter(Boolean))
    .filter((b) => b.length > 0)
  const questions: ParsedQuestion[] = []
  const errors: string[] = []
  blocks.forEach((lines, n) => {
    const at = `Question ${n + 1}`
    const stem: string[] = []
    const options: string[] = []
    let correct: number | null = null
    let explanation = ''
    for (const line of lines) {
      const answer = ANSWER.exec(line)
      const why = WHY.exec(line)
      const opt = OPTION.exec(line)
      if (answer) correct = answer[1].toLowerCase().charCodeAt(0) - 97
      else if (why) explanation = why[1].trim()
      else if (opt && stem.length > 0) {
        let t = opt[2]
        if (MARK.test(t)) {
          t = t.replace(MARK, '').trim()
          correct = options.length
        }
        options.push(t)
      } else if (options.length === 0) stem.push(line.replace(/^(?:q(?:uestion)?\s*)?\d*\s*[.:)]\s*/i, '').trim() || line)
    }
    if (stem.length === 0) errors.push(`${at}: no question text`)
    else if (options.length !== 4) errors.push(`${at}: needs exactly 4 options labelled a) to d) (found ${options.length})`)
    else if (correct === null || correct < 0 || correct > 3) errors.push(`${at}: mark the right option with * or add an "Answer: B" line`)
    else
      questions.push({
        id: `${idPrefix}${n + 1}-${Math.random().toString(36).slice(2, 6)}`,
        question: stem.join(' '),
        options: options as ParsedQuestion['options'],
        correct: correct as 0 | 1 | 2 | 3,
        explanation,
      })
  })
  return { questions, errors }
}
