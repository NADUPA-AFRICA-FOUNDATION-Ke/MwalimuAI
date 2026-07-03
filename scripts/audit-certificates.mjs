#!/usr/bin/env node
/**
 * Audits every already-issued certificate against the real eligibility bar
 * (all lessons read, 6+ reflections, post-assessment >= 85%) introduced in
 * lib/learning-progress.ts. Reports which serials would not have been
 * issued under the current rule.
 *
 * Usage:
 *   node --env-file=.env.local scripts/audit-certificates.mjs                    (report only)
 *   node --env-file=.env.local scripts/audit-certificates.mjs --revoke           (prints the
 *     exact rows that would be revoked, but does not mutate anything — requires --yes too)
 *   node --env-file=.env.local scripts/audit-certificates.mjs --revoke --yes     (after
 *     reviewing the plan above, actually clears certificate_earned_at/certificate_serial
 *     on ineligible learning_progress rows and deletes the matching certificates registry
 *     row, so the serial stops verifying and the account can re-earn it legitimately)
 */
import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = mkdtempSync(path.join(root, '.test-build-'))
writeFileSync(path.join(outDir, 'package.json'), '{"type":"commonjs"}')

execSync(
  `"${path.join(root, 'node_modules/.bin/tsc')}" lib/learning-paths-data.ts lib/ai-toolkit-data.ts --target es2022 --module commonjs --moduleResolution node --esModuleInterop --outDir "${outDir}"`,
  { cwd: root, stdio: 'inherit' },
)

const { PROGRAMS } = await import(pathToFileURL(path.join(outDir, 'learning-paths-data.js')).href)
rmSync(outDir, { recursive: true, force: true })

const MIN_REFLECTIONS = 6
const PASS_RATIO = 0.85

const totalLessonsByProgram = Object.fromEntries(
  PROGRAMS.map(p => [p.id, p.modules.reduce((s, m) => s + m.lessons.length, 0)]),
)
const titleByProgram = Object.fromEntries(PROGRAMS.map(p => [p.id, p.title]))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — run with: node --env-file=.env.local scripts/audit-certificates.mjs')
  process.exit(1)
}
const admin = createClient(supabaseUrl, serviceKey)
const shouldRevoke = process.argv.includes('--revoke')
const confirmed = process.argv.includes('--yes')

const { data: rows, error } = await admin
  .from('learning_progress')
  .select('user_id, program_id, completed_lessons, reflections, post_assessment, certificate_serial, certificate_earned_at')
  .not('certificate_serial', 'is', null)

if (error) { console.error('Query failed:', error.message); process.exit(1) }

// Only fetch names for the users actually holding a certificate, not the
// whole profiles table — this script only needs those for display.
const relevantUserIds = [...new Set((rows ?? []).map(r => r.user_id))]
const { data: profiles } = relevantUserIds.length
  ? await admin.from('profiles').select('id, name').in('id', relevantUserIds)
  : { data: [] }
const nameByUser = Object.fromEntries((profiles ?? []).map(p => [p.id, p.name]))

let eligibleCount = 0
let ineligibleCount = 0

for (const row of rows ?? []) {
  const total = totalLessonsByProgram[row.program_id] ?? 0
  const lessonsDone = (row.completed_lessons ?? []).length
  const reflectionCount = Object.keys(row.reflections ?? {}).length
  const post = row.post_assessment
  const scoreRatio = post && post.total > 0 ? post.score / post.total : 0
  const eligible = total > 0 && lessonsDone >= total && reflectionCount >= MIN_REFLECTIONS && scoreRatio >= PASS_RATIO

  if (eligible) { eligibleCount++; continue }
  ineligibleCount++

  const reasons = []
  if (!(lessonsDone >= total)) reasons.push(`lessons ${lessonsDone}/${total}`)
  if (!(reflectionCount >= MIN_REFLECTIONS)) reasons.push(`reflections ${reflectionCount}/${MIN_REFLECTIONS}`)
  if (!(scoreRatio >= PASS_RATIO)) reasons.push(post ? `score ${post.score}/${post.total} (${Math.round(scoreRatio * 100)}%)` : 'no post-assessment')

  console.log(
    `INELIGIBLE  serial=${row.certificate_serial}  user=${nameByUser[row.user_id] ?? row.user_id}  program=${titleByProgram[row.program_id] ?? row.program_id}  earned_at=${row.certificate_earned_at}  — ${reasons.join(', ')}`,
  )

  if (shouldRevoke && !confirmed) {
    console.log(`  (would revoke — re-run with --revoke --yes to confirm)`)
  }

  if (shouldRevoke && confirmed) {
    const { error: updateError } = await admin
      .from('learning_progress')
      .update({ certificate_earned_at: null, certificate_serial: null })
      .eq('user_id', row.user_id)
      .eq('program_id', row.program_id)
    if (updateError) console.error(`  ✗ failed to clear learning_progress: ${updateError.message}`)

    const { error: deleteError } = await admin
      .from('certificates')
      .delete()
      .eq('user_id', row.user_id)
      .eq('program_id', row.program_id)
    if (deleteError) console.error(`  ✗ failed to delete certificates row: ${deleteError.message}`)

    if (!updateError && !deleteError) console.log(`  ✓ revoked`)
  }
}

console.log(`\n${eligibleCount} certificate(s) meet the current bar, ${ineligibleCount} do not (out of ${(rows ?? []).length} issued).`)
if (shouldRevoke && !confirmed && ineligibleCount > 0) {
  console.log(`Nothing was changed — re-run with --revoke --yes to actually revoke the ${ineligibleCount} certificate(s) listed above.`)
} else if (shouldRevoke && confirmed) {
  console.log(`${ineligibleCount} ineligible certificate(s) revoked.`)
}
