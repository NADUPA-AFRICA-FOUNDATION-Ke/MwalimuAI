'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { ChevronLeft, Eye } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, Loading, PageHeader, Pill, selectClass, useRun, useStaff } from '@/components/admin/common'

type Item = NonNullable<ReturnType<typeof useItems>>[number]
const useItems = (programKey: string) => useQuery(api.admin.content.itemsForProgram, { programKey })

function StatusPills({ item }: { item: Item }) {
  return (
    <span className="flex flex-wrap gap-1">
      {item.archived && <Pill>archived</Pill>}
      {item.published ? <Pill tone="green">live v{item.published.version}</Pill> : <Pill>not live</Pill>}
      {item.draft && (
        <Pill
          tone={
            item.draft.status === 'in_review'
              ? 'amber'
              : item.draft.status === 'approved'
                ? 'blue'
                : item.draft.status === 'rejected'
                  ? 'red'
                  : 'gray'
          }
        >
          {item.draft.status.replace('_', ' ')} v{item.draft.version}
        </Pill>
      )}
    </span>
  )
}

function TreeRow({
  item,
  indent = 0,
  addLabel,
  onAdd,
}: {
  item: Item
  indent?: number
  addLabel?: string
  onAdd?: () => void
}) {
  return (
    <li
      className="flex flex-wrap items-center justify-between gap-2 p-3"
      style={{ paddingLeft: `${0.75 + indent * 1.5}rem` }}
    >
      <Link href={`/admin/content/item/${item._id}`} className="min-w-0 text-primary hover:underline">
        <span className="mr-2 text-xs uppercase text-muted-foreground">{item.kind}</span>
        {item.title}
      </Link>
      <span className="flex items-center gap-2">
        <StatusPills item={item} />
        {addLabel && !item.archived && (
          <Button size="sm" variant="ghost" onClick={onAdd}>
            {addLabel}
          </Button>
        )}
      </span>
    </li>
  )
}

export default function ProgramTreePage() {
  const { programKey } = useParams<{ programKey: string }>()
  const items = useItems(programKey)
  const { can } = useStaff()
  const create = useMutation(api.admin.content.createItem)
  const { run } = useRun()
  const router = useRouter()
  const [add, setAdd] = useState<null | { kind: 'module' | 'lesson' | 'quiz'; parent: Id<'cmsItems'> }>(null)
  const [f, setF] = useState({ key: '', title: '', quizKind: 'pre' })

  const tree = useMemo(() => {
    if (!items) return null
    const program = items.find((i) => i.kind === 'program')
    const by = (parent?: Id<'cmsItems'>, kind?: string) =>
      items
        .filter((i) => i.parentId === parent && (!kind || i.kind === kind))
        .sort((a, b) => a.orderIndex - b.orderIndex)
    return program
      ? {
          program,
          quizzes: by(program._id, 'quiz'),
          modules: by(program._id, 'module').map((m) => ({ m, lessons: by(m._id, 'lesson') })),
        }
      : null
  }, [items])

  if (!items) return <Loading />
  if (!tree) return <p>Program not found.</p>
  const { program } = tree

  const submit = async () => {
    if (!add) return
    const orderIndex =
      add.kind === 'module'
        ? tree.modules.length
        : add.kind === 'lesson'
          ? (tree.modules.find((x) => x.m._id === add.parent)?.lessons.length ?? 0)
          : tree.quizzes.length
    const data =
      add.kind === 'module'
        ? { title: f.title, description: '', orderIndex }
        : add.kind === 'lesson'
          ? {
              title: f.title,
              duration: '10 min',
              videoTitle: '',
              videoPoints: [],
              reading: `## ${f.title}\n\nWrite the lesson here.`,
              reflectionPrompt: '',
              reflectionPlaceholder: '',
              orderIndex,
            }
          : {
              kind: f.quizKind,
              orderIndex,
              questions: [
                {
                  id: 'q1',
                  question: 'Question text',
                  options: ['Option A', 'Option B', 'Option C', 'Option D'],
                  correct: 0,
                  explanation: '',
                },
              ],
            }
    const key = add.kind === 'quiz' ? f.quizKind : f.key
    const id = await run(() => create({ kind: add.kind, key, parentId: add.parent, data }), 'Created as a draft')
    if (id) {
      setAdd(null)
      setF({ key: '', title: '', quizKind: 'pre' })
      router.push(`/admin/content/item/${id}`)
    }
  }

  return (
    <>
      <Link
        href="/admin/content"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        All programs
      </Link>
      <PageHeader
        title={program.title}
        description={`Key: ${program.key}. Edit any item, then submit it for review.`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/content/${programKey}/preview?mode=draft`}>
                <Eye className="mr-2 h-4 w-4" />
                Preview as learner
              </Link>
            </Button>
          </>
        }
      />
      <ul className="divide-y rounded-lg border bg-background text-sm">
        <TreeRow item={program} />
        {tree.quizzes.map((q) => (
          <TreeRow key={q._id} item={q} indent={1} />
        ))}
        {can('content.edit') &&
        !(tree.quizzes.some((q) => q.key === 'pre') && tree.quizzes.some((q) => q.key === 'post')) ? (
          <li className="p-2 pl-9">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setF({ ...f, quizKind: tree.quizzes.some((q) => q.key === 'pre') ? 'post' : 'pre' })
                setAdd({ kind: 'quiz', parent: program._id })
              }}
            >
              + Add quiz
            </Button>
          </li>
        ) : null}
        {tree.modules.map(({ m, lessons }) => (
          <li key={m._id} className="list-none">
            <ul className="divide-y">
              <TreeRow
                item={m}
                indent={1}
                addLabel={can('content.edit') ? '+ Lesson' : undefined}
                onAdd={() => setAdd({ kind: 'lesson', parent: m._id })}
              />
              {lessons.map((l) => (
                <TreeRow key={l._id} item={l} indent={2} />
              ))}
            </ul>
          </li>
        ))}
        {can('content.edit') && (
          <li className="p-2 pl-9">
            <Button size="sm" variant="ghost" onClick={() => setAdd({ kind: 'module', parent: program._id })}>
              + Add module
            </Button>
          </li>
        )}
      </ul>

      {add && (
        <div className="mt-4 rounded-lg border bg-background p-4">
          <h2 className="mb-3 font-semibold">New {add.kind}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {add.kind === 'quiz' ? (
              <Field label="Quiz type">
                <select
                  className={selectClass}
                  value={f.quizKind}
                  onChange={(e) => setF({ ...f, quizKind: e.target.value })}
                >
                  <option value="pre">Pre-assessment</option>
                  <option value="post">Post-assessment (certificate test)</option>
                </select>
              </Field>
            ) : (
              <>
                <Field label="Title">
                  <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
                </Field>
                <Field
                  label="Key"
                  hint={add.kind === 'module' ? 'e.g. m4 (used in progress ids)' : 'e.g. l1 (unique inside the module)'}
                >
                  <Input value={f.key} onChange={(e) => setF({ ...f, key: e.target.value.toLowerCase() })} />
                </Field>
              </>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <Button disabled={add.kind !== 'quiz' && (!f.title.trim() || !f.key)} onClick={submit}>
              Create draft
            </Button>
            <Button variant="ghost" onClick={() => setAdd(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
