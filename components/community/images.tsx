'use client'

import { useCallback, useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import type { Id } from '@/convex/_generated/dataModel'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { shrink } from '@/components/support/attachments'

export type PickedImage = { storageId: Id<'_storage'>; alt: string }
type Item = { key: string; preview: string; alt: string; status: 'uploading' | 'ready' | 'failed'; storageId?: Id<'_storage'>; error?: string }
const TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

/**
 * Add photos by button, drag-and-drop or paste. Each is redrawn (max 1600px, JPEG) before upload, which also drops
 * hidden metadata such as GPS location; the server strips metadata again. Every photo needs a short description.
 */
export function ImagePicker({ max, getUploadUrl, onChange, disabled }: { max: number; getUploadUrl: () => Promise<string>; onChange: (images: PickedImage[], ready: boolean) => void; disabled?: boolean }) {
  const [items, setItems] = useState<Item[]>([])
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const publish = (next: Item[]) => {
    setItems(next)
    const done = next.filter((i) => i.status === 'ready' && i.storageId)
    onChange(done.map((i) => ({ storageId: i.storageId!, alt: i.alt.trim() })), !next.some((i) => i.status === 'uploading') && done.every((i) => i.alt.trim().length >= 3))
  }
  const add = useCallback(async (files: File[]) => {
    let cur = items
    for (const file of files) {
      if (cur.length >= max) break
      const key = `${file.name}-${Math.random()}`
      if (!TYPES.includes(file.type)) { cur = [...cur, { key, preview: '', alt: '', status: 'failed', error: 'JPG, PNG or WebP photos only' }]; publish(cur); continue }
      cur = [...cur, { key, preview: URL.createObjectURL(file), alt: '', status: 'uploading' }]
      publish(cur)
      try {
        const blob = await shrink(file)
        if (blob.size > MAX_BYTES) throw new Error('This photo is over 5 MB')
        const res = await fetch(await getUploadUrl(), { method: 'POST', headers: { 'Content-Type': blob.type || file.type }, body: blob })
        if (!res.ok) throw new Error('Upload failed')
        const { storageId } = (await res.json()) as { storageId: Id<'_storage'> }
        cur = cur.map((i) => (i.key === key ? { ...i, status: 'ready', storageId } : i))
      } catch (e) {
        cur = cur.map((i) => (i.key === key ? { ...i, status: 'failed', error: e instanceof Error && /5 MB/.test(e.message) ? e.message : 'Upload failed. Check your connection.' } : i))
      }
      publish(cur)
    }
  }, [items, max]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) void add([...e.dataTransfer.files]) }}
      onPaste={(e) => { const f = [...e.clipboardData.files]; if (f.length && !disabled) { e.preventDefault(); void add(f) } }}
      className={`rounded-xl border border-dashed p-3 text-sm ${dragging ? 'border-primary bg-primary/5' : 'border-border'}`}
    >
      <input ref={input} type="file" accept={TYPES.join(',')} multiple hidden onChange={(e) => { void add([...(e.target.files ?? [])]); e.target.value = '' }} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={disabled || items.length >= max} onClick={() => input.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border bg-background px-3 hover:bg-muted disabled:opacity-50">
          <ImagePlus className="h-4 w-4" aria-hidden="true" />Add photo
        </button>
        <span className="text-xs text-muted-foreground">Up to {max}. Drag, paste or choose. No learners’ faces or names.</span>
      </div>
      {items.length > 0 && (
        <ul className="mt-3 space-y-2" aria-label="Photos to post">
          {items.map((i) => (
            <li key={i.key} className="flex items-start gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
              {i.preview ? <img src={i.preview} alt="" className="h-16 w-16 shrink-0 rounded object-cover" /> : <div className="h-16 w-16 shrink-0 rounded border" />}
              <div className="min-w-0 flex-1 space-y-1">
                {i.status === 'failed' ? <p role="alert" className="text-xs text-destructive">{i.error}</p> : (
                  <label className="block text-xs">
                    <span>Describe the photo{i.status === 'uploading' && <span className="ml-2 inline-flex items-center gap-1 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />uploading</span>}</span>
                    <input value={i.alt} maxLength={200} required onChange={(e) => publish(items.map((x) => (x.key === i.key ? { ...x, alt: e.target.value } : x)))} placeholder="e.g. Learners’ bean-growing chart on the classroom wall" className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm" />
                  </label>
                )}
              </div>
              <button type="button" onClick={() => publish(items.filter((x) => x.key !== i.key))} aria-label="Remove photo" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-muted"><X className="h-4 w-4" aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

type Shown = { url: string | null; alt: string; pending?: boolean }

/** Photo thumbnails that open full size in a dialog with their description. */
export function ImageGallery({ images }: { images: Shown[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const list = images.filter((i) => i.url)
  if (!list.length) return null
  const cur = open !== null ? list[open] : null
  return (
    <>
      <ul className="flex flex-wrap gap-2" aria-label="Photos">
        {list.map((im, i) => (
          <li key={i}>
            <button type="button" onClick={() => setOpen(i)} className="relative block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label={`Open photo: ${im.alt}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- storage address */}
              <img src={im.url!} alt={im.alt} loading="lazy" className="h-28 w-28 rounded-lg object-cover sm:h-32 sm:w-32" />
              {im.pending && <span className="absolute inset-x-0 bottom-0 rounded-b-lg bg-black/60 px-1 py-0.5 text-[11px] text-white">Checking… only you see it</span>}
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={cur !== null} onOpenChange={(o) => { if (!o) setOpen(null) }}>
        <DialogContent className="max-w-3xl">
          <DialogTitle className="sr-only">Photo</DialogTitle>
          {cur && <>
            {/* eslint-disable-next-line @next/next/no-img-element -- storage address */}
            <img src={cur.url!} alt={cur.alt} className="max-h-[75vh] w-full rounded object-contain" />
            <DialogDescription>{cur.alt}</DialogDescription>
            {list.length > 1 && <div className="flex justify-between">
              <button type="button" className="min-h-11 px-3 text-sm underline" onClick={() => setOpen((open! - 1 + list.length) % list.length)}>Previous</button>
              <span className="self-center text-xs text-muted-foreground">{open! + 1} of {list.length}</span>
              <button type="button" className="min-h-11 px-3 text-sm underline" onClick={() => setOpen((open! + 1) % list.length)}>Next</button>
            </div>}
          </>}
        </DialogContent>
      </Dialog>
    </>
  )
}
