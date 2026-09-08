import type { Program } from './learning-paths-data'
import { PROGRAMS } from './learning-paths-data'
import { makeFunctionReference } from 'convex/server'
import { getConvexClient } from '@/lib/convex/client'

const KEY      = 'mwalimu_learning_progress'
const DISC_KEY = 'mwalimu_discussions'

export interface DiscussionPost {
  id: string
  author: string
  content: string
  timestamp: string
  isOwn: boolean
}

export interface ProgramProgress {
  completedLessons: string[]           // `${moduleId}/${lessonId}`
  reflections: Record<string, string>  // key: `${moduleId}/${lessonId}`
  preAssessment?: { score: number; total: number; date: string; answers: number[] }
  postAssessment?: { score: number; total: number; date: string; answers: number[] }
  assignment?: { text: string; feedback: string; submittedAt: string }
  certificateEarnedAt?: string
  certificateSerial?: string           // MW-XXXXX-XXXXX, verifiable at /verify
  cohortJoined?: boolean
}

export type AllProgress = Record<string, ProgramProgress>

// ── Module-level user ID — set by profile-context on auth ──────────
let _userId: string | null = null

// Cloud syncs that arrived before the auth event set _userId (a brief
// window right after sign-in, since setLearningProgressUser is called from
// a deferred handler) are queued here instead of silently dropped, and
// flushed as soon as the user id lands.
let _pendingSyncs: Array<() => void> = []

const listProgress = makeFunctionReference<'query', Record<string, never>, Array<ProgramProgress & { programId: string }>>('learningProgress:mine')
const saveProgress = makeFunctionReference<'mutation', { programId: string; progress: ProgramProgress }, unknown>('learningProgress:save')
const saveCertificate = makeFunctionReference<'mutation', { serial: string; programId: string; teacherName: string; programTitle: string }, unknown>('certificates:upsertMine')
const removeCertificate = makeFunctionReference<'mutation', { programId: string }, unknown>('certificates:removeMine')
const createDiscussion = makeFunctionReference<'mutation', {
  clientId: string; programId: string; moduleId: string; lessonId: string; author: string; content: string
}, unknown>('lessonDiscussions:create')

export function setLearningProgressUser(userId: string | null) {
  _userId = userId
  if (userId && _pendingSyncs.length > 0) {
    const queued = _pendingSyncs
    _pendingSyncs = []
    queued.forEach(fn => fn())
  }
}

// ── localStorage helpers ───────────────────────────────────────────
function read(): AllProgress {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} }
}

function write(data: AllProgress) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {}
}

// ── Supabase background sync ───────────────────────────────────────
// Returns the write's promise so callers that need to know the cloud write
// actually landed (e.g. clearAssessment, before letting a retake proceed)
// can await it; ordinary fire-and-forget callers just ignore the return.
function cloudSync(programId: string, p: ProgramProgress): Promise<unknown> {
  if (!_userId) {
    _pendingSyncs.push(() => { void cloudSync(programId, p) })
    return Promise.resolve()
  }
  const client = getConvexClient()
  if (!client) return Promise.resolve()

  // Never trust p.certificateEarnedAt/certificateSerial at face value — this
  // object comes from localStorage, and every write helper in this file
  // (completeLesson, saveReflection, saveAssessment, ...) pushes the WHOLE
  // cached object on every call. If a certificate was ever revoked (e.g. via
  // scripts/audit-certificates.mjs) while a browser still had it cached
  // locally, the very next unrelated write from that browser would otherwise
  // silently re-upload the stale certificate fields and resurrect it. Re-derive
  // eligibility from the current progress on every sync instead.
  const program = PROGRAMS.find(pr => pr.id === programId)
  const eligible = !!program && isProgramComplete(program, p)
  if (!eligible && p.certificateSerial) {
    // Local cache still holds a serial for a now-ineligible program — make
    // sure it doesn't linger in the public verification registry either.
    void client.mutation(removeCertificate, { programId }).catch(err => {
      console.error('[mwalimu] certificate removal sync failed:', err)
    })
  }

  const progress: ProgramProgress = {
    completedLessons: p.completedLessons,
    reflections: p.reflections,
    cohortJoined: p.cohortJoined ?? false,
    ...(p.preAssessment ? { preAssessment: p.preAssessment } : {}),
    ...(p.postAssessment ? { postAssessment: p.postAssessment } : {}),
    ...(p.assignment ? { assignment: p.assignment } : {}),
    ...(eligible && p.certificateEarnedAt ? { certificateEarnedAt: p.certificateEarnedAt } : {}),
    ...(eligible && p.certificateSerial ? { certificateSerial: p.certificateSerial } : {}),
  }
  return client.mutation(saveProgress, { programId, progress }).catch(err => {
    console.error('[mwalimu] progress sync failed:', err)
  })
}

