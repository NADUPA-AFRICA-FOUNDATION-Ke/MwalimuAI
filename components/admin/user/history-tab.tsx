'use client'

import { usePaginatedQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Empty, fmtTime, JsonDiff, Loading, useStaff } from '@/components/admin/common'

export function HistoryTab({ profileId }: { profileId: Id<'profiles'> }) {
  const { can } = useStaff()
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.audit.list,
    can('audit.read') ? { targetType: 'profile', targetId: profileId } : 'skip',
    { initialNumItems: 15 },
  )
  if (!can('audit.read')) return <Empty>Your role can&apos;t view the audit log.</Empty>
  if (status === 'LoadingFirstPage') return <Loading />
  if (results.length === 0) return <Empty>No admin actions on this user yet.</Empty>
  return (
    <div className="space-y-3">
      <ul className="divide-y rounded-lg border bg-background text-sm">
        {results.map((r) => (
          <li key={r._id} className="space-y-1.5 p-3">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-medium">{r.action}</span>
              <span className="text-xs text-muted-foreground">
                {fmtTime(r.createdAt)} · {r.actorEmail}
              </span>
            </div>
            {r.reason && <p className="text-muted-foreground">“{r.reason}”</p>}
            <JsonDiff before={r.before} after={r.after} />
          </li>
        ))}
      </ul>
      {status === 'CanLoadMore' && (
        <Button variant="outline" onClick={() => loadMore(15)}>
          Load more
        </Button>
      )}
    </div>
  )
}
