'use client'

import { Component, createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { PROGRAMS, TRACKS, type Program } from '@/lib/learning-paths-data'
import { setProgramCatalog } from '@/lib/learning-progress'
import { useProfile } from '@/context/profile-context'

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

/** If the content query fails (e.g. the backend has not been updated yet), keep serving the bundled curriculum. */
class ContentFallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: unknown) { console.error('[content] CMS content unavailable, using the bundled curriculum:', error) }
  render() {
    return this.state.failed
      ? <ContentContext.Provider value={staticValue}>{this.props.children}</ContentContext.Provider>
      : <RemoteContent>{this.props.children}</RemoteContent>
  }
}

/**
 * Learner curriculum. Content managed in the admin CMS overrides the bundled
 * curriculum program-by-program; anything the CMS doesn't manage (and every
 * program while the query is loading or unavailable) falls back to the static data,
 * so the learning area never renders empty and never breaks if the CMS is unreachable.
 */
export function ContentProvider({ children }: { children: ReactNode }) {
  return <ContentFallback>{children}</ContentFallback>
}

function RemoteContent({ children }: { children: ReactNode }) {
  // Kiswahili copies are used where staff have written them; everything else stays English.
  const { lang } = useProfile()
  const remote = useQuery(api.content.publishedPrograms, { lang })

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
