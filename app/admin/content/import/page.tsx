'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useConvex, useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Empty, errorMessage, Loading, PageHeader, Pill, ReasonDialog, selectClass, useStaff } from '@/components/admin/common'
import { downloadXlsx } from '@/lib/admin/xlsx'
import { readXlsx } from '@/lib/admin/xlsx-read'
import { buildExample, buildTemplate, parseWorkbook, TEMPLATES, type ImportItem, type Parsed, type TemplateKind } from '@/lib/admin/content-sheets'

const KINDS = Object.keys(TEMPLATES) as TemplateKind[]
const TAB: Record<TemplateKind, string> = { path: '/admin/content', needs: '/admin/content?tab=needs', posts: '/admin/content?tab=blog', resources: '/admin/content?tab=resources', faq: '/admin/content?tab=faq' }
const MAX_FILE = 8 * 1024 * 1024

type Preview = { items: { kind: string; key: string; status: 'new' | 'changed' | 'unchanged' | 'blocked'; note?: string }[]; problems: { kind: string; key: string; message: string }[]; created: number; updated: number; unchanged: number; blocked: number }
type Loaded = { filename: string; parsed: Parsed; preview: Preview | null }

const STATUS_TONE = { new: 'green', changed: 'blue', unchanged: 'gray', blocked: 'red' } as const
const STATUS_TEXT = { new: 'New', changed: 'Will update', unchanged: 'No change', blocked: 'Blocked' } as const