// Called on sign-in: pulls cloud data into localStorage cache
export async function loadProgressFromCloud(userId: string): Promise<void> {
  void userId // Ownership comes from the authenticated Convex identity.
  try {
    const client = getConvexClient()
    if (!client) return
    const data = await client.query(listProgress, {})
    if (data.length === 0) return

    const cloud: AllProgress = {}
    for (const row of data) {
      if (!row.programId) continue
      cloud[row.programId] = {
        completedLessons: row.completedLessons ?? [],
        reflections: row.reflections ?? {},
        ...(row.preAssessment ? { preAssessment: row.preAssessment } : {}),
        ...(row.postAssessment ? { postAssessment: row.postAssessment } : {}),
        ...(row.assignment ? { assignment: row.assignment } : {}),
        ...(row.certificateEarnedAt ? { certificateEarnedAt: row.certificateEarnedAt } : {}),
        ...(row.certificateSerial ? { certificateSerial: row.certificateSerial } : {}),
        cohortJoined: row.cohortJoined ?? false,
      }
    }
    // Cloud wins — merge over local cache
    write({ ...read(), ...cloud })
  } catch (err) { console.error('[mwalimu] loadProgressFromCloud error:', err) }
}

// ── Public read helpers ────────────────────────────────────────────
export function getProgress(programId: string): ProgramProgress {
  return read()[programId] ?? { completedLessons: [], reflections: {} }
}

// ── Write helpers (localStorage + background cloud sync) ──────────
export function completeLesson(programId: string, moduleId: string, lessonId: string) {
  const all = read()
  const p   = all[programId] ?? { completedLessons: [], reflections: {} }
  const key = `${moduleId}/${lessonId}`
  if (!p.completedLessons.includes(key)) p.completedLessons = [...p.completedLessons, key]
  all[programId] = p
  write(all)
  cloudSync(programId, p)
}

export function uncompleteLesson(programId: string, moduleId: string, lessonId: string) {
  const all = read()
  const p   = all[programId] ?? { completedLessons: [], reflections: {} }
  const key = `${moduleId}/${lessonId}`
  p.completedLessons = p.completedLessons.filter(l => l !== key)
  all[programId] = p
  write(all)
  cloudSync(programId, p)
}

export function saveReflection(programId: string, moduleId: string, lessonId: string, text: string) {
  const all = read()
  const p   = all[programId] ?? { completedLessons: [], reflections: {} }
  p.reflections[`${moduleId}/${lessonId}`] = text
  all[programId] = p
  write(all)
  cloudSync(programId, p)
}

export function saveAssessment(
  programId: string,
  type: 'preAssessment' | 'postAssessment',
  score: number, total: number, answers: number[]
) {
  const all = read()
  const p   = all[programId] ?? { completedLessons: [], reflections: {} }
  p[type] = { score, total, date: new Date().toLocaleDateString(), answers }
  all[programId] = p
  write(all)
  cloudSync(programId, p)
}

// Clears a stored attempt so the learner can retake it — used when a
// post-assessment attempt scored below the certificate pass mark. Awaits the
// cloud write (unlike other write helpers here, which are fire-and-forget)
// so a caller resetting the UI for a retake doesn't race a concurrent
// loadProgressFromCloud that could otherwise re-read and restore the
// just-cleared attempt before the clear has landed in Postgres.
export async function clearAssessment(programId: string, type: 'preAssessment' | 'postAssessment'): Promise<void> {
  const all = read()
  const p   = all[programId]
  if (!p) return
  delete p[type]
  all[programId] = p
  write(all)
  await cloudSync(programId, p)
}

export function saveAssignment(programId: string, text: string, feedback: string) {
  const all = read()
  const p   = all[programId] ?? { completedLessons: [], reflections: {} }
  p.assignment = { text, feedback, submittedAt: new Date().toLocaleDateString() }
  all[programId] = p
  write(all)
  cloudSync(programId, p)
}

