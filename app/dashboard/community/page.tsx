'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useProfile } from '@/context/profile-context'
import { BackButton } from '@/components/back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Flag } from 'lucide-react'
import { errorMessage } from '@/lib/support'

const categories = ['Assessment', 'Pedagogy', 'Technology', 'Inclusion', 'Wellbeing', 'Resources', 'Ask a Question'] as const

export default function CommunityPage() {
  const { profile } = useProfile()
  const posts = useQuery(api.community.listPosts, {})
  const createPost = useMutation(api.community.createPost)
  const addComment = useMutation(api.community.addComment)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<typeof categories[number]>('Ask a Question')
  const [reply, setReply] = useState<Record<string, string>>({})

  return <div className="max-w-3xl space-y-6">
    <BackButton fallbackHref="/dashboard" label="Back to Dashboard" />
    <div><h1 className="text-2xl font-bold">Teacher Community</h1><p className="text-muted-foreground">Share ideas and learn from fellow teachers.</p></div>
    <form className="glass rounded-2xl p-5 space-y-3" onSubmit={async e => { e.preventDefault(); if (!title.trim() || !content.trim()) return; try { await createPost({ title: title.trim(), content: content.trim(), category }); setTitle(''); setContent('') } catch (err) { toast.error(errorMessage(err, 'Your post was not sent. Please try again.')) } }}>
      <h2 className="font-semibold">Start a discussion</h2>
      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" required />
      <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="What would you like to share?" required />
      <div className="flex gap-3"><select value={category} onChange={e => setCategory(e.target.value as typeof category)} className="rounded-xl border px-3 bg-background">{categories.map(c => <option key={c}>{c}</option>)}</select><Button type="submit">Post</Button></div>
    </form>
    {posts === undefined ? <p className="text-muted-foreground">Loading discussions…</p> : posts.map(post => <article key={post._id} className="rounded-2xl border p-5 space-y-3">
      <div><div className="flex justify-between gap-3"><h2 className="font-semibold">{post.title}</h2><span className="text-xs text-muted-foreground">{post.category}</span></div><p className="text-xs text-muted-foreground">{post.authorName} · {new Date(post.createdAt).toLocaleDateString()}</p></div>
      <p className="whitespace-pre-wrap text-sm">{post.content}</p>
      <ReportButton postId={post._id} />
      <Comments postId={post._id} reply={reply[post._id] ?? ''} setReply={value => setReply(r => ({ ...r, [post._id]: value }))} addComment={addComment} />
    </article>)}
  </div>
}

function Comments({ postId, reply, setReply, addComment }: { postId: any; reply: string; setReply: (value: string) => void; addComment: any }) {
  const comments = useQuery(api.community.comments, { postId })
  return <div className="border-t pt-3 space-y-2"><p className="text-xs font-semibold">{comments?.length ?? 0} replies</p>{comments?.map(c => <div key={c._id} className="flex flex-wrap items-start justify-between gap-2"><p className="text-sm"><b>{c.authorName}:</b> {c.body}</p><ReportButton postId={postId} commentId={c._id} /></div>)}<form className="flex gap-2" onSubmit={async e => { e.preventDefault(); if (!reply.trim()) return; try { await addComment({ postId, body: reply.trim() }); setReply('') } catch (err) { toast.error(errorMessage(err, 'Your reply was not sent. Please try again.')) } }}><Input value={reply} onChange={e => setReply(e.target.value)} placeholder="Reply…" /><Button type="submit" variant="outline">Reply</Button></form></div>
}

const REASONS = [
  { value: 'spam', label: 'Spam or advert' },
  { value: 'abusive', label: 'Rude or abusive' },
  { value: 'misleading', label: 'Wrong or misleading' },
  { value: 'personal_info', label: 'Shares private information' },
  { value: 'other', label: 'Something else' },
] as const

/** Lets a learner flag a post or reply for staff. Nothing is hidden until a person has looked at it. */
function ReportButton({ postId, commentId }: { postId: any; commentId?: any }) {
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
