/** Search and filter for the admin analytics programs table. Pure, so it is unit tested. */

export type FilterableProgram = {
  id: string
  title: string
  enrolled: number
  completionRate: number
  funnel: { key: string; title: string; module: string }[]
}

export type ProgramFilter = 'all' | 'started' | 'not_started' | 'low_completion' | 'has_certificates'
export type ProgramSort = 'title' | 'enrolled' | 'completion'

/** Below this completion rate (with at least one learner) a program counts as "low completion". */
export const LOW_COMPLETION_PCT = 30

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim()

/**
 * Returns the programs to show, each with the lesson keys that matched the search (null when the search
 * matched the program itself, or there is no search, meaning "show every lesson").
 */
export function filterPrograms<P extends FilterableProgram & { completed?: number }>(
  programs: P[],
  { query = '', filter = 'all', sort = 'title' }: { query?: string; filter?: ProgramFilter; sort?: ProgramSort },
): { program: P; lessonMatches: Set<string> | null }[] {
  const q = norm(query)
  const out: { program: P; lessonMatches: Set<string> | null }[] = []
  for (const p of programs) {
    if (filter === 'started' && p.enrolled === 0) continue
    if (filter === 'not_started' && p.enrolled > 0) continue
    if (filter === 'low_completion' && !(p.enrolled > 0 && p.completionRate < LOW_COMPLETION_PCT)) continue
    if (filter === 'has_certificates' && !((p.completed ?? 0) > 0)) continue
    if (!q || norm(p.title).includes(q)) {
      out.push({ program: p, lessonMatches: null })
      continue
    }
    const hits = p.funnel.filter((l) => norm(l.title).includes(q) || norm(l.module).includes(q))
    if (hits.length) out.push({ program: p, lessonMatches: new Set(hits.map((l) => l.key)) })
  }
  const by: Record<ProgramSort, (a: P, b: P) => number> = {
    title: (a, b) => a.title.localeCompare(b.title),
    enrolled: (a, b) => b.enrolled - a.enrolled || a.title.localeCompare(b.title),
    completion: (a, b) => b.completionRate - a.completionRate || a.title.localeCompare(b.title),
  }
  return out.sort((a, b) => by[sort](a.program, b.program))
}
