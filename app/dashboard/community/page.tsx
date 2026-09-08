'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useProfile } from '@/context/profile-context'
import { BackButton } from '@/components/back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

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

  return <div className="max-w-3xl mx-auto space-y-6">
    <BackButton fallbackHref="/dashboard" label="Back to Dashboard" />
    <div><h1 className="text-2xl font-bold">Teacher Community</h1><p className="text-muted-foreground">Share ideas and learn from fellow teachers.</p></div>
    <form className="glass rounded-2xl p-5 space-y-3" onSubmit={async e => { e.preventDefault(); if (!title.trim() || !content.trim()) return; await createPost({ title: title.trim(), content: content.trim(), category }); setTitle(''); setContent('') }}>
      <h2 className="font-semibold">Start a discussion</h2>
      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" required />
      <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="What would you like to share?" required />
      <div className="flex gap-3"><select value={category} onChange={e => setCategory(e.target.value as typeof category)} className="rounded-xl border px-3 bg-background">{categories.map(c => <option key={c}>{c}</option>)}</select><Button type="submit">Post</Button></div>
    </form>
    {posts === undefined ? <p className="text-muted-foreground">Loading discussions…</p> : posts.map(post => <article key={post._id} className="rounded-2xl border p-5 space-y-3">
      <div><div className="flex justify-between gap-3"><h2 className="font-semibold">{post.title}</h2><span className="text-xs text-muted-foreground">{post.category}</span></div><p className="text-xs text-muted-foreground">{post.authorName} · {new Date(post.createdAt).toLocaleDateString()}</p></div>
      <p className="whitespace-pre-wrap text-sm">{post.content}</p>
      <Comments postId={post._id} reply={reply[post._id] ?? ''} setReply={value => setReply(r => ({ ...r, [post._id]: value }))} addComment={addComment} />
    </article>)}
  </div>
}

function Comments({ postId, reply, setReply, addComment }: { postId: any; reply: string; setReply: (value: string) => void; addComment: any }) {
  const comments = useQuery(api.community.comments, { postId })
  return <div className="border-t pt-3 space-y-2"><p className="text-xs font-semibold">{comments?.length ?? 0} replies</p>{comments?.map(c => <p key={c._id} className="text-sm"><b>{c.authorName}:</b> {c.body}</p>)}<form className="flex gap-2" onSubmit={async e => { e.preventDefault(); if (!reply.trim()) return; await addComment({ postId, body: reply.trim() }); setReply('') }}><Input value={reply} onChange={e => setReply(e.target.value)} placeholder="Reply…" /><Button type="submit" variant="outline">Reply</Button></form></div>
}
