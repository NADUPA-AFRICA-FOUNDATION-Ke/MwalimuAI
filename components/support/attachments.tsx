'use client'

import { useCallback, useRef, useState } from 'react'
import { FileText, ImagePlus, Loader2, Paperclip, X } from 'lucide-react'
import type { Id } from '@/convex/_generated/dataModel'
import { MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES } from '@/lib/support'

export type Uploaded = { storageId: Id<'_storage'>; name: string }
type Pending = { key: string; name: string; preview: string | null; status: 'uploading' | 'ready' | 'failed'; result?: Uploaded; error?: string }

const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'
const MAX_SIDE = 1600

/**
 * Photos are redrawn at most 1600px on the long side and saved as JPEG before upload: much smaller on mobile data,
 * and redrawing drops the hidden metadata (including GPS location). PDFs go up unchanged.
 */
export async function shrink(file: File, maxSide = MAX_SIDE): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82))
    return blob ?? file
  } catch {
    return file
  }
}

/** Attach up to three photos or PDFs: button, drag-and-drop or paste. Shows a preview with a remove button for each. */
export function AttachmentPicker({ getUploadUrl, onChange, disabled }: { getUploadUrl: () => Promise<string>; onChange: (files: Uploaded[]) => void; disabled?: boolean }) {
  const [items, setItems] = useState<Pending[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const publish = (next: Pending[]) => {
    setItems(next)
    onChange(next.filter((i) => i.status === 'ready' && i.result).map((i) => i.result!))
  }

  const add = useCallback(async (files: File[]) => {
    let current = items
    for (const file of files) {
      if (current.length >= MAX_ATTACHMENTS) break
      const key = `${file.name}-${file.size}-${Math.random()}`
      if (!ACCEPT.split(',').includes(file.type)) {
        current = [...current, { key, name: file.name, preview: null, status: 'failed', error: 'Photos (JPG, PNG, WebP) or PDF only' }]
        publish(current)
        continue
      }
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      current = [...current, { key, name: file.name, preview, status: 'uploading' }]
      publish(current)
      try {
        const blob = await shrink(file)
        if (blob.size > MAX_ATTACHMENT_BYTES) throw new Error('This file is over 5 MB')
        const url = await getUploadUrl()
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': blob.type || file.type }, body: blob })
        if (!res.ok) throw new Error('Upload failed')
        const { storageId } = (await res.json()) as { storageId: Id<'_storage'> }
        const name = blob !== file && !/\.jpe?g$/i.test(file.name) ? file.name.replace(/\.\w+$/, '') + '.jpg' : file.name
        current = current.map((i) => (i.key === key ? { ...i, status: 'ready', result: { storageId, name } } : i))
      } catch (e) {
        current = current.map((i) => (i.key === key ? { ...i, status: 'failed', error: e instanceof Error && /5 MB/.test(e.message) ? e.message : 'Upload failed. Check your connection.' } : i))
      }
      publish(current)
    }
  }, [items]) // eslint-disable-line react-hooks/exhaustive-deps

  const remove = (key: string) => publish(items.filter((i) => i.key !== key))
  const full = items.length >= MAX_ATTACHMENTS

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) void add([...e.dataTransfer.files]) }}
      onPaste={(e) => { const files = [...e.clipboardData.files]; if (files.length && !disabled) { e.preventDefault(); void add(files) } }}
      className={`rounded-xl border border-dashed p-3 text-sm transition-colors ${dragging ? 'border-primary bg-primary/5' : 'border-border'}`}
    >
      <input ref={inputRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => { void add([...(e.target.files ?? [])]); e.target.value = '' }} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={disabled || full} onClick={() => inputRef.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border bg-background px-3 hover:bg-muted disabled:opacity-50">
          <Paperclip className="h-4 w-4" aria-hidden="true" /> Attach photo or PDF
        </button>
        <span className="text-xs text-muted-foreground">Up to {MAX_ATTACHMENTS} files, 5 MB each. You can also drag files here or paste a screenshot. Please don’t include learners’ faces or names.</span>
      </div>
      {items.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Attachments">
          {items.map((i) => (
            <li key={i.key} className="relative flex w-28 flex-col items-center gap-1 rounded-lg border bg-background p-2 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a file not yet uploaded */}
              {i.preview ? <img src={i.preview} alt="" className="h-16 w-full rounded object-cover" /> : <FileText className="h-10 w-10 text-muted-foreground" aria-hidden="true" />}
              <span className="w-full truncate text-xs" title={i.name}>{i.name}</span>
              {i.status === 'uploading' && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />Uploading</span>}
              {i.status === 'failed' && <span role="alert" className="text-xs text-destructive">{i.error}</span>}
              <button type="button" onClick={() => remove(i.key)} aria-label={`Remove ${i.name}`} className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border bg-background shadow hover:bg-muted">
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}


type Shown = { name: string; type: string; size: number; url: string | null }

/** Attachments on a message: photo thumbnails that open full size, and PDF links. */
export function MessageAttachments({ files }: { files: Shown[] }) {
  if (!files?.length) return null
  return (
    <ul className="mt-3 flex flex-wrap gap-2" aria-label="Attachments">
      {files.map((f, i) => (
        <li key={i}>
          {f.url && f.type.startsWith('image/') ? (
            <a href={f.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
              {/* eslint-disable-next-line @next/next/no-img-element -- private, short-lived file address */}
              <img src={f.url} alt={`Attachment: ${f.name}`} className="h-24 w-24 rounded-lg object-cover" loading="lazy" />
            </a>
          ) : f.url ? (
            <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg border bg-background px-3 text-sm hover:bg-muted">
              {f.type === 'application/pdf' ? <FileText className="h-4 w-4" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
              {f.name} <span className="text-xs text-muted-foreground">({Math.max(1, Math.round(f.size / 1024))} KB)</span>
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