// Unambiguous charset (no 0/O/1/I/L) for human-readable serials
function genSerial(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const block = (n: number) => {
    const bytes = new Uint8Array(n)
    if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) crypto.getRandomValues(bytes)
    else for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256)
    return Array.from(bytes).map(b => chars[b % chars.length]).join('')
  }
  return `MW-${block(5)}-${block(5)}`
}

// Upsert the public verification registry row for a certificate. Keyed by
// (user_id, program_id) — there is one certificate per user per program — so
// the row's serial always tracks the one printed on the holder's certificate,
// even if an earlier registration stored a different (stale) serial. Name and
// title are only written when non-empty, so a later call with real values fills
// blanks, and a call without them never clobbers good data.
function registerCertificate(serial: string, programId: string, teacherName: string, programTitle: string) {
  if (!_userId) return
  const client = getConvexClient()
  void client?.mutation(saveCertificate, { serial, programId, teacherName, programTitle })
    .catch(err => console.error('[mwalimu] certificate sync failed:', err))
}

/**
 * Marks the certificate as earned, assigning a verifiable serial number on
 * first call (also backfills serials for certificates earned before serials
 * existed). Idempotent: every call (re)registers the serial in the public
 * `certificates` table, backfilling teacher_name/program_title when provided.
 * Returns the serial, or an empty string if the program isn't actually
 * eligible — checked here too, not just by callers, so this can never be
 * used to mint a certificate for a program that doesn't meet the bar.
 */
export function earnCertificate(programId: string, teacherName = '', programTitle = ''): string {
  const all = read()
  const p   = all[programId] ?? { completedLessons: [], reflections: {} }
  const program = PROGRAMS.find(pr => pr.id === programId)
  if (!program || !isProgramComplete(program, p)) return p.certificateSerial ?? ''
  if (!p.certificateEarnedAt) {
    p.certificateEarnedAt = new Date().toLocaleDateString()
  }
  if (!p.certificateSerial) {
    p.certificateSerial = genSerial()
  }
  // Always (re)register so the registry row carries the teacher name and
  // program title once they are known, even if the serial already existed.
  registerCertificate(p.certificateSerial, programId, teacherName, programTitle)
  all[programId] = p
  write(all)
  cloudSync(programId, p)
  return p.certificateSerial
}

/**
 * Re-register every certificate this user holds into the public verification
 * registry. Idempotent (upsert by serial). Repairs certificates earned before
 * the registry existed, or whose original registration write was lost, so they
 * verify at /verify. Called on sign-in after cloud progress has loaded.
 */
export function syncCertificatesToRegistry(teacherName: string) {
  if (!_userId) return
  const all = read()
  for (const [programId, p] of Object.entries(all)) {
    if (!p.certificateSerial) continue
    const program = PROGRAMS.find(pr => pr.id === programId)
    if (!program || !isProgramComplete(program, p)) continue
    registerCertificate(p.certificateSerial, programId, teacherName, program.title)
  }
}

export function joinCohort(programId: string) {
  const all = read()
  const p   = all[programId] ?? { completedLessons: [], reflections: {} }
  p.cohortJoined = true
  all[programId] = p
  write(all)
  cloudSync(programId, p)
}

export function isLessonComplete(progress: ProgramProgress, moduleId: string, lessonId: string) {
  return progress.completedLessons.includes(`${moduleId}/${lessonId}`)
}

export function getProgramCompletionPct(program: Program, progress: ProgramProgress): number {
  const total = program.modules.reduce((s, m) => s + m.lessons.length, 0)
  if (total === 0) return 0
  return Math.round((progress.completedLessons.length / total) * 100)
}

// Certificate eligibility bar: every lesson read, a meaningful number of
// reflections written, and the post-assessment passed at the program's
// required standard — not merely attempted.
const MIN_REFLECTIONS_FOR_CERTIFICATE = 6
const CERTIFICATE_PASS_RATIO = 0.85

