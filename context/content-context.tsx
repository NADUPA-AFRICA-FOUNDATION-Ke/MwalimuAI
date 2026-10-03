'use client'

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { PROGRAMS, TRACKS, type Program } from '@/lib/learning-paths-data'
import { setProgramCatalog } from '@/lib/learning-progress'

interface ContentValue {
  /** Programs shown in the catalogue (published, not archived). */
  programs: Program[]
  /** Catalogue plus archived programs, for learners who already started them. */
  allPrograms: Program[]
  archivedIds: Set<string>
  tracks: typeof TRACKS
  getProgramById: (id: string) => Program | undefined
}

const staticValue: ContentValue = {
  programs: PROGRAMS,
  allPrograms: PROGRAMS,
  archivedIds: new Set(),
  tracks: TRACKS,
  getProgramById: (id) => PROGRAMS.find((p) => p.id === id),
}

const ContentContext = createContext<ContentValue>(staticValue)

/**
 * Learner curriculum. Content managed in the admin CMS overrides the bundled
 * curriculum program-by-program; anything the CMS doesn't manage (and every
 * program while the query is loading or unavailable) falls back to the static data,
 * so the learning area never renders empty.
 */
export function ContentProvider({ children }: { children: ReactNode }) {
  const remote = useQuery(api.content.publishedPrograms, {})

  const value = useMemo<ContentValue>(() => {
    if (!remote) return staticValue
    const managed = new Set(remote.managedKeys)
    const live = remote.programs as unknown as Program[]
    const archived = remote.archivedPrograms as unknown as Program[]
    const programs = [...PROGRAMS.filter((p) => !managed.has(p.id)), ...live]
    const allPrograms = [...programs, ...archived]
    const tracks = TRACKS.map((t) => ({ ...t, count: programs.filter((p) => p.track === t.id).length }))
    return {
      programs,
      allPrograms,
      tracks,
      archivedIds: new Set(archived.map((p) => p.id)),
      getProgramById: (id) => allPrograms.find((p) => p.id === id),
    }
  }, [remote])

  // Eligibility helpers in lib/learning-progress.ts run outside React.
  useEffect(() => {
    setProgramCatalog(value.allPrograms)
  }, [value])

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}

export const usePrograms = () => useContext(ContentContext)
