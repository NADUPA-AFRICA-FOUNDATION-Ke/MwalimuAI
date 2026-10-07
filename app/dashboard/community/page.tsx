'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { BackButton } from '@/components/back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ImageGallery, ImagePicker, type PickedImage } from '@/components/community/images'
import { toast } from 'sonner'
import { Flag } from 'lucide-react'
import { errorMessage } from '@/lib/support'

const categories = ['Assessment', 'Pedagogy', 'Technology', 'Inclusion', 'Wellbeing', 'Resources', 'Ask a Question'] as const
const when = (ms: number) => new Date(ms).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' })

export default function CommunityPage() {
  const posts = useQuery(api.community.listPosts, {})
  const createPost = useMutation(api.community.createPost)
  const uploadUrl = useMutation(api.communityImages.uploadUrl)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<typeof categories[number]>('Ask a Question')
  const [images, setImages] = useState<PickedImage[]>([])
  const [imagesOk, setImagesOk] = useState(true)
  const [pickerKey, setPickerKey] = useState(0)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    setBusy(true)
    try {
      await createPost({ title: title.trim(), content: content.trim(), category, ...(images.length ? { images } : {}) })
      setTitle(''); setContent(''); setImages([]); setPickerKey((k) => k + 1)
      if (images.length) toast.success('Posted. Your photos appear to others once they have been checked, usually within a minute.')
    } catch (err) {
      toast.error(errorMessage(err, 'Your post was not sent. Please try again.'))
    } finally { setBusy(false) }
  }

  return <div className="max-w-3xl space-y-6">
    <BackButton fallbackHref="/dashboard" label="Back to Dashboard" />
    <div><h1 className="text-2xl font-bold">Teacher Community</h1><p className="text-muted-foreground">Share ideas and learn from fellow teachers.</p></div>
    <form className="glass space-y-3 rounded-2xl p-4 sm:p-5" onSubmit={submit}>
      <h2 className="font-semibold">Start a discussion</h2>
      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" aria-label="Title" required maxLength={150} className="min-h-11" />
      <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="What would you like to share?" aria-label="Post" required maxLength={5000} />
      <ImagePicker key={pickerKey} max={4} getUploadUrl={() => uploadUrl({})} onChange={(i, ok) => { setImages(i); setImagesOk(ok) }} disabled={busy} />
      <div className="flex flex-wrap gap-3">
        <select aria-label="Category" value={category} onChange={e => setCategory(e.target.value as typeof category)} className="min-h-11 rounded-xl border bg-background px-3">{categories.map(c => <option key={c}>{c}</option>)}</select>
        <Button type="submit" className="min-h-11" disabled={busy || !imagesOk}>{busy ? 'Posting…' : 'Post'}</Button>
        {!imagesOk && <span className="self-center text-xs text-muted-foreground">Describe each photo (or wait for uploads) to post.</span>}
      </div>
    </form>
    {posts === undefined ? <p role="status" className="text-muted-foreground">Loading discussions…</p> : posts.length === 0 ? <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">No discussions yet. Start the first one.</p> : posts.map(post => <article key={post._id} id={post._id} className="scroll-mt-24 space-y-3 rounded-2xl border p-4 target:ring-2 target:ring-primary sm:p-5">
      <div><div className="flex justify-between gap-3"><h2 className="font-semibold">{post.title}</h2><span className="text-xs text-muted-foreground">{post.category}</span></div><p className="text-xs text-muted-foreground">{post.authorName} · {when(post.createdAt)}</p></div>
      <p className="whitespace-pre-wrap text-sm">{post.content}</p>
      <ImageGallery images={post.images} />
      <ReportButton postId={post._id} />
      <Comments postId={post._id} />
    </article>)}
  </div>
}

function Comments({ postId }: { postId: Id<'communityPosts'> }) {
  const comments = useQuery(api.community.comments, { postId })
  const addComment = useMutation(api.community.addComment)
  const uploadUrl = useMutation(api.communityImages.uploadUrl)
  const [reply, setReply] = useState('')
  const [images, setImages] = useState<PickedImage[]>([])
  const [imagesOk, setImagesOk] = useState(true)
  const [withPhoto, setWithPhoto] = useState(false)
  const [pickerKey, setPickerKey] = useState(0)
  return <div className="space-y-2 border-t pt-3">
    <p className="text-xs font-semibold">{comments?.length ?? 0} replies</p>
    {comments?.map(c => <div key={c._id} className="space-y-1"><div className="flex flex-wrap items-start justify-between gap-2"><p className="text-sm"><b>{c.authorName}:</b> {c.body}</p><ReportButton postId={postId} commentId={c._id} /></div><ImageGallery images={c.images} /></div>)}
    <form className="space-y-2" onSubmit={async e => { e.preventDefault(); if (!reply.trim()) return; try { await addComment({ postId, body: reply.trim(), ...(images.length ? { images } : {}) }); setReply(''); setImages([]); setPickerKey(k => k + 1); setWithPhoto(false) } catch (err) { toast.error(errorMessage(err, 'Your reply was not sent. Please try again.')) } }}>
      <div className="flex gap-2"><Input value={reply} onChange={e => setReply(e.target.value)} placeholder="Reply…" aria-label="Reply" maxLength={2000} className="min-h-11" /><Button type="submit" variant="outline" className="min-h-11" disabled={!imagesOk}>Reply</Button></div>
      {withPhoto ? <ImagePicker key={pickerKey} max={2} getUploadUrl={() => uploadUrl({})} onChange={(i, ok) => { setImages(i); setImagesOk(ok) }} /> : <button type="button" className="min-h-11 text-xs text-muted-foreground underline" onClick={() => setWithPhoto(true)}>Add a photo to your reply</button>}
    </form>
  </div>
}

const REASONS = [
  { value: 'spam', label: 'Spam or advert' },
  { value: 'abusive', label: 'Rude or abusive' },
  { value: 'misleading', label: 'Wrong or misleading' },
  { value: 'personal_info', label: 'Shares private information (including in a photo)' },
  { value: 'other', label: 'Something else' },
] as const

/** Lets a learner flag a post or reply (and its photos) for staff. Nothing is hidden until a person has looked at it. */
function ReportButton({ postId, commentId }: { postId: Id<'communityPosts'>; commentId?: Id<'communityComments'> }) {
  const report = useMutation(api.community.report)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<(typeof REASONS)[number]['value']>('spam')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  if (sent) return <span className="text-xs text-muted-foreground" role="status">Reported. Thank you.</span>
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-1 px-2 text-xs text-muted-foreground underline-offset-2 hover:underline">
        <Flag className="h-3.5 w-3.5" aria-hidden="true" />Report
      </button>
    )
  return (
    <form
      className="w-full space-y-2 rounded-lg border bg-muted/30 p-3"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
          await report({ postId, commentId, reason, note: note || undefined })
          setSent(true)
          toast.success('Thanks. Our team will take a look.')
        } catch (err) {
          toast.error(errorMessage(err, 'Could not send your report. Please try again.'))
        } finally {
          setBusy(false)
        }
      }}
    >
      <label className="block text-xs font-medium" htmlFor={`why-${postId}-${commentId ?? 'p'}`}>What is wrong with this?</label>
      <select id={`why-${postId}-${commentId ?? 'p'}`} value={reason} onChange={(e) => setReason(e.target.value as typeof reason)} className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
        {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Anything we should know? (optional)" className="min-h-11" />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy} className="min-h-11">{busy ? 'Sending…' : 'Send report'}</Button>
        <Button type="button" size="sm" variant="ghost" className="min-h-11" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  )
}
