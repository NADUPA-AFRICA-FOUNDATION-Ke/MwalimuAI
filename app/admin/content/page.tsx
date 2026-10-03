'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Empty,
  Field,
  fmtTime,
  Loading,
  PageHeader,
  Pill,
  ReasonDialog,
  selectClass,
  useRun,
  useStaff,
} from '@/components/admin/common'

const TRACKS = ['core', 'stem', 'languages', 'humanities', 'leadership', 'wellbeing']

export default function ContentPage() {
  const { can, role } = useStaff()
  const programs = useQuery(api.admin.content.programs, {})
  const reviews = useQuery(api.admin.content.pendingReviews, {})
  const create = useMutation(api.admin.content.createItem)
  const importStatic = useMutation(api.admin.content.importStaticCurriculum)
  const { run, ok } = useRun()
  const router = useRouter()
  const [form, setForm] = useState({ key: '', title: '', track: 'core' })
  const [importOpen, setImportOpen] = useState(false)

  const createProgram = async () => {
    const id = await run(
      () =>
        create({
          kind: 'program',
          key: form.key,
          data: {
            title: form.title,
            shortTitle: form.title,
            tagline: '',
            description: '',
            track: form.track,
            kicdAlignment: '',
            hours: 1,
            accent: 'primary',
            available: true,
            launchingSoon: false,
            orderIndex: programs?.length ?? 0,
            assignment: { title: '', context: '', task: '', hints: [], rubric: [] },
            certificate: { subtitle: '', skills: [] },
            tags: { cbcLevels: [], subjects: [], counties: [] },
          },
        }),
      'Program created as a draft',
    )
    if (id) router.push(`/admin/content/item/${id}`)
  }

  return (
    <>
      <PageHeader
        title="Content"
        description="Draft → review → published. Nothing reaches learners until a second person approves it. Content is archived, never deleted."
      />
      {reviews && reviews.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 font-semibold">Waiting for review ({reviews.length})</h2>
          <ul className="divide-y rounded-lg border bg-background text-sm">
            {reviews.map((r) => (
              <li key={r.versionId}>
                <Link
                  href={`/admin/content/item/${r.itemId}`}
                  className="flex flex-wrap justify-between gap-2 p-3 hover:bg-muted/30"
                >
                  <span>
                    <b>{r.title}</b>{' '}
                    <span className="text-muted-foreground">
                      · {r.kind} in {r.programKey} · v{r.version}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    by {r.submittedBy} · {fmtTime(r.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="mb-2 font-semibold">Programs</h2>
      {!programs ? (
        <Loading />
      ) : programs.length === 0 ? (
        <Empty>
          <p>The CMS has no content yet. The learner app is showing the built-in curriculum.</p>
          {role === 'super_admin' && (
            <Button className="mt-3" onClick={() => setImportOpen(true)}>
              Import the built-in curriculum…
            </Button>
          )}
          {role !== 'super_admin' && <p className="mt-2">Ask a Super Admin to import it.</p>}
        </Empty>
      ) : (
        <ul className="divide-y rounded-lg border bg-background text-sm">
          {programs.map((p) => (
            <li key={p._id}>
              <Link
                href={`/admin/content/${p.key}`}
                className="flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-muted/30"
              >
                <div>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.key}
                    {p.cbcLevels.length ? ` · ${p.cbcLevels.join(', ')}` : ''}
                    {p.subjects.length ? ` · ${p.subjects.join(', ')}` : ''}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {p.archived && <Pill>archived</Pill>}
                  {p.published ? <Pill tone="green">live</Pill> : <Pill tone="gray">not live</Pill>}
                  {p.inReview && <Pill tone="amber">in review</Pill>}
                  {p.hasDraft && !p.inReview && <Pill tone="blue">draft</Pill>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {can('content.edit') && (
        <section className="mt-8 rounded-lg border bg-background p-4">
          <h2 className="mb-3 font-semibold">New program</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Title">
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm({
                    ...form,
                    title: e.target.value,
                    key:
                      form.key ||
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, '')
                        .slice(0, 50),
                  })
                }
              />
            </Field>
            <Field label="Key" hint="Permanent id used in links and progress.">
              <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase() })} />
            </Field>
            <Field label="Track">
              <select
                className={selectClass}
                value={form.track}
                onChange={(e) => setForm({ ...form, track: e.target.value })}
              >
                {TRACKS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
          </div>
          <Button className="mt-3" disabled={!form.title.trim() || !form.key} onClick={createProgram}>
            Create draft
          </Button>
        </section>
      )}

      <ReasonDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import the built-in curriculum"
        confirmLabel="Import"
        description="Copies every built-in program into the CMS as live content, keeping lesson ids so learners' progress stays valid. Programs already imported are skipped."
        onConfirm={async (reason) => ok(() => importStatic({ reason }), 'Curriculum imported')}
      />
    </>
  )
}
