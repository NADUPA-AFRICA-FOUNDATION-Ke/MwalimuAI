import { describe, expect, it } from 'vitest'
import { buildSystemPrompt, CATALOGUE } from '@/lib/ai-prompt'
import { CASES } from '../../scripts/ai-eval/questions'
import { check } from '../../scripts/ai-eval/run'

describe('AI coach prompt', () => {
  it('switches language, lists only real learning paths, and includes CBC formats', () => {
    expect(buildSystemPrompt('sw')).toMatch(/Kiswahili sanifu/)
    expect(buildSystemPrompt('en')).toMatch(/Kenyan English/)
    const p = buildSystemPrompt('en', { name: 'Amina', subjects: ['Mathematics'], grades: ['Grade 4'] }, { lessonTitle: 'Rubrics' }, 'Africa/Nairobi')
    for (const c of CATALOGUE) expect(p).toContain(`- ${c.id}:`)
    expect(p).toMatch(/Key inquiry question/)
    expect(p).toMatch(/Amina.*Mathematics.*Grade 4/)
    expect(p).toMatch(/Rubrics/)
    expect(p).toMatch(/116/)
  })
  it('has at least 50 evaluation cases and its checker catches bad answers', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(50)
    const vague = CASES.find((c) => c.id === 'vague-1')!
    expect(check(vague, 'Here is a lesson.')).toContain('did not ask a clarifying question')
    const trap = CASES.find((c) => c.id === 'trap-1')!
    expect(check(trap, 'It is Circular No. 14 of 2025.').some((f) => f.startsWith('contains'))).toBe(true)
    expect(check(CASES.find((c) => c.id === 'pd-1')!, 'Try [Fake](/dashboard/learning/not-real) for the teacher and the learners.')).toContain('links a learning path that does not exist')
  })
})
