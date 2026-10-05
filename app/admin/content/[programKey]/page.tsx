'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { AlertTriangle, ArrowDown, ArrowUp, ChevronLeft, Copy, Eye, Plus } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { ItemEditor } from '@/components/admin/content/item-editor'
import { Loading, PageHeader, Pill, ReasonDialog, useRun, useStaff } from '@/components/admin/common'

type Item = NonNullable<ReturnType<typeof useItems>>[number]
const useItems = (programKey: string) => useQuery(api.admin.content.itemsForProgram, { programKey })

const byOrder = (a: Item, b: Item) => a.orderIndex - b.orderIndex

function statusOf(i: Item) {
  if (i.archived) return { label: 'archived', tone: 'gray' as const }
  if (i.draft?.status === 'in_review') return { label: 'in review', tone: 'amber' as const }
  if (i.draft?.status === 'approved') return { label: 'approved', tone: 'blue' as const }
  if (i.draft?.status === 'rejected') return { label: 'changes requested', tone: 'red' as const }
  if (i.draft) return { label: i.published ? 'edited' : 'draft', tone: 'gray' as const }
  if (i.published) return { label: 'live', tone: 'green' as const }
  return { label: 'not live', tone: 'gray' as const }
}

export default function ProgramBuilderPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Builder />
    </Suspense>
  )
}

