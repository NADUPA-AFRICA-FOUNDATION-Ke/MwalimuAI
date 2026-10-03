'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { ChevronLeft, Eye } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModuleForm, LessonForm, ProgramForm, QuizForm, type Data } from '@/components/admin/content/forms'
import { TagPicker } from '@/components/admin/content/tag-picker'
import {
  Empty,
  Field,
  fmtTime,
  Loading,
  PageHeader,
  Pill,
  ReasonDialog,
  useRun,
  useStaff,
} from '@/components/admin/common'

export default function ItemEditorPage() {
  const { id } = useParams<{ id: string }>()
  const itemId = id as Id<'cmsItems'>
  const detail = useQuery(api.admin.content.getItem, { itemId })
  const tax = useQuery(api.admin.content.taxonomy, {})
  const { can, email } = useStaff()
  const save = useMutation(api.admin.content.saveDraft)
  const submit = useMutation(api.admin.content.submitForReview)
  const withdraw = useMutation(api.admin.content.withdraw)
  const review = useMutation(api.admin.content.review)
  const publish = useMutation(api.admin.content.publish)
  const discard = useMutation(api.admin.content.discardDraft)
  const archive = useMutation(api.admin.content.archive)
  const unarchive = useMutation(api.admin.content.unarchive)
  const { run, busy } = useRun()
  const source: Data | undefined = (detail?.draft?.data ?? detail?.published?.data) as Data | undefined
  const [data, setData] = useState<Data | null>(null)
  const [dirty, setDirty] = useState(false)
  const [dialog, setDialog] = useState<null | 'approve' | 'reject' | 'publish' | 'discard' | 'archive' | 'unarchive'>(
    null,
  )
  const draftId = detail?.draft?._id

  // Reset the form when the server copy changes (and there is nothing unsaved).
  useEffect(() => {
    if (source && !dirty) setData(source)
  }, [source, dirty])

  if (!detail || !tax) return <Loading />
  if (!data) return <Empty>This item has no content yet.</Empty>
  const { item, draft } = detail
  const status = draft?.status
  const locked = status === 'in_review' || status === 'approved' || item.archived
  const canEdit = can('content.edit') && !locked
  const set = (patch: Data) => {
    setData({ ...data, ...patch })
    setDirty(true)
  }
  const mine = detail.history.find((h) => h._id === draft?._id)?.submittedBy === email
  const programKey = item.programKey

  const doSave = async () => {
    const r = await run(() => save({ itemId, data, baseVersionId: draftId }), 'Draft saved')
    if (r !== undefined) setDirty(false)
    return r !== undefined
  }

  return (
    <>
      <Link
        href={`/admin/content/${programKey}`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {programKey}
      </Link>
      <PageHeader
        title={data.title ?? `${data.kind} quiz`}
        description={`${item.kind} · key ${item.key}`}
        actions={
          <>
            {item.archived && <Pill>archived</Pill>}
            {detail.published && <Pill tone="green">live v{detail.published.version}</Pill>}
            {status && (
              <Pill
                tone={
                  status === 'approved'
                    ? 'blue'
                    : status === 'in_review'
                      ? 'amber'
                      : status === 'rejected'
                        ? 'red'
                        : 'gray'
                }
              >
                {status.replace('_', ' ')}
              </Pill>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/content/${programKey}/preview?mode=draft`}>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Link>
            </Button>
          </>
        }
      />

      {draft?.reviewComment && (status === 'rejected' || status === 'approved') && (
        <p
          className={`mb-4 rounded-md border p-3 text-sm ${status === 'rejected' ? 'border-red-300 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100' : 'border-sky-300 bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-100'}`}
        >
          Reviewer comment: {draft.reviewComment}
        </p>
      )}
      {locked && !item.archived && (
        <p className="mb-4 rounded-md bg-muted p-3 text-sm">
          {status === 'in_review'
            ? 'Awaiting review, so editing is locked. Withdraw it to keep editing.'
            : 'Approved. Publish it, or discard the draft to edit again.'}
        </p>
      )}
      {item.archived && (
        <p className="mb-4 rounded-md bg-muted p-3 text-sm">
          Archived: hidden from new learners. Learners who already started it can still finish.
        </p>
      )}
      {!detail.published && !item.archived && (
        <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Not live yet. Learners can&apos;t see this until it is reviewed and published
          {item.kind !== 'program' ? ', and its parent is live' : ''}.
        </p>
      )}

      <div className="space-y-6">
        <fieldset disabled={!canEdit} className="space-y-6 rounded-lg border bg-background p-4 disabled:opacity-90">
          {item.kind === 'program' && <ProgramForm data={data} set={set} />}
          {item.kind === 'module' && <ModuleForm data={data} set={set} />}
          {item.kind === 'lesson' && <LessonForm data={data} set={set} />}
          {item.kind === 'quiz' && <QuizForm data={data} set={set} />}
          <Field label="Display order" hint="Lower numbers come first.">
            <Input
              type="number"
              min={0}
              className="w-28"
              value={data.orderIndex ?? 0}
              onChange={(e) => set({ orderIndex: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
            />
          </Field>
          <TagPicker tags={data.tags} tax={tax} onChange={(tags) => set({ tags })} />
        </fieldset>

        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-2 border-t bg-background/95 p-3 backdrop-blur md:static md:mx-0 md:rounded-lg md:border">
          {canEdit && (
            <Button onClick={doSave} disabled={busy || !dirty}>
              Save draft
            </Button>
          )}
          {can('content.edit') &&
            !item.archived &&
            (status === 'draft' || status === 'rejected' || (!status && dirty)) && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={async () => {
                  if (dirty && !(await doSave())) return
                  await run(() => submit({ itemId }), 'Submitted for review')
                }}
              >
                Submit for review
              </Button>
            )}
          {status === 'in_review' && can('content.edit') && (
            <Button variant="outline" onClick={() => run(() => withdraw({ itemId }), 'Withdrawn')}>
              Withdraw
            </Button>
          )}
          {status === 'in_review' && can('content.review') && !mine && (
            <>
              <Button onClick={() => setDialog('approve')}>Approve…</Button>
              <Button variant="outline" onClick={() => setDialog('reject')}>
                Request changes…
              </Button>
            </>
          )}
          {status === 'in_review' && mine && (
            <span className="text-sm text-muted-foreground">Someone else must review this: you submitted it.</span>
          )}
          {status === 'approved' && can('content.publish') && (
            <Button onClick={() => setDialog('publish')}>Publish…</Button>
          )}
          {draft && detail.published && can('content.edit') && !item.archived && (
            <Button variant="ghost" onClick={() => setDialog('discard')}>
              Discard draft…
            </Button>
          )}
          {can('content.publish') &&
            (item.archived ? (
              <Button variant="ghost" onClick={() => setDialog('unarchive')}>
                Unarchive…
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setDialog('archive')}>
                Archive…
              </Button>
            ))}
          {dirty && (
            <span className="text-xs text-muted-foreground" role="status">
              Unsaved changes
            </span>
          )}
        </div>

        <section>
          <h2 className="mb-2 text-sm font-semibold">Version history</h2>
          <ul className="divide-y rounded-lg border bg-background text-sm">
            {detail.history.map((h) => (
              <li key={h._id} className="flex flex-wrap justify-between gap-2 p-3">
                <span>
                  v{h.version}{' '}
                  <Pill tone={h.status === 'published' ? 'green' : 'gray'}>{h.status.replace('_', ' ')}</Pill>
                  {h.reviewComment ? <span className="ml-2 text-muted-foreground">“{h.reviewComment}”</span> : null}
                </span>
                <span className="text-xs text-muted-foreground">
                  {h.author ? `by ${h.author} · ` : ''}
                  {h.reviewedBy ? `reviewed by ${h.reviewedBy} · ` : ''}
                  {fmtTime(h.publishedAt ?? h.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <ReasonDialog
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        destructive={dialog === 'archive' || dialog === 'reject'}
        title={
          {
            approve: 'Approve this version',
            reject: 'Request changes',
            publish: 'Publish to learners',
            discard: 'Discard the draft',
            archive: 'Archive this item',
            unarchive: 'Unarchive this item',
          }[dialog ?? 'approve']
        }
        description={
          dialog === 'publish'
            ? 'This goes live for all learners immediately.'
            : dialog === 'archive'
              ? 'It disappears for new learners. Nothing is deleted, and learners who started it keep access.'
              : dialog === 'reject'
                ? 'Say what needs to change, so the author can fix it.'
                : undefined
        }
        confirmLabel="Confirm"
        onConfirm={async (reason) => {
          const fn = {
            approve: () => review({ itemId, decision: 'approve', reason }),
            reject: () => review({ itemId, decision: 'reject', reason }),
            publish: () => publish({ itemId, reason }),
            discard: () => discard({ itemId, reason }),
            archive: () => archive({ itemId, reason }),
            unarchive: () => unarchive({ itemId, reason }),
          }[dialog!]
          const r = await run(fn, 'Done')
          if (r !== undefined) setDirty(false)
          return r !== undefined
        }}
      />
    </>
  )
}
