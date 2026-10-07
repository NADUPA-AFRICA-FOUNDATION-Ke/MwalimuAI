/**
 * Compare the previous and current AI coach prompts on the evaluation set.
 *   GROQ_API_KEY=... npx tsx scripts/ai-eval/run.ts [out.md]
 * Each answer gets automatic checks; the report lists the pass rate per prompt and every failure.
 */
import { writeFileSync } from 'node:fs'
import { buildSystemPrompt, CATALOGUE } from '../../lib/ai-prompt'
import { legacyPrompt } from './legacy-prompt'
import { CASES, UNIVERSAL_EXCLUDE, type EvalCase } from './questions'

const KEY = process.env.GROQ_API_KEY
const MODEL = process.env.GROQ_MODEL ?? 'openai/gpt-oss-20b'
const profile = { name: 'Wanjiku', subjects: ['Mathematics', 'Science'], grades: ['Grade 5', 'Grade 6'], cbcLevel: 'intermediate' }
const ids = new Set(CATALOGUE.map((c) => c.id))
const SW = /\b(na|ya|wa|kwa|ni|katika|kuhusu|mwalimu|wanafunzi|darasa)\b/gi
const EN = /\b(the|and|of|to|is|for|with|learners|teacher)\b/gi

async function ask(system: string, q: string): Promise<string> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, temperature: 0.3, max_tokens: 1500, messages: [{ role: 'system', content: system }, { role: 'user', content: q }] }),
    })
    if (res.status === 429) { await new Promise((r) => setTimeout(r, 8000 * (attempt + 1))); continue }
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
    return String((await res.json()).choices?.[0]?.message?.content ?? '')
  }
  throw new Error('rate limited')
}

export function check(c: EvalCase, a: string): string[] {
  const fails: string[] = []
  const sw = (a.match(SW) ?? []).length, en = (a.match(EN) ?? []).length
  if (c.lang === 'sw' && sw <= en) fails.push('not in Kiswahili')
  if (c.lang === 'en' && en < sw) fails.push('not in English')
  for (const r of c.include ?? []) if (!r.test(a)) fails.push(`missing ${r}`)
  for (const r of [...(c.exclude ?? []), ...UNIVERSAL_EXCLUDE]) if (r.test(a)) fails.push(`contains ${r}`)
  const links = [...a.matchAll(/\/dashboard\/learning\/([a-z0-9-]+)/g)].map((m) => m[1])
  if (links.some((l) => !ids.has(l))) fails.push('links a learning path that does not exist')
  if (c.recommend === true && links.length === 0) fails.push('no learning path recommended')
  if (c.recommend === false && links.length > 0) fails.push('recommended a path off-topic')
  const words = a.split(/\s+/).length
  if (c.maxWords && words > c.maxWords) fails.push(`too long (${words} words)`)
  if (c.askBack && !/\?/.test(a)) fails.push('did not ask a clarifying question')
  return fails
}

async function main() {
  if (!KEY) throw new Error('Set GROQ_API_KEY')
  const prompts = { before: (lang: string) => legacyPrompt(lang, profile, null, 'Africa/Nairobi'), after: (lang: string) => buildSystemPrompt(lang, profile, null, 'Africa/Nairobi') }
  const rows: { id: string; before: string[]; after: string[] }[] = []
  for (const c of CASES) {
    const row = { id: c.id, before: [] as string[], after: [] as string[] }
    for (const k of ['before', 'after'] as const) {
      try { row[k] = check(c, await ask(prompts[k](c.lang), c.q)) } catch (e) { row[k] = [`error: ${e}`] }
    }
    rows.push(row)
    console.log(c.id, 'before', row.before.length ? '✗' : '✓', 'after', row.after.length ? '✗' : '✓')
  }
  const pass = (k: 'before' | 'after') => rows.filter((r) => r[k].length === 0).length
  const md = `# AI coach evaluation\n\nModel: ${MODEL}. Cases: ${rows.length}.\n\n| Prompt | Passed | Rate |\n|---|---|---|\n| Before | ${pass('before')} | ${Math.round((pass('before') / rows.length) * 100)}% |\n| After | ${pass('after')} | ${Math.round((pass('after') / rows.length) * 100)}% |\n\n## Failures\n\n| Case | Before | After |\n|---|---|---|\n${rows.filter((r) => r.before.length || r.after.length).map((r) => `| ${r.id} | ${r.before.join('; ') || '✓'} | ${r.after.join('; ') || '✓'} |`).join('\n')}\n`
  writeFileSync(process.argv[2] ?? 'ai-eval-report.md', md)
  console.log(md)
}

if (process.argv[1]?.endsWith('run.ts')) void main()
