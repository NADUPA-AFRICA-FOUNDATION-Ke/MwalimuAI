#!/usr/bin/env node
/**
 * Dependency-free test runner: compiles the pure-function libs with the
 * project's own tsc, then runs node:test assertions against them.
 *
 * Usage: npm test   (or: node scripts/run-tests.mjs)
 */
import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'
import assert from 'node:assert/strict'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// Compile into a project subfolder so bare imports (jspdf) resolve via node_modules
const outDir = mkdtempSync(path.join(root, '.test-build-'))
// Emit CommonJS so the libs' extensionless relative imports (e.g. './qr')
// resolve natively in node, matching how the bundler resolves them.
writeFileSync(path.join(outDir, 'package.json'), '{"type":"commonjs"}')

const FILES = ['lib/rate-limit.ts', 'lib/print-pdf.ts', 'lib/certificate-pdf.ts', 'lib/device-claim.ts']
execSync(
  `"${path.join(root, 'node_modules/.bin/tsc')}" ${FILES.join(' ')} --target es2022 --module commonjs --moduleResolution node --esModuleInterop --outDir "${outDir}"`,
  { cwd: root, stdio: 'inherit' },
)
// certificate-pdf imports the vendored (non-TS) QR module; tsc won't emit it.
mkdirSync(path.join(outDir, 'vendor'), { recursive: true })
copyFileSync(path.join(root, 'lib/vendor/qrcode-generator.js'), path.join(outDir, 'vendor/qrcode-generator.js'))

const mod = (name) => import(pathToFileURL(path.join(outDir, name)).href)

// Capture jsPDF saves to memory instead of triggering browser downloads
const { jsPDF } = await import('jspdf')
let lastPdf = null
jsPDF.API.save = function (filename) {
  lastPdf = { filename, bytes: this.output('arraybuffer').byteLength, pages: this.getNumberOfPages() }
}

process.on('exit', () => rmSync(outDir, { recursive: true, force: true }))

/* ── single-device watchdog decision ────────────────────────── */
const { decideDeviceAction } = await mod('device-claim.js')

test('decideDeviceAction: same device keeps the session', () => {
  assert.equal(decideDeviceAction('dev-A', 'dev-A'), 'ok')
})

test('decideDeviceAction: another device that took over forces logout', () => {
  assert.equal(decideDeviceAction('dev-B', 'dev-A'), 'logout')
})

test('decideDeviceAction: no recorded owner triggers reclaim, never logout', () => {
  assert.equal(decideDeviceAction(null, 'dev-A'), 'reclaim')
})

test('decideDeviceAction: never logs out a session that has not claimed yet', () => {
  // cold start / restored session before claim completes — must not self-logout
  assert.equal(decideDeviceAction('dev-A', null), 'reclaim')
  assert.equal(decideDeviceAction('dev-B', null), 'reclaim')
})

/* ── rate-limit ─────────────────────────────────────────────── */
const { rateLimit, rateLimitResponse } = await mod('rate-limit.js')

test('rateLimit allows up to max requests then blocks', () => {
  for (let i = 0; i < 5; i++) {
    assert.equal(rateLimit('user-a', 5, 60_000).ok, true, `request ${i + 1} should pass`)
  }
  const blocked = rateLimit('user-a', 5, 60_000)
  assert.equal(blocked.ok, false)
  assert.ok(blocked.retryAfterSeconds >= 1)
})

test('rateLimit keys are independent', () => {
  assert.equal(rateLimit('user-b', 2, 60_000).ok, true)
  assert.equal(rateLimit('user-c', 2, 60_000).ok, true)
})

test('rateLimit window resets', async () => {
  assert.equal(rateLimit('user-d', 1, 50).ok, true)
  assert.equal(rateLimit('user-d', 1, 50).ok, false)
  await new Promise(r => setTimeout(r, 60))
  assert.equal(rateLimit('user-d', 1, 50).ok, true)
})

test('rateLimitResponse is a 429 with Retry-After', () => {
  const res = rateLimitResponse({ ok: false, remaining: 0, retryAfterSeconds: 30 })
  assert.equal(res.status, 429)
  assert.equal(res.headers.get('Retry-After'), '30')
})

/* ── print-pdf ──────────────────────────────────────────────── */
const { printPDF } = await mod('print-pdf.js')

const TOOL_CONTENT = `Subject: Mathematics
Grade: Grade 5

## Lesson Objectives

1. Identify equivalent fractions
2. Explain **why** two fractions are equivalent

Activity 1 - Paper Folding (10 min)

- Each learner gets one A4 sheet
- Fold once, shade half

> Remember: justification, not just answers.

| Group | Task |
| --- | --- |
| A | Share 3 chapatis among 4 |
| B | Share 2 chapatis among 3 |

\`\`\`
sample code block
second line
\`\`\`

**Assessment**

Observe each group and record who can explain equivalence.`

test('printPDF produces a multi-section PDF and triggers save', async () => {
  lastPdf = null
  await printPDF({ title: 'Test Lesson', subtitle: 'sub', meta: 'meta', content: TOOL_CONTENT, type: 'lesson-plan' })
  assert.ok(lastPdf, 'save() was called')
  assert.ok(lastPdf.bytes > 5_000, `PDF should be non-trivial, got ${lastPdf.bytes} bytes`)
  assert.ok(lastPdf.pages >= 1)
  assert.match(lastPdf.filename, /\.pdf$/)
})

test('printPDF survives empty and hostile content', async () => {
  await printPDF({ title: 'Empty', content: '', type: 'default' })
  assert.ok(lastPdf.bytes > 1_000)
  await printPDF({ title: 'Hostile', content: '|||\n```\n unclosed fence\n## ', type: 'policy' })
  assert.ok(lastPdf.bytes > 1_000)
})

test('printPDF paginates long content', async () => {
  const long = Array.from({ length: 80 }, (_, i) => `## Section ${i}\n\nParagraph for section ${i} with enough words to take a line or two.`).join('\n\n')
  await printPDF({ title: 'Long', content: long, type: 'research' })
  assert.ok(lastPdf.pages > 1, `expected multiple pages, got ${lastPdf.pages}`)
})

/* ── certificate-pdf ────────────────────────────────────────── */
const { downloadCertificatePDF } = await mod('certificate-pdf.js')

test('certificate PDF renders with serial and saves', async () => {
  lastPdf = null
  await downloadCertificatePDF({
    teacherName: 'Grace Wanjiku Kamau',
    programTitle: 'CBC Foundations',
    subtitle: 'CBC Foundations Program',
    kicdAlignment: 'KICD CBC PD Level 1',
    skills: ['Skill One', 'Skill Two', 'Skill Three', 'A Much Longer Skill Name For Wrapping', 'Skill Five'],
    hours: 5,
    score: '6/6',
    serial: 'MW-7F3K9-Q2D8M',
    verifyUrl: 'https://example.com/verify',
  })
  assert.ok(lastPdf, 'save() was called')
  assert.equal(lastPdf.pages, 2, 'certificate is two pages: award front + verification back')
  assert.ok(lastPdf.bytes > 5_000)
})

test('certificate PDF shrinks very long names onto one page', async () => {
  await downloadCertificatePDF({
    teacherName: 'Wanjiru Nyambura Wairimu Kamande-Otieno Achieng Wekesa',
    programTitle: 'Teacher Wellbeing', subtitle: 'Program', kicdAlignment: 'KICD',
    skills: ['One'], hours: 4, score: null, serial: 'MW-AAAAA-BBBBB',
    verifyUrl: 'https://example.com/verify',
  })
  assert.equal(lastPdf.pages, 2)
})
