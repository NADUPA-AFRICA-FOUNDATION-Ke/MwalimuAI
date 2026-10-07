/** Shared labels and Kenya-time helpers for the My School portal. */
export const KIND_LABEL = { module: 'Module', path: 'Learning path', assessment: 'Assessment', task: 'Practical task' } as const
export const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started', in_progress: 'In progress', submitted: 'Submitted', late: 'Submitted late',
  reviewed: 'Reviewed', returned: 'Returned to improve', overdue: 'Overdue', invalid: 'Missed (late attempt refused)',
}
export const STATUS_TONE: Record<string, string> = {
  not_started: 'bg-muted text-muted-foreground', in_progress: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100',
  submitted: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100', reviewed: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100',
  late: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100', returned: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100',
  overdue: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100', invalid: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100',
}
export const ROLE_LABEL = { head: 'Principal', deputy: 'Deputy principal', hod: 'Head of department', teacher: 'Teacher' } as const
export const CBC_LEVELS = ['Below Expectation', 'Approaching Expectation', 'Meeting Expectation', 'Exceeding Expectation']
export const SKILL_AREAS = ['Assessment', 'Lesson planning', 'Differentiation & inclusion', 'Classroom management', 'Learner-centred pedagogy', 'Digital & AI tools', 'Core competencies & values', 'Leadership', 'Wellbeing']

const EAT_MS = 3 * 3_600_000
/** "2026-10-09T17:00" typed in Kenya time → epoch ms. */
export const fromEatInput = (s: string) => (s ? Date.parse(`${s}:00Z`) - EAT_MS : NaN)
/** epoch ms → "2026-10-09T17:00" for a datetime-local field, in Kenya time. */
export const toEatInput = (ms: number) => new Date(ms + EAT_MS).toISOString().slice(0, 16)
export const eat = (ms: number) => new Date(ms).toLocaleString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Nairobi' }) + ' EAT'
export const eatDay = (ms: number) => new Date(ms).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' })
