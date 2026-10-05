'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePaginatedQuery, useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Empty, fmtTime, Loading, PageHeader, Pill, ReasonDialog, useRun } from '@/components/admin/common'

const REASON_LABEL: Record<string, string> = { spam: 'Spam', abusive: 'Abusive', misleading: 'Misleading', personal_info: 'Private info', other: 'Other' }
type Action =
  | { kind: 'hidePost'; postId: Id<'communityPosts'>; label: string }
  | { kind: 'restorePost'; postId: Id<'communityPosts'>; label: string }
  | { kind: 'hideReply'; commentId: Id<'communityComments'>; label: string }
  | { kind: 'restoreReply'; commentId: Id<'communityComments'>; label: string }
  | { kind: 'dismiss'; postId: Id<'communityPosts'>; commentId?: Id<'communityComments'>; label: string }

/** Reported posts and replies, plus a way to look through recent posts. Hiding keeps the content and can be undone. */
export default function CommunityModerationPage() {
  const [tab, setTab] = useState<'reports' | 'recent' | 'hidden'>('reports')
  const reports = useQuery(api.admin.community.reports, {})
  const recent = usePaginatedQuery(api.admin.community.posts, { status: 'active' }, { initialNumItems: 15 })
  const hidden = usePaginatedQuery(api.admin.community.posts, { status: 'hidden' }, { initialNumItems: 15 })
  const hidePost = useMutation(api.admin.community.hidePost)
  const restorePost = useMutation(api.admin.community.restorePost)
  const hideComment = useMutation(api.admin.community.hideComment)
  const restoreComment = useMutation(api.admin.community.restoreComment)
  const dismiss = useMutation(api.admin.community.dismiss)
  const { ok } = useRun()
  const [action, setAction] = useState<Action | null>(null)
  const [openThread, setOpenThread] = useState<Id<'communityPosts'> | null>(null)

  const TITLES: Record<Action['kind'], string> = {
    hidePost: 'Hide this post?', restorePost: 'Restore this post?', hideReply: 'Hide this reply?', restoreReply: 'Restore this reply?', dismiss: 'Dismiss the reports?',
  }
  const confirm = (reason: string) =>
    ok(() => {
      const a = action!
      if (a.kind === 'hidePost') return hidePost({ postId: a.postId, reason })
      if (a.kind === 'restorePost') return restorePost({ postId: a.postId, reason })
      if (a.kind === 'hideReply') return hideComment({ commentId: a.commentId, reason })
      if (a.kind === 'restoreReply') return restoreComment({ commentId: a.commentId, reason })
      return dismiss({ postId: a.postId, commentId: a.commentId, reason })
    }, 'Done')

  return (
    <>
      <PageHeader title="Community moderation" description="Reports from teachers, and recent discussions. Hiding removes content from view but keeps it, and the author is told why." />
      <div role="tablist" aria-label="Moderation views" className="mb-4 flex flex-wrap gap-2">
        {([['reports', `Reports${reports ? ` (${reports.length})` : ''}`], ['recent', 'Recent posts'], ['hidden', 'Hidden']] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-10 rounded-full border px-4 text-sm ${tab === id ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}>{label}</button>
        ))}
      </div>

      {tab === 'reports' && (reports === undefined ? <Loading /> : reports.length === 0 ? <Empty>No open reports. Nice and quiet.</Empty> : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.key} className="space-y-2 rounded-lg border bg-background p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{r.kind === 'reply' ? 'Reply' : 'Post'}: {r.title}</span>
                <span className="flex flex-wrap gap-1.5">
                  <Pill tone={r.count >= 3 ? 'red' : 'amber'}>{r.count} report{r.count === 1 ? '' : 's'}</Pill>
                  {r.reasons.map((x) => <Pill key={x}>{REASON_LABEL[x] ?? x}</Pill>)}
                  {r.alreadyHidden && <Pill tone="gray">hidden</Pill>}
                </span>
              </div>
              <p className="whitespace-pre-wrap">{r.text}</p>
              <p className="text-xs text-muted-foreground">
                By {r.authorId ? <Link href={`/admin/users/${r.authorId}`} className="text-primary hover:underline">{r.authorName}</Link> : r.authorName}{r.county ? ` · ${r.county}` : ''} · latest report {fmtTime(r.latestAt)}
              </p>
              {r.notes.length > 0 && <ul className="list-inside list-disc text-xs text-muted-foreground">{r.notes.map((n, i) => <li key={i}>“{n}”</li>)}</ul>}
              <div className="flex flex-wrap gap-2">
                {!r.alreadyHidden && <Button size="sm" variant="destructive" onClick={() => setAction(r.commentId ? { kind: 'hideReply', commentId: r.commentId, label: r.title } : { kind: 'hidePost', postId: r.postId, label: r.title })}>Hide {r.kind}…</Button>}
                <Button size="sm" variant="outline" onClick={() => setAction({ kind: 'dismiss', postId: r.postId, commentId: r.commentId ?? undefined, label: r.title })}>Dismiss reports…</Button>
                <Button size="sm" variant="ghost" onClick={() => setOpenThread(openThread === r.postId ? null : r.postId)}>{openThread === r.postId ? 'Hide thread' : 'See the thread'}</Button>
              </div>
              {openThread === r.postId && <Thread postId={r.postId} onHideReply={(id, label) => setAction({ kind: 'hideReply', commentId: id, label })} />}
            </li>
          ))}
        </ul>
      ))}

      {(tab === 'recent' || tab === 'hidden') && (() => {
        const list = tab === 'recent' ? recent : hidden
        return list.status === 'LoadingFirstPage' ? <Loading /> : list.results.length === 0 ? <Empty>Nothing here.</Empty> : (
          <>
            <ul className="divide-y rounded-lg border bg-background text-sm">
              {list.results.map((p) => (
                <li key={p._id} className="space-y-1 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{p.title}</span>
                    <span className="flex items-center gap-2">
                      <Pill>{p.category}</Pill>
                      {tab === 'recent'
                        ? <Button size="sm" variant="ghost" onClick={() => setAction({ kind: 'hidePost', postId: p._id, label: p.title })}>Hide…</Button>
                        : <Button size="sm" variant="outline" onClick={() => setAction({ kind: 'restorePost', postId: p._id, label: p.title })}>Restore…</Button>}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{p.text}</p>
                  <p className="text-xs text-muted-foreground">{p.authorName}{p.county ? ` · ${p.county}` : ''} · {p.commentsCount} replies · {fmtTime(p.createdAt)}{p.moderationReason ? ` · hidden because: ${p.moderationReason}` : ''}</p>
                </li>
              ))}
            </ul>
            {list.status === 'CanLoadMore' && <Button className="mt-3" variant="outline" onClick={() => list.loadMore(15)}>Load more</Button>}
          </>
        )
      })()}

      <ReasonDialog
        open={action !== null}
        onOpenChange={(o) => !o && setAction(null)}
        title={action ? TITLES[action.kind] : ''}
        description={action ? `“${action.label}”. ${action.kind.startsWith('hide') ? 'The author is told, with your reason.' : ''}` : undefined}
        confirmLabel="Confirm"
        destructive={action?.kind === 'hidePost' || action?.kind === 'hideReply'}
        onConfirm={confirm}
      />
    </>
  )
}

function Thread({ postId, onHideReply }: { postId: Id<'communityPosts'>; onHideReply: (id: Id<'communityComments'>, label: string) => void }) {
  const t = useQuery(api.admin.community.thread, { postId })
  if (!t) return <p className="text-xs text-muted-foreground">Loading…</p>
  return (
    <div className="space-y-2 rounded-md bg-muted/40 p-3">
      <p className="whitespace-pre-wrap text-sm">{t.post.content}</p>
      {t.comments.length === 0 ? <p className="text-xs text-muted-foreground">No replies.</p> : (
        <ul className="space-y-1 border-t pt-2">
          {t.comments.map((c) => (
            <li key={c._id} className="flex flex-wrap items-start justify-between gap-2 text-sm">
              <span className={c.hidden ? 'text-muted-foreground line-through' : ''}><b>{c.authorName}:</b> {c.body}</span>
              {!c.hidden && <Button size="sm" variant="ghost" onClick={() => onHideReply(c._id, c.body.slice(0, 40))}>Hide reply…</Button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
