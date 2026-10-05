#!/usr/bin/env node
/**
 * Runs a small fixed set of authoring tasks against the real model and checks the results with the plain rules in
 * lib/admin-ai-checks.ts. Use it before changing the model or the prompts, and again after, and compare.
 *
 *   GROQ_API_KEY=... node --experimental-strip-types scripts/ai-eval.mjs
 *   ADMIN_AI_MODEL=openai/gpt-oss-120b  (optional)   --only lesson|quiz|outline|translate   --runs 2
 *
 * It spends a few cents of AI credit and is NOT part of CI. Exit code 1 when any case fails.
 */
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { SYSTEM, lessonPrompt, lessonSchema, outlinePrompt, outlineSchema, parseJsonLoose, quizPrompt, quizSchema, translatePrompt, swLessonSchema } from '../lib/admin-ai.ts'
import { checkLesson, checkOutline, checkQuiz, checkTranslation } from '../lib/admin-ai-checks.ts'

const key = process.env.GROQ_API_KEY
if (!key) { console.error('Set GROQ_API_KEY to run the evaluation.'); process.exit(2) }
const model = createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: key })(process.env.ADMIN_AI_MODEL ?? 'openai/gpt-oss-120b')
const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined }
const only = arg('only'), runs = Number(arg('runs') ?? 1)

async function ask(schema, prompt, max = 6000) {
  const { text } = await generateText({ model, system: SYSTEM, prompt, temperature: 0.4, maxOutputTokens: max, abortSignal: AbortSignal.timeout(60_000) })
  return schema.parse(parseJsonLoose(text))
}

const cases = [
  { kind: 'outline', name: 'Inclusive classrooms, Grades 4–6', run: async () => { const e = { modules: 3, lessonsPerModule: 3 }; return checkOutline(await ask(outlineSchema, outlinePrompt({ topic: 'Teaching mixed-ability classes of 60+ learners', audience: 'Grades 4–6', ...e })), e) } },
  { kind: 'outline', name: 'Digital tools, low connectivity', run: async () => { const e = { modules: 2, lessonsPerModule: 4 }; return checkOutline(await ask(outlineSchema, outlinePrompt({ topic: 'Using a phone to prepare and assess lessons with little data', audience: 'All teachers', ...e })), e) } },
  { kind: 'lesson', name: 'Formative assessment: exit tickets', run: async () => checkLesson(await ask(lessonSchema, lessonPrompt({ path: 'Assessment for Learning', module: 'Quick checks', title: 'Exit tickets in a crowded classroom', objective: 'Use exit tickets to see who needs help tomorrow' }))) },
  { kind: 'lesson', name: 'Differentiation with few resources', run: async () => checkLesson(await ask(lessonSchema, lessonPrompt({ path: 'Inclusive Education', module: 'Practical strategies', title: 'Tiered tasks with the same materials', objective: 'Plan three levels of one task' }))) },
  { kind: 'quiz', name: 'Post test from a lesson', run: async () => checkQuiz(await ask(quizSchema, quizPrompt({ path: 'Assessment for Learning', kind: 'post', count: 6, difficulty: 'mixed', context: '# Exit tickets\nAn exit ticket is a short task learners complete before leaving class. It shows what they understood. Collect them, sort into three piles (got it, nearly, not yet), and plan tomorrow\'s grouping from the piles. Keep it to one question and two minutes.\n# Rubrics\nA rubric lists criteria and levels of performance so judging is fair and learners know the target.' })), { count: 6 }) },
  { kind: 'translate', name: 'Lesson to Kiswahili', run: async () => { const src = { title: 'Exit tickets', videoTitle: '', videoPoints: ['Short task before leaving', 'Sort into piles', 'Plan tomorrow'], reading: '## What is an exit ticket?\nAn exit ticket is a short task learners complete before they leave.\n## Try it this week\n- Write one question\n- Collect the answers\n- Sort them into three piles\nUse the piles to plan groups for tomorrow\'s lesson.', reflectionPrompt: 'What will you change tomorrow?', reflectionPlaceholder: '' }; const out = await ask(swLessonSchema, translatePrompt('lesson', src), 4000); return checkTranslation(src.reading, out.reading) } },
]

let failed = 0
for (const c of cases.filter((c) => !only || c.kind === only)) {
  for (let i = 0; i < runs; i++) {
    const t0 = Date.now()
    try {
      const problems = await c.run()
      console.log(`${problems.length ? 'FAIL' : 'pass'}  ${c.kind.padEnd(9)} ${c.name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`)
      for (const p of problems) console.log(`        - ${p}`)
      if (problems.length) failed++
    } catch (e) {
      console.log(`ERROR ${c.kind.padEnd(9)} ${c.name}: ${e instanceof Error ? e.message.slice(0, 160) : e}`)
      failed++
    }
  }
}
console.log(failed ? `\n${failed} case(s) did not meet the rules.` : '\nAll cases met the rules.')
process.exit(failed ? 1 : 0)
