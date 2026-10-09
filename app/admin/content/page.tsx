'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AiPathWizard } from '@/components/admin/content/ai-path-wizard'
import { StudioSections } from '@/components/admin/content/studio-sections'
import { BookMarked, ChevronRight, ClipboardCheck, FilePen, Radio } from 'lucide-react'
import {
  Empty,
  Field,
  fmtTime,
  Loading,
  PageHeader,
  Panel,
  Pill,
  ReasonDialog,
  SearchField,
  selectClass,
  StatCard,
  StatGrid,
  Toolbar,
  useRun,
  useStaff,
} from '@/components/admin/common'

const TABS = [
  { id: 'paths', label: 'Learning paths' },
  { id: 'needs', label: 'Needs assessment' },
  { id: 'resources', label: 'Resource library' },
  { id: 'faq', label: 'FAQ' },
  { id: 'blog', label: 'Blog' },
] as const
const TRACKS = ['core', 'stem', 'languages', 'humanities', 'leadership', 'wellbeing']

export default function ContentPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ContentStudio />
    </Suspense>
  )
}

function ContentStudio() {
  const { can, role } = useStaff()
  const programs = useQuery(api.admin.content.programs, {})
  const reviews = useQuery(api.admin.content.pendingReviews, {})
  const createPath = useMutation(api.admin.contentBuilder.createProgramFromTemplate)
  const importStatic = useMutation(api.admin.content.importStaticCurriculum)
  const assessments = useQuery(api.admin.content.assessments, {})
  const importNeeds = useMutation(api.admin.content.importNeedsAssessment)
  const importLegacy = useMutation(api.admin.content.importLegacyModules)
  const { run, ok } = useRun()
  const router = useRouter()
  const search = useSearchParams()
  const [form, setForm] = useState({ title: '', track: 'core', description: '', modules: 3, lessons: 3, quizzes: true })
  const [importOpen, setImportOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [pathSearch, setPathSearch] = useState('')
  const tab = (TABS.find((t) => t.id === search.get('tab'))?.id ?? 'paths') as (typeof TABS)[number]['id']
  const aiTopic = search.get('ai')
  const [aiOpen, setAiOpen] = useState(Boolean(aiTopic))

  const pq = pathSearch.trim().toLowerCase()
  const shownPrograms = programs?.filter(
    (p) => !pq || [p.title, p.key, ...p.cbcLevels, ...p.subjects].some((v) => v.toLowerCase().includes(pq)),
  )

  const createProgram = async () => {
    const r = await run(
      () =>
        createPath({
          title: form.title,
          track: form.track,
          description: form.description,
          moduleCount: form.modules,
          lessonsPerModule: form.lessons,
          includeQuizzes: form.quizzes,
        }),
      'Learning path created. Fill in the lessons next.',
    )
    if (r) router.push(`/admin/content/${r.programKey}`)
  }

  return (
    <>
      <PageHeader
        title="Content"
        description="Draft → review → published. Nothing reaches learners until a second person approves it. Content is archived, never deleted."
        actions={
          <>
            {can('content.edit') && (
              <Button asChild size="sm">
                <Link href="/admin/content/import">Upload &amp; templates</Link>
              </Button>
            )}
            {can('analytics.read') && (
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/content/insights">Content insights</Link>
              </Button>
            )}
          </>
        }
      />
      {programs && (
        <StatGrid>
          <StatCard icon={<BookMarked />} label="Learning paths" value={programs.filter((p) => !p.archived).length} sub={`${programs.filter((p) => p.archived).length} archived`} />
          <StatCard icon={<Radio />} label="Live" value={programs.filter((p) => p.published && !p.archived).length} sub="visible to learners" />
          <StatCard icon={<FilePen />} label="With drafts" value={programs.filter((p) => p.hasDraft).length} sub="unpublished changes" />
          <StatCard icon={<ClipboardCheck />} label="Awaiting review" value={reviews?.length ?? '…'} sub="need a second person" tone={reviews?.length ? 'warn' : 'default'} />
        </StatGrid>
      )}
      {reviews && reviews.length > 0 && (
        <Panel title={`Waiting for review (${reviews.length})`} description="Nothing reaches learners until a second person approves it." className="mb-6 border-amber-300/70 dark:border-amber-900">
          <ul className="divide-y text-sm">
            {reviews.map((r) => (
              <li key={r.versionId}>
                <Link
                  href={`/admin/content/item/${r.itemId}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <span>
                    <b>{r.title}</b>{' '}
                    <span className="text-muted-foreground">
                      · {r.kind} in {r.programKey} · v{r.version}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    by {r.submittedBy} · {fmtTime(r.createdAt)}
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div role="tablist" aria-label="Kinds of content" className="mb-6 inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <Link
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            href={t.id === 'paths' ? '/admin/content' : `/admin/content?tab=${t.id}`}
            scroll={false}
            className={`inline-flex min-h-8 items-center rounded-md px-3 text-sm transition-colors ${tab === t.id ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === 'paths' && (
        <>
      {can('content.edit') && aiOpen && <AiPathWizard initialTopic={aiTopic ?? ''} onClose={() => setAiOpen(false)} />}
      {can('content.edit') && (
        <section className="mb-6 rounded-xl border bg-background p-4" aria-labelledby="new-path-h">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="new-path-h" className="font-semibold">Create a learning path</h2>
              <p className="text-sm text-muted-foreground">
                Sets up the whole outline in one step: modules, starter lessons and the pre and post assessments. You then fill in each lesson.
              </p>
            </div>
            {!creating && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setAiOpen(true)}>Create with AI</Button>
                <Button variant="outline" onClick={() => setCreating(true)}>Start from a blank outline</Button>
              </div>
            )}
          </div>
          {creating && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Title">
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Inclusive Classrooms" />
                </Field>
                <Field label="Track">
                  <select className={selectClass} value={form.track} onChange={(e) => setForm({ ...form, track: e.target.value })}>
                    {TRACKS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="What teachers will learn (optional)">
                <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Modules" hint="1 to 12. You can add or remove later.">
                  <Input type="number" min={1} max={12} value={form.modules} onChange={(e) => setForm({ ...form, modules: Math.min(12, Math.max(1, Math.floor(Number(e.target.value) || 1))) })} />
                </Field>
                <Field label="Lessons in each module" hint="1 to 10.">
                  <Input type="number" min={1} max={10} value={form.lessons} onChange={(e) => setForm({ ...form, lessons: Math.min(10, Math.max(1, Math.floor(Number(e.target.value) || 1))) })} />
                </Field>
                <label className="flex items-center gap-2 self-end pb-2 text-sm">
                  <input type="checkbox" checked={form.quizzes} onChange={(e) => setForm({ ...form, quizzes: e.target.checked })} />
                  Include pre and post assessments
                </label>
              </div>
              <p className="text-sm text-muted-foreground">
                This creates {1 + (form.quizzes ? 2 : 0) + form.modules * (1 + form.lessons)} drafts. Nothing is visible to learners until it is reviewed and published.
              </p>
              <div className="flex gap-2">
                <Button disabled={form.title.trim().length < 3} onClick={createProgram}>Create learning path</Button>
                <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </section>
      )}

      {can('content.publish') && programs && !programs.some((p) => p.key === 'module-1') && (
        <section className="mb-6 rounded-xl border border-dashed bg-background p-4" aria-labelledby="legacy-h">
          <h2 id="legacy-h" className="font-semibold">Older Learning Modules library</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Learners still see the original Modules pages, whose progress only lives on each device. Bring them in as short courses and they become normal learning paths you can edit, with progress saved to the account and counted in analytics. Existing device progress carries over, and the old addresses forward to the new ones.
          </p>
          <Button onClick={() => void run(() => importLegacy({}), 'Library modules are now short courses')}>Bring the library modules in</Button>
        </section>
      )}

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
        <Panel title="Learning paths">
        <Toolbar end={`${shownPrograms!.length} of ${programs.length}`}>
          <SearchField value={pathSearch} onChange={setPathSearch} placeholder="Search by title, key, level or subject" label="Search learning paths" />
        </Toolbar>
        {shownPrograms!.length === 0 ? <div className="p-4"><Empty>No learning paths match “{pathSearch}”.</Empty></div> : (
        <ul className="divide-y text-sm">
          {shownPrograms!.map((p) => (
            <li key={p._id}>
              <Link
                href={`/admin/content/${p.key}`}
                className={`flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 ${p.archived ? 'opacity-60' : ''}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true"><BookMarked className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.key}
                    {p.cbcLevels.length ? ` · ${p.cbcLevels.join(', ')}` : ''}
                    {p.subjects.length ? ` · ${p.subjects.join(', ')}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {p.archived && <Pill>archived</Pill>}
                  {p.published ? <Pill tone="green">live</Pill> : <Pill tone="gray">not live</Pill>}
                  {p.inReview && <Pill tone="amber">in review</Pill>}
                  {p.hasDraft && !p.inReview && <Pill tone="blue">draft</Pill>}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
        )}
        </Panel>
      )}

        </>
      )}

      {tab === 'needs' && (
      <section className="mb-8 rounded-xl border bg-background p-4" aria-labelledby="needs-h">
        <h2 id="needs-h" className="font-semibold">Needs assessment</h2>
        <p className="text-sm text-muted-foreground">
          The questionnaire new teachers answer to get recommended learning paths. Edit the questions, sections and which paths are recommended.
        </p>
        {assessments === undefined ? null : assessments.length === 0 ? (
          <div className="mt-3">
            <p className="mb-2 text-sm">Learners currently see the built-in questionnaire. Copy it here to start editing it.</p>
            {can('content.edit') ? (
              <Button
                onClick={async () => {
                  const id = await run(() => importNeeds({}), 'Copied. It is a draft until you release it.')
                  if (id) router.push(`/admin/content/item/${id}`)
                }}
              >
                Copy the built-in questionnaire to edit
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Ask a content editor to set this up.</p>
            )}
          </div>
        ) : (
          <ul className="mt-3 divide-y rounded-lg border text-sm">
            {assessments.map((a) => (
              <li key={a._id}>
                <Link href={`/admin/content/item/${a._id}`} className="flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-muted/30">
                  <span className="font-medium">{a.title}</span>
                  <span className="flex gap-1.5">
                    {a.archived && <Pill>archived</Pill>}
                    {a.published ? <Pill tone="green">live</Pill> : <Pill>not live</Pill>}
                    {a.hasDraft && <Pill tone="blue">draft</Pill>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      )}

      <StudioSections tab={tab} />

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