export default function ImportPage() {
  const { can } = useStaff()
  const convex = useConvex()
  const programs = useQuery(api.admin.content.programs, {})
  const apply = useMutation(api.admin.contentImport.apply)
  const submitProgram = useMutation(api.admin.contentBuilder.submitProgram)
  const [kind, setKind] = useState<TemplateKind>('path')
  const [programKey, setProgramKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [kiswahili, setKiswahili] = useState(false)
  const [sent, setSent] = useState<{ submitted: number; skipped: { title: string; why: string }[] } | null>(null)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [saveOpen, setSaveOpen] = useState(false)
  const [done, setDone] = useState<{ created: number; updated: number; unchanged: number; programKey: string | null } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const editable = can('content.edit')

  const reset = () => {
    setLoaded(null)
    setDone(null)
    setSent(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const downloadBlank = () => {
    const { filename, sheets } = buildTemplate(kind, null, { kiswahili })
    downloadXlsx(filename, sheets)
  }

  const downloadSample = () => {
    const { filename, sheets } = buildExample(kind)
    downloadXlsx(filename, sheets)
  }

  const downloadCurrent = async () => {
    setBusy(true)
    try {
      if (kind === 'path' && !programKey) return toast.error('Choose a learning path first.')
      const items = (await convex.query(api.admin.contentImport.exportItems, { what: kind, key: kind === 'path' ? programKey : undefined })) as unknown as ImportItem[]
      if (!items.length) return toast.error('Nothing has been created here yet. Download the blank template instead.')
      const { filename, sheets } = buildTemplate(kind, items.map((i) => ({ ...i, label: '', where: '' })), { kiswahili: kiswahili || undefined })
      downloadXlsx(filename, sheets)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const onFile = async (file: File | undefined) => {
    setDone(null)
    setLoaded(null)
    if (!file) return
    if (!/\.xlsx$/i.test(file.name)) return toast.error('Please upload an Excel file ending in .xlsx. In Google Sheets use File → Download → Microsoft Excel.')
    if (file.size > MAX_FILE) return toast.error('That file is over 8 MB. Remove pictures from the workbook or split it into smaller files.')
    setBusy(true)
    try {
      const parsed = parseWorkbook(kind, await readXlsx(await file.arrayBuffer()))
      let preview: Preview | null = null
      if (!parsed.problems.some((p) => p.level === 'error') && parsed.items.length)
        preview = (await convex.query(api.admin.contentImport.preview, { items: strip(parsed.items) })) as unknown as Preview
      setLoaded({ filename: file.name, parsed, preview })
    } catch (e) {
      toast.error(e instanceof Error && /Excel|workbook|damaged|compression/.test(e.message) ? e.message : errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const errors = loaded?.parsed.problems.filter((p) => p.level === 'error') ?? []
  const warnings = loaded?.parsed.problems.filter((p) => p.level === 'warning') ?? []
  const serverProblems = loaded?.preview?.problems ?? []
  const changes = loaded?.preview ? loaded.preview.created + loaded.preview.updated : 0
  const canSave = Boolean(loaded?.preview) && errors.length === 0 && serverProblems.length === 0 && changes > 0
  const labels = useMemo(() => new Map((loaded?.parsed.items ?? []).map((i) => [`${i.kind}:${i.key}`, i.label])), [loaded])
  const sortedPrograms = (programs ?? []).filter((p) => !p.archived)

  if (programs === undefined) return <Loading />
  if (!editable)
    return (
      <>
        <PageHeader title="Upload & templates" />
        <Empty>Your role can read content but not change it. Ask a Content Manager or Super Admin to upload.</Empty>
      </>
    )

  return (
    <>
      <PageHeader
        title="Upload & templates"
        description="Download a spreadsheet, fill it in with Excel or Google Sheets, and upload it. It is saved as drafts; a second person reviews before anything reaches learners."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/content">Back to Content</Link>
          </Button>
        }
      />

      <section className="mb-8" aria-labelledby="what-h">
        <h2 id="what-h" className="mb-2 font-semibold">1. What are you adding or editing?</h2>
        <div role="radiogroup" aria-labelledby="what-h" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => {
                setKind(k)
                reset()
              }}
              className={`rounded-lg border p-4 text-left text-sm transition-colors ${kind === k ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'bg-background hover:bg-muted/40'}`}
            >
              <span className="block font-semibold">{TEMPLATES[k].title}</span>
              <span className="mt-1 block text-muted-foreground">{TEMPLATES[k].blurb}</span>
              <span className="mt-2 block text-xs text-muted-foreground">Sheets: {TEMPLATES[k].sheets}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-lg border bg-background p-4" aria-labelledby="dl-h">
        <h2 id="dl-h" className="font-semibold">2. Download the spreadsheet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The first sheet, “Start here”, explains every column. Start from a blank template for something new, or from what is there now to change it.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Button onClick={downloadBlank}>Download blank template</Button>
          <Button variant="outline" onClick={downloadSample}>See a filled example</Button>
          {kind === 'path' && (
            <div>
              <label htmlFor="existing-path" className="mb-1 block text-xs text-muted-foreground">Or edit an existing path</label>
              <select id="existing-path" className={selectClass} value={programKey} onChange={(e) => setProgramKey(e.target.value)}>
                <option value="">Choose a learning path…</option>
                {sortedPrograms.map((p) => (
                  <option key={p.key} value={p.key}>{p.title}</option>
                ))}
              </select>
            </div>
          )}
          <Button variant="outline" onClick={downloadCurrent} disabled={busy || (kind === 'path' && !programKey)}>
            {kind === 'path' ? 'Download that path to edit' : `Download current ${TEMPLATES[kind].title.toLowerCase()} to edit`}
          </Button>
        </div>
        {(kind === 'path') && (
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={kiswahili} onChange={(e) => setKiswahili(e.target.checked)} />
            Include Kiswahili columns (leave unticked if you are only writing English; existing translations are kept either way)
          </label>
        )}
      </section>

      <section className="mb-8 rounded-lg border bg-background p-4" aria-labelledby="up-h">
        <h2 id="up-h" className="font-semibold">3. Upload your finished file</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Nothing is saved yet: you will see exactly what would change, and any mistakes with the sheet and row to fix.
        </p>
        <div className="mt-3">
          <label htmlFor="xlsx-file" className="mb-1 block text-sm">Excel file (.xlsx)</label>
          <input
            id="xlsx-file"
            ref={fileRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={busy}
            onChange={(e) => onFile(e.target.files?.[0])}
            className="block w-full max-w-md text-sm file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-2 file:text-sm"
          />
          {busy && <p role="status" className="mt-2 text-sm text-muted-foreground">Reading your file…</p>}
        </div>
      </section>

      {loaded && !done && (
        <section className="mb-8 space-y-4" aria-labelledby="rev-h" aria-live="polite">
          <h2 id="rev-h" className="font-semibold">4. Check and save</h2>
          <p className="text-sm text-muted-foreground">File: {loaded.filename}</p>

          {errors.length > 0 && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm dark:border-red-900 dark:bg-red-950/40">
              <h3 className="font-semibold text-red-800 dark:text-red-200">Fix these in your spreadsheet, then upload it again ({errors.length})</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {errors.slice(0, 40).map((p, i) => (
                  <li key={i}>
                    <b>{p.where}:</b> {p.message}
                  </li>
                ))}
              </ul>
              {errors.length > 40 && <p className="mt-2">…and {errors.length - 40} more.</p>}
            </div>
          )}

          {serverProblems.length > 0 && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm dark:border-red-900 dark:bg-red-950/40">
              <h3 className="font-semibold text-red-800 dark:text-red-200">These cannot be saved right now</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {serverProblems.map((p, i) => (
                  <li key={i}>
                    <b>{labels.get(`${p.kind}:${p.key}`) ?? `${p.kind} ${p.key}`}:</b> {p.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/40">
              <h3 className="font-semibold text-amber-900 dark:text-amber-200">Can be saved, but needs finishing before it can go live ({warnings.length})</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {warnings.slice(0, 20).map((p, i) => (
                  <li key={i}>
                    <b>{p.where}:</b> {p.message}
                  </li>
                ))}
              </ul>
              {warnings.length > 20 && <p className="mt-2">…and {warnings.length - 20} more.</p>}
            </div>
          )}

          {loaded.preview && (
            <div className="rounded-lg border bg-background">
              <div className="flex flex-wrap gap-4 border-b p-3 text-sm">
                <span><b>{loaded.preview.created}</b> new</span>
                <span><b>{loaded.preview.updated}</b> will update</span>
                <span><b>{loaded.preview.unchanged}</b> no change</span>
                {loaded.preview.blocked > 0 && <span className="text-red-700"><b>{loaded.preview.blocked}</b> blocked</span>}
              </div>
              <ul className="max-h-96 divide-y overflow-auto text-sm">
                {loaded.preview.items.map((i) => (
                  <li key={`${i.kind}:${i.key}`} className="flex flex-wrap items-start justify-between gap-2 p-3">
                    <span>
                      {labels.get(`${i.kind}:${i.key}`) ?? `${i.kind} ${i.key}`}
                      {i.note && <span className="block text-xs text-muted-foreground">{i.note}</span>}
                    </span>
                    <Pill tone={STATUS_TONE[i.status]}>{STATUS_TEXT[i.status]}</Pill>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={!canSave} onClick={() => setSaveOpen(true)}>
              Save as drafts
            </Button>
            <Button variant="outline" onClick={reset}>
              Choose a different file
            </Button>
            {loaded.preview && changes === 0 && errors.length === 0 && <span className="text-sm text-muted-foreground">Nothing in this file differs from what is already saved.</span>}
          </div>
        </section>
      )}

      {done && (
        <section className="mb-8 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/40" aria-live="polite">
          <h2 className="font-semibold text-emerald-900 dark:text-emerald-200">Saved as drafts</h2>
          <p className="mt-1">{done.created} new, {done.updated} updated, {done.unchanged} unchanged. Nothing is live yet.</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5">
            <li>Check it reads well (use Preview as learner where available).</li>
            <li>Send it for review. A different person then approves it.</li>
            <li>Publish. Learners see it straight away.</li>
          </ol>
          {sent && (
            <p className="mt-3" role="status">
              {sent.submitted > 0 ? `Sent ${sent.submitted} items for review. A different reviewer can now approve them.` : 'Nothing was sent.'}
              {sent.skipped.length > 0 && ` Not ready yet: ${sent.skipped.slice(0, 3).map((x) => `${x.title} (${x.why})`).join('; ')}${sent.skipped.length > 3 ? '…' : ''}. Fix those in the studio, then send again.`}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {done.programKey && !sent && (
              <Button
                size="sm"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  try {
                    setSent(await submitProgram({ programKey: done.programKey! }))
                  } catch (e) {
                    toast.error(errorMessage(e))
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                Send for review now
              </Button>
            )}
            <Button asChild size="sm" variant="outline">
              <Link href={done.programKey ? `/admin/content/${done.programKey}` : TAB[kind]}>{done.programKey ? 'Open the path' : 'Open the content list'}</Link>
            </Button>
            <Button size="sm" variant="outline" onClick={reset}>
              Upload another file
            </Button>
          </div>
        </section>
      )}

      <ReasonDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        title="Save as drafts"
        confirmLabel="Save as drafts"
        description={
          loaded?.preview ? (
            <span>
              {loaded.preview.created} new and {loaded.preview.updated} updated items will be saved as drafts. Live content is not changed. Describe what you changed, for the record.
            </span>
          ) : undefined
        }
        onConfirm={async (reason) => {
          if (!loaded) return false
          try {
            const r = await apply({ items: strip(loaded.parsed.items), reason, filename: loaded.filename })
            setDone(r)
            setLoaded(null)
            if (fileRef.current) fileRef.current.value = ''
            toast.success('Saved as drafts.')
            return true
          } catch (e) {
            toast.error(errorMessage(e))
            return false
          }
        }}
      />
    </>
  )
}

const strip = (items: ImportItem[]) => items.map(({ kind, key, parent, data }) => ({ kind, key, ...(parent ? { parent } : {}), data }))