export function isProgramComplete(program: Program, progress: ProgramProgress): boolean {
  const total = program.modules.reduce((s, m) => s + m.lessons.length, 0)
  const allLessonsRead    = total > 0 && progress.completedLessons.length >= total
  const enoughReflections = Object.keys(progress.reflections).length >= MIN_REFLECTIONS_FOR_CERTIFICATE
  const passed = !!progress.postAssessment && progress.postAssessment.total > 0
    && progress.postAssessment.score / progress.postAssessment.total >= CERTIFICATE_PASS_RATIO
  return allLessonsRead && enoughReflections && passed
}

/* ── Discussion helpers (localStorage) ──────────────────────────── */
type AllDiscussions = Record<string, DiscussionPost[]>

function readDisc(): AllDiscussions {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(DISC_KEY) ?? '{}') } catch { return {} }
}

function writeDisc(data: AllDiscussions) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(DISC_KEY, JSON.stringify(data)) } catch {}
}

const SEED_POSTS: Record<string, { author: string; content: string }[]> = {
  default: [
    { author: 'Mary Wanjiku, Kiambu',   content: 'This lesson really clicked for me — I\'ve been trying to apply this in my Grade 5 class and the learners are so much more engaged. Has anyone else noticed the same?' },
    { author: 'Samuel Ochieng, Kisumu', content: 'I had a question about this topic. How do you handle it when some learners are way ahead and others are still catching up? I\'d love to hear different approaches.' },
  ],
}

function uid() { return Math.random().toString(36).slice(2, 9) }

export function getDiscussions(programId: string, moduleId: string, lessonId: string): DiscussionPost[] {
  const all = readDisc()
  const key = `${programId}/${moduleId}/${lessonId}`
  if (!all[key]) {
    const seeds = SEED_POSTS.default.map((s, i) => ({
      id: `seed-${i}`,
      author: s.author,
      content: s.content,
      timestamp: new Date(Date.now() - (2 - i) * 86400000 * 2).toLocaleDateString(),
      isOwn: false,
    }))
    all[key] = seeds
    writeDisc(all)
  }
  return all[key]
}

export function addDiscussionPost(
  programId: string, moduleId: string, lessonId: string,
  content: string, authorName: string,
  userId?: string,
): DiscussionPost {
  const all = readDisc()
  const key = `${programId}/${moduleId}/${lessonId}`
  const post: DiscussionPost = {
    id: uid(), author: authorName, content,
    timestamp: new Date().toLocaleDateString(), isOwn: true,
  }
  all[key] = [...(all[key] ?? []), post]
  writeDisc(all)

  // Sync to cloud so posts survive logout and appear on other devices
  if (userId) {
    const client = getConvexClient()
    void client?.mutation(createDiscussion, {
      clientId: post.id, programId, moduleId, lessonId, author: authorName, content: post.content,
    }).catch(err => console.error('[mwalimu] discussion sync failed:', err))
  }

  return post
}

/* ── Peer review sample data ──────────────────────────────────────── */
export const PEER_SUBMISSIONS = [
  {
    id: 'peer-1',
    author: 'Faith Kemunto, Nyamira',
    submittedAt: '3 days ago',
    preview: 'In my Grade 6 class, I decided to redesign my mathematics lesson on fractions to be more learner-centred. Instead of explaining the concept on the board, I gave each group a piece of paper to fold and cut...',
    full: 'In my Grade 6 class, I decided to redesign my mathematics lesson on fractions to be more learner-centred. Instead of explaining the concept on the board, I gave each group a piece of paper to fold and cut into equal parts. They discovered that folding in half gives 1/2, into quarters gives 1/4, and so on. The discussion that followed was incredible — learners were making connections I hadn\'t anticipated. The challenge I faced was time management; the activity took longer than planned. Next time, I\'ll prepare a simpler recording sheet to help groups move faster.',
    feedback: '',
  },
  {
    id: 'peer-2',
    author: 'Peter Mwangi, Murang\'a',
    submittedAt: '1 week ago',
    preview: 'My reflection focuses on how I communicate CBC to parents who are concerned about examination preparation. In our school community, many parents still equate good education with exercise books and regular tests...',
    full: 'My reflection focuses on how I communicate CBC to parents who are concerned about examination preparation. In our school community, many parents still equate good education with exercise books and regular tests. After this program, I prepared a short presentation for parents explaining that CBC does not abandon rigour — it redefines what rigour looks like. I showed them a portfolio piece from one of our best-performing learners alongside her observation records. The response was more positive than I expected.',
    feedback: '',
  },
]
