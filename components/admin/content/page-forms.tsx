'use client'

import { useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { ArrowDown, ArrowUp, Loader2, Paperclip, Plus, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { Field, selectClass, errorMessage } from '@/components/admin/common'
import { askAi } from '@/lib/admin/ai-client'
import type { ImproveAction } from '@/lib/admin-ai'
import type { Data, FormProps } from './forms'

const swap = <T,>(list: T[], a: number, b: number) => {
  const next = [...list]
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}
const newId = () => Math.random().toString(36).slice(2, 8)
const Move = ({ i, n, on, label }: { i: number; n: number; on: (to: number) => void; label: string }) => (
  <>
    <Button type="button" size="icon" variant="ghost" aria-label={`Move ${label} up`} disabled={i === 0} onClick={() => on(i - 1)}><ArrowUp className="h-4 w-4" /></Button>
    <Button type="button" size="icon" variant="ghost" aria-label={`Move ${label} down`} disabled={i === n - 1} onClick={() => on(i + 1)}><ArrowDown className="h-4 w-4" /></Button>
  </>
)

// ── Resource library ───────────────────────────────────────────────────────

type Res = { id: string; title: string; description: string; type: string; url: string; size: string; tags: string[]; free: boolean; file?: { storageId: string; name: string } }
const TYPES = ['PDF', 'Video', 'Link', 'Template', 'Audio']

export function ResourcesForm({ data, set }: FormProps) {
  const items: Res[] = data.items ?? []
  const upload = useMutation(api.admin.content.generateUploadUrl)
  const [busy, setBusy] = useState<string | null>(null)
  const setItem = (i: number, patch: Partial<Res>) => set({ items: items.map((r, j) => (j === i ? { ...r, ...patch } : r)) })

  async function attach(i: number, file: File) {
    if (file.size > 25 * 1024 * 1024) return toast.error('That file is over 25 MB. Compress it or share a link instead.')
    setBusy(items[i].id)
    try {
      const url = await upload({})
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file })
      if (!res.ok) throw new Error('upload failed')
      const { storageId } = (await res.json()) as { storageId: string }
      setItem(i, { file: { storageId, name: file.name }, size: `${(file.size / 1048576).toFixed(1)} MB`, url: '' })
      toast.success('File attached. Save the draft to keep it.')
    } catch (e) {
      toast.error(e instanceof Error && e.message === 'upload failed' ? 'The upload failed. Please try again.' : errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Each resource is a link or an uploaded file. “Pro only” items stay locked until the learner has a paid plan, and the file address is never sent to others.</p>
      {items.map((r, i) => (
        <div key={r.id} className="space-y-3 rounded-md border p-3">
          <div className="flex items-center justify-between gap-2">
            <Input aria-label={`Resource ${i + 1} title`} placeholder="Title" className="font-medium" value={r.title} onChange={(e) => setItem(i, { title: e.target.value })} />
            <div className="flex shrink-0">
              <Move i={i} n={items.length} label={`resource ${i + 1}`} on={(to) => set({ items: swap(items, i, to) })} />
              <Button type="button" size="icon" variant="ghost" aria-label={`Remove resource ${i + 1}`} onClick={() => set({ items: items.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
          <Textarea aria-label={`Resource ${i + 1} description`} rows={2} placeholder="One or two sentences on what it is and when to use it" value={r.description} onChange={(e) => setItem(i, { description: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Type">
              <select className={selectClass} value={r.type} onChange={(e) => setItem(i, { type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
            </Field>
            <Field label="Size or length" hint="e.g. 2.4 MB or 20 min">
              <Input value={r.size} onChange={(e) => setItem(i, { size: e.target.value })} />
            </Field>
            <Field label="Who can open it">
              <select className={selectClass} value={r.free ? 'free' : 'pro'} onChange={(e) => setItem(i, { free: e.target.value === 'free' })}>
                <option value="free">Everyone</option>
                <option value="pro">Pro learners only</option>
              </select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Link" hint="A web address starting with https://">
              <Input value={r.url} placeholder="https://" disabled={Boolean(r.file)} onChange={(e) => setItem(i, { url: e.target.value })} />
            </Field>
            <Field label="Or upload a file" hint="PDF, document, audio. Up to 25 MB.">
              {r.file ? (
                <div className="flex items-center gap-2 text-sm">
                  <Paperclip className="h-4 w-4" aria-hidden="true" />
                  <span className="min-w-0 truncate">{r.file.name}</span>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setItem(i, { file: undefined })}>Remove</Button>
                </div>
              ) : (
                <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm hover:bg-muted">
                  {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" aria-hidden="true" />}
                  {busy === r.id ? 'Uploading…' : 'Choose a file'}
                  <input type="file" className="sr-only" disabled={busy !== null} onChange={(e) => { const f = e.target.files?.[0]; if (f) void attach(i, f); e.target.value = '' }} />
                </label>
              )}
            </Field>
          </div>
          <Field label="Tags" hint="Separate with commas">
            <Input value={r.tags.join(', ')} onChange={(e) => setItem(i, { tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 8) })} />
          </Field>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => set({ items: [...items, { id: newId(), title: '', description: '', type: 'PDF', url: '', size: '', tags: [], free: true }] })}>
        <Plus className="mr-1 h-4 w-4" />Add a resource
      </Button>
    </div>
  )
}

// ── FAQ ────────────────────────────────────────────────────────────────────

type FaqSec = { title: string; items: { q: string; a: string }[] }
export function FaqForm({ data, set }: FormProps) {
  const sections: FaqSec[] = data.sections ?? []
  const setSec = (i: number, patch: Partial<FaqSec>) => set({ sections: sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) })
  return (
    <div className="space-y-6">
      {sections.map((s, si) => (
        <section key={si} className="space-y-3 rounded-md border p-3" aria-label={`Section ${si + 1}`}>
          <div className="flex items-center gap-2">
            <Input aria-label={`Section ${si + 1} title`} className="font-medium" placeholder="Section title (e.g. Getting started)" value={s.title} onChange={(e) => setSec(si, { title: e.target.value })} />
            <Move i={si} n={sections.length} label={`section ${si + 1}`} on={(to) => set({ sections: swap(sections, si, to) })} />
            <Button type="button" size="icon" variant="ghost" aria-label={`Remove section ${si + 1}`} disabled={sections.length === 1} onClick={() => set({ sections: sections.filter((_, j) => j !== si) })}><Trash2 className="h-4 w-4" /></Button>
          </div>
          {s.items.map((x, qi) => (
            <div key={qi} className="space-y-2 rounded border bg-muted/30 p-2">
              <div className="flex items-center gap-2">
                <Input aria-label={`Section ${si + 1} question ${qi + 1}`} placeholder="Question" value={x.q} onChange={(e) => setSec(si, { items: s.items.map((y, k) => (k === qi ? { ...y, q: e.target.value } : y)) })} />
                <Move i={qi} n={s.items.length} label={`question ${qi + 1}`} on={(to) => setSec(si, { items: swap(s.items, qi, to) })} />
                <Button type="button" size="icon" variant="ghost" aria-label={`Remove question ${qi + 1}`} onClick={() => setSec(si, { items: s.items.filter((_, k) => k !== qi) })}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <Textarea aria-label={`Section ${si + 1} answer ${qi + 1}`} rows={3} placeholder="Answer, in plain words" value={x.a} onChange={(e) => setSec(si, { items: s.items.map((y, k) => (k === qi ? { ...y, a: e.target.value } : y)) })} />
            </div>
          ))}
          <Button type="button" size="sm" variant="ghost" onClick={() => setSec(si, { items: [...s.items, { q: '', a: '' }] })}><Plus className="mr-1 h-4 w-4" />Add a question</Button>
        </section>
      ))}
      <Button type="button" variant="outline" onClick={() => set({ sections: [...sections, { title: '', items: [{ q: '', a: '' }] }] })}><Plus className="mr-1 h-4 w-4" />Add a section</Button>
    </div>
  )
}

// ── Blog post ──────────────────────────────────────────────────────────────

const SITE_IMAGES = ['ai-education', 'assessment', 'cbc-competencies', 'inclusive', 'parents', 'pbl'].map((n) => `/blog/${n}.jpg`)
const CATEGORIES = ['Pedagogy', 'Assessment', 'Inclusion', 'Technology', 'Community', 'Wellbeing']
const FORMATS = [
  { label: 'Heading', before: '\n## ', after: '', sample: 'Heading' },
  { label: 'Bold', before: '**', after: '**', sample: 'bold text' },
  { label: 'List', before: '\n- ', after: '', sample: 'item' },
  { label: 'Quote', before: '\n> ', after: '', sample: 'quote' },
  { label: 'Link', before: '[', after: '](https://)', sample: 'link text' },
]
const words = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0)

export function PostForm({ data, set }: FormProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [action, setAction] = useState<ImproveAction>('simplify')
  const content: string = data.content ?? ''

  const format = (f: (typeof FORMATS)[number]) => {
    const el = ref.current
    const start = el?.selectionStart ?? content.length
    const end = el?.selectionEnd ?? content.length
    const picked = content.slice(start, end) || f.sample
    set({ content: `${content.slice(0, start)}${f.before}${picked}${f.after}${content.slice(end)}` })
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + f.before.length, start + f.before.length + picked.length) })
  }
  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label); setError(null)
    try { await fn() } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.') } finally { setBusy(null) }
  }

  return (
    <div className="space-y-4">
      <Field label="Title"><Input value={data.title ?? ''} onChange={(e) => set({ title: e.target.value })} /></Field>

      <div className="rounded-lg border bg-background p-3">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />AI assistant</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" disabled={busy !== null || !data.title} onClick={() => run('write', async () => {
            const r = await askAi('post', { topic: data.title, existing: content || undefined })
            if (content.trim() && !window.confirm('Replace the article with the new draft?')) return
            set({ content: r.content, excerpt: r.excerpt, category: data.category || r.category, readTime: r.readTime })
          })}>{busy === 'write' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Writing…</> : content.trim() ? 'Rewrite from my text' : 'Write a draft from the title'}</Button>
          {content.trim() && (
            <>
              <select aria-label="Improvement" className={`${selectClass} w-auto`} value={action} onChange={(e) => setAction(e.target.value as ImproveAction)}>
                <option value="simplify">Make it simpler</option><option value="shorten">Make it shorter</option><option value="expand">Add more detail</option>
                <option value="examples">Add Kenyan classroom examples</option><option value="proofread">Fix spelling and grammar</option><option value="kiswahili">Translate to Kiswahili</option>
              </select>
              <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => run('improve', async () => {
                const r = await askAi('improve', { action, text: content })
                if (window.confirm('Replace the article with the improved version?')) set({ content: r.text })
              })}>{busy === 'improve' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Working…</> : 'Apply'}</Button>
            </>
          )}
        </div>
        {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
        <p className="mt-2 text-xs text-muted-foreground">AI writes a draft to edit, never to publish as is. Check facts, names and numbers.</p>
      </div>

      <Field label="Summary (shown in the blog list)"><Textarea rows={2} value={data.excerpt ?? ''} onChange={(e) => set({ excerpt: e.target.value })} /></Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Category">
          <Input list="post-cats" value={data.category ?? ''} onChange={(e) => set({ category: e.target.value })} />
          <datalist id="post-cats">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Author"><Input value={data.author ?? ''} onChange={(e) => set({ author: e.target.value })} /></Field>
        <Field label="Author role"><Input value={data.authorRole ?? ''} onChange={(e) => set({ authorRole: e.target.value })} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Date shown" hint="e.g. October 5, 2026">
          <div className="flex gap-2">
            <Input value={data.date ?? ''} onChange={(e) => set({ date: e.target.value })} />
            <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => set({ date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) })}>Today</Button>
          </div>
        </Field>
        <Field label="Reading time">
          <div className="flex gap-2">
            <Input value={data.readTime ?? ''} onChange={(e) => set({ readTime: e.target.value })} />
            <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => set({ readTime: `${Math.max(1, Math.round(words(content) / 200))} min read` })}>Work out</Button>
          </div>
        </Field>
        <Field label="Picture">
          <select className={selectClass} value={SITE_IMAGES.includes(data.image) ? data.image : data.image ? 'custom' : ''} onChange={(e) => set({ image: e.target.value === 'custom' ? 'https://images.unsplash.com/' : e.target.value })}>
            <option value="">Default</option>
            {SITE_IMAGES.map((i) => <option key={i} value={i}>{i.replace('/blog/', '').replace('.jpg', '')}</option>)}
            <option value="custom">An Unsplash picture…</option>
          </select>
          {data.image && !SITE_IMAGES.includes(data.image) && <Input className="mt-2" aria-label="Unsplash address" value={data.image} onChange={(e) => set({ image: e.target.value })} />}
        </Field>
      </div>

      <Field label="Article (Markdown)" hint={`${words(content)} words`}>
        <div className="mb-1 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant={preview ? 'outline' : 'secondary'} onClick={() => setPreview(false)}>Write</Button>
          <Button type="button" size="sm" variant={preview ? 'secondary' : 'outline'} onClick={() => setPreview(true)}>Preview</Button>
          {!preview && FORMATS.map((f) => <Button key={f.label} type="button" size="sm" variant="outline" className="min-h-9" onClick={() => format(f)}>{f.label}</Button>)}
        </div>
        {preview ? (
          <div className="min-h-48 rounded-md border bg-background p-4"><MarkdownRenderer content={content} article /></div>
        ) : (
          <Textarea ref={ref} rows={20} className="font-mono text-sm" value={content} onChange={(e) => set({ content: e.target.value })} />
        )}
      </Field>
    </div>
  )
}

export type { Data }
