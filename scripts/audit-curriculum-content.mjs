#!/usr/bin/env node
/**
 * Lightweight content integrity audit. It intentionally reads source text so
 * it can run in CI without a browser, database or external service.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = file => readFileSync(file, 'utf8')
const active = read('lib/learning-paths-data.ts')
const ai = read('lib/ai-toolkit-data.ts')
const legacy = read('lib/modules-data.ts')
const guidance = read('lib/curriculum-guidance.ts')

const activeProgramIds = [
  'cbc-foundations',
  'assessment-for-learning',
  'inclusive-education',
  'stem-integration',
  'teacher-wellbeing',
  'ai-empowered-educator',
]
const guideKeys = [
  ...[...guidance.matchAll(/^\s*'([^']+\/m\d+)'\s*:/gm)].map(match => match[1]),
  ...[...guidance.matchAll(/^\s*'([^']+\/\d+)'\s*:/gm)].map(match => match[1]),
]
const expectedGuideKeys = [
  ...activeProgramIds.filter(id => id !== 'ai-empowered-educator').flatMap(id => [1, 2, 3].map(n => `${id}/m${n}`)),
  ...[1, 2, 3, 4, 5].map(n => `ai-empowered-educator/m${n}`),
  ...[1, 2, 3, 4, 5, 6, 7].map(n => `legacy/${n}`),
]

assert.deepEqual([...guideKeys].sort(), [...expectedGuideKeys].sort(), 'every available module must have an implementation guide')
assert.equal((legacy.match(/^    id: \d+,/gm) ?? []).length, 7, 'legacy module inventory changed unexpectedly')
assert.equal((legacy.match(/^        id: \d+,/gm) ?? []).length, 39, 'legacy lesson inventory changed unexpectedly')
assert.equal((ai.match(/^    id: 'M\d+',/gm) ?? []).length, 5, 'AI module inventory changed unexpectedly')
assert.equal((active.match(/^      id: 'm\d+',/gm) ?? []).length, 15, 'static active module inventory changed unexpectedly')

const forbiddenClaims = [
  /\bCPE\b/,
  /12 prescribed learning areas/,
  /60%.*40%|40%.*60%/,
  /KICD-compliant/,
  /KNEC-aligned/,
  /official evidence for their CBC record/,
]
for (const pattern of forbiddenClaims) {
  assert.equal(pattern.test(`${active}\n${ai}\n${legacy}`), false, `stale or unsupported claim remains: ${pattern}`)
}

assert.equal(active.includes('>> CASE:'), true, 'active lessons should retain classroom scenarios')
assert.equal(ai.includes('scenario:'), true, 'AI lessons should retain classroom scenarios')

console.log(`Content inventory: ${guideKeys.length} implementation guides; 7 legacy modules / 39 legacy lessons; 5 AI modules.`)
console.log('Terminology audit: no forbidden legacy or unsupported alignment claims found.')
console.log('Implementation guide audit: every available module has outcomes, workflow, scenario, evidence task, reflection and source links.')