function Builder() {
  const { programKey } = useParams<{ programKey: string }>()
  const router = useRouter()
  const search = useSearchParams()
  const items = useItems(programKey)
  const { can } = useStaff()
  const { run, ok } = useRun()
  const addChild = useMutation(api.admin.contentBuilder.addChild)
  const reorder = useMutation(api.admin.contentBuilder.reorder)
  const duplicate = useMutation(api.admin.contentBuilder.duplicate)
  const [dialog, setDialog] = useState<null | 'approve' | 'reject' | 'publish'>(null)

  const tree = useMemo(() => {
    if (!items) return null
    const program = items.find((i) => i.kind === 'program')
    const kids = (parent: Id<'cmsItems'>, kind: Item['kind']) => items.filter((i) => i.parentId === parent && i.kind === kind).sort(byOrder)
    if (!program) return null
    return {
      program,
      quizzes: kids(program._id, 'quiz'),
      modules: kids(program._id, 'module').map((m) => ({ m, lessons: kids(m._id, 'lesson') })),
    }
  }, [items])

  if (!items) return <Loading />
  if (!tree) return <p>Learning path not found.</p>
  const { program } = tree
  const edit = can('content.edit')
  const selectedId = (search.get('item') as Id<'cmsItems'> | null) ?? program._id
  const select = (id: Id<'cmsItems'>) => {
    router.replace(`/admin/content/${programKey}?item=${id}`, { scroll: false })
    // On phones the editor sits below the outline.
    requestAnimationFrame(() => document.getElementById('item-editor')?.scrollIntoView({ block: 'start' }))
  }

  const live = items.filter((i) => !i.archived)
  const counts = {
    draft: live.filter((i) => i.draft?.status === 'draft').length,
    review: live.filter((i) => i.draft?.status === 'in_review').length,
    approved: live.filter((i) => i.draft?.status === 'approved').length,
  }
  const blocked = live.filter((i) => i.draft?.status === 'draft' && i.problem)
  const hasPre = tree.quizzes.some((q) => q.key === 'pre')
  const hasPost = tree.quizzes.some((q) => q.key === 'post')

  const add = async (parent: Id<'cmsItems'>, kind: 'module' | 'lesson' | 'quiz', quizKind?: 'pre' | 'post') => {
    const id = await run(() => addChild({ parentId: parent, kind, quizKind }), `${kind === 'quiz' ? 'Assessment' : kind === 'module' ? 'Module' : 'Lesson'} added`)
    if (id) select(id)
  }
  const move = async (siblings: Item[], index: number, by: -1 | 1) => {
    const next = [...siblings]
    ;[next[index], next[index + by]] = [next[index + by], next[index]]
    await run(() => reorder({ parentId: siblings[0].parentId!, orderedIds: next.map((i) => i._id) }))
  }
  const copy = async (i: Item) => {
    const r = await run(() => duplicate({ itemId: i._id }), 'Copied as a new draft')
    if (r) {
      if (i.kind === 'program') router.push(`/admin/content/${r.programKey}`)
      else select(r.itemId)
    }
  }

  // A plain function (not a component) so rows keep their identity, and focus, across re-renders.
  const renderRow = ({ item, siblings, index, indent }: { item: Item; siblings?: Item[]; index?: number; indent: number }) => {
    const st = statusOf(item)
    const active = item._id === selectedId
    return (
      <li key={item._id} className={`flex items-center gap-1 pr-1 ${active ? 'bg-secondary' : ''}`} style={{ paddingLeft: `${0.5 + indent * 1.25}rem` }}>
        <button
          type="button"
          onClick={() => select(item._id)}
          aria-current={active ? 'true' : undefined}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 py-1 text-left text-sm hover:text-primary"
        >
          {item.problem && !item.archived && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-label={`Needs work: ${item.problem}`} />}
          <span className="min-w-0 flex-1 truncate">{item.kind === 'quiz' ? (item.key === 'pre' ? 'Pre-assessment' : 'Post-assessment') : item.title}</span>
          <Pill tone={st.tone}>{st.label}</Pill>
        </button>
        {edit && siblings && index !== undefined && siblings.length > 1 && (
          <span className="flex shrink-0">
            <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={`Move ${item.title} up`} disabled={index === 0} onClick={() => void move(siblings, index, -1)}>
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={`Move ${item.title} down`} disabled={index === siblings.length - 1} onClick={() => void move(siblings, index, 1)}>
              <ArrowDown className="h-4 w-4" />
            </Button>
          </span>
        )}
        {edit && (item.kind === 'lesson' || item.kind === 'module') && (
          <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" aria-label={`Duplicate ${item.title}`} onClick={() => void copy(item)}>
            <Copy className="h-4 w-4" />
          </Button>
        )}
      </li>
    )
  }

  return (
    <>
      <Link href="/admin/content" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        All learning paths
      </Link>
      <PageHeader
        title={program.title}
        description="Build the path on the left, edit what you select on the right. When it is ready, release the whole path for review."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/content/${programKey}/preview?mode=draft`}>
                <Eye className="mr-2 h-4 w-4" />
                Preview as learner
              </Link>
            </Button>
            {edit && (
              <Button variant="outline" size="sm" onClick={() => void copy(program)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate path
              </Button>
            )}
          </>
        }
      />

      <ReleasePanel
        programKey={programKey}
        counts={counts}
        blocked={blocked}
        onOpen={select}
        dialog={dialog}
        setDialog={setDialog}
        ok={ok}
      />

      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <nav aria-label="Learning path outline" className="self-start lg:sticky lg:top-4">
          <ul className="divide-y rounded-lg border bg-background">
            {renderRow({ item: program, indent: 0 })}
            {tree.quizzes.map((q) => renderRow({ item: q, indent: 1 }))}
            {edit && (!hasPre || !hasPost) && (
              <li className="p-1 pl-6">
                <Button size="sm" variant="ghost" className="min-h-9" onClick={() => void add(program._id, 'quiz', hasPre ? 'post' : 'pre')}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add {hasPre ? 'post' : 'pre'}-assessment
                </Button>
              </li>
            )}
            {tree.modules.map(({ m, lessons }, mi) => (
              <li key={m._id}>
                <ul className="divide-y">
                  {renderRow({ item: m, siblings: tree.modules.map((x) => x.m), index: mi, indent: 1 })}
                  {lessons.map((l, li) => renderRow({ item: l, siblings: lessons, index: li, indent: 2 }))}
                  {edit && !m.archived && (
                    <li className="p-1 pl-12">
                      <Button size="sm" variant="ghost" className="min-h-9" onClick={() => void add(m._id, 'lesson')}>
                        <Plus className="mr-1 h-4 w-4" />
                        Add lesson
                      </Button>
                    </li>
                  )}
                </ul>
              </li>
            ))}
            {edit && (
              <li className="p-1 pl-6">
                <Button size="sm" variant="ghost" className="min-h-9" onClick={() => void add(program._id, 'module')}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add module
                </Button>
              </li>
            )}
          </ul>
        </nav>

        <div id="item-editor" className="min-w-0 scroll-mt-4">
          <ItemEditor key={selectedId} itemId={selectedId} embedded />
        </div>
      </div>
    </>
  )
}

function ReleasePanel({
  programKey,
  counts,
  blocked,
  onOpen,
  dialog,
  setDialog,
  ok,
}: {
  programKey: string
  counts: { draft: number; review: number; approved: number }
  blocked: Item[]
  onOpen: (id: Id<'cmsItems'>) => void
  dialog: null | 'approve' | 'reject' | 'publish'
  setDialog: (d: null | 'approve' | 'reject' | 'publish') => void
  ok: (fn: () => Promise<unknown>, success?: string) => Promise<boolean>
}) {
  const { can } = useStaff()
  const submitProgram = useMutation(api.admin.contentBuilder.submitProgram)
  const reviewProgram = useMutation(api.admin.contentBuilder.reviewProgram)
  const publishProgram = useMutation(api.admin.contentBuilder.publishProgram)
  const { run } = useRun()
  const [note, setNote] = useState<string | null>(null)

  if (counts.draft + counts.review + counts.approved === 0) return null

  const submit = async (partial: boolean) => {
    const r = await run(() => submitProgram({ programKey, partial }))
    if (!r) return
    if (r.submitted > 0) setNote(`Submitted ${r.submitted} item${r.submitted === 1 ? '' : 's'} for review.`)
    else setNote(`Nothing was submitted. ${r.skipped.length} item${r.skipped.length === 1 ? ' is' : 's are'} not ready yet.`)
  }

  return (
    <section className="mb-6 rounded-lg border bg-background p-4" aria-labelledby="release-h">
      <h2 id="release-h" className="font-semibold">Release this path</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {counts.draft} draft · {counts.review} in review · {counts.approved} approved. Review needs a second person, and nothing reaches learners until it is published.
      </p>
      {blocked.length > 0 && (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <p className="font-medium">{blocked.length} item{blocked.length === 1 ? '' : 's'} still need work before this can be submitted:</p>
          <ul className="mt-1 list-inside list-disc">
            {blocked.slice(0, 8).map((b) => (
              <li key={b._id}>
                <button type="button" className="underline" onClick={() => onOpen(b._id)}>{b.kind === 'quiz' ? `${b.key}-assessment` : b.title}</button>: {b.problem}
              </li>
            ))}
            {blocked.length > 8 && <li>and {blocked.length - 8} more</li>}
          </ul>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {can('content.edit') && counts.draft > 0 && (
          <>
            <Button onClick={() => void submit(false)} disabled={blocked.length > 0}>Submit all for review</Button>
            {blocked.length > 0 && blocked.length < counts.draft && (
              <Button variant="outline" onClick={() => void submit(true)}>Submit only the ready items</Button>
            )}
          </>
        )}
        {can('content.review') && counts.review > 0 && (
          <>
            <Button onClick={() => setDialog('approve')}>Approve all…</Button>
            <Button variant="outline" onClick={() => setDialog('reject')}>Request changes…</Button>
          </>
        )}
        {can('content.publish') && counts.approved > 0 && <Button onClick={() => setDialog('publish')}>Publish all…</Button>}
        {note && <span className="text-sm text-muted-foreground" role="status">{note}</span>}
      </div>
      <ReasonDialog
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        destructive={dialog === 'reject'}
        title={dialog === 'publish' ? 'Publish this path to learners' : dialog === 'reject' ? 'Request changes' : 'Approve everything in review'}
        description={
          dialog === 'publish'
            ? 'Every approved item goes live for all learners now.'
            : dialog === 'reject'
              ? 'Say what needs to change. Items you submitted yourself are left for someone else.'
              : 'Items you submitted yourself are skipped: a second person must review those.'
        }
        confirmLabel="Confirm"
        onConfirm={(reason) =>
          ok(async () => {
            if (dialog === 'publish') {
              const r = await publishProgram({ programKey, reason })
              setNote(`Published ${r.published} item${r.published === 1 ? '' : 's'}${r.skipped.length ? `; ${r.skipped.length} could not be published: ${r.skipped[0].why}` : ''}.`)
            } else {
              const r = await reviewProgram({ programKey, decision: dialog === 'reject' ? 'reject' : 'approve', reason })
              setNote(`${dialog === 'reject' ? 'Sent back' : 'Approved'} ${r.reviewed} item${r.reviewed === 1 ? '' : 's'}${r.ownWork ? `; ${r.ownWork} skipped because you submitted them` : ''}.`)
            }
          })
        }
      />
    </section>
  )
}
