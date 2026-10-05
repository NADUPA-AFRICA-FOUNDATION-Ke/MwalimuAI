'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pill, useRun, useStaff } from '@/components/admin/common'

type Entry = { _id: string; key: string; title: string; published: boolean; hasDraft: boolean; archived: boolean }

const Status = ({ e }: { e: Entry }) => (
  <span className="flex gap-1.5">
    {e.archived && <Pill>archived</Pill>}
    {e.published ? <Pill tone="green">live</Pill> : <Pill>not live</Pill>}
    {e.hasDraft && <Pill tone="blue">draft</Pill>}
  </span>
)

function Rows({ entries }: { entries: Entry[] }) {
  return (
    <ul className="mt-3 divide-y rounded-lg border text-sm">
      {entries.map((e) => (
        <li key={e._id}>
          <Link href={`/admin/content/item/${e._id}`} className="flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-muted/30">
            <span className="font-medium">{e.title}</span>
            <Status e={e} />
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Resource library, FAQ and blog posts: the rest of the content learners and visitors see. */
export function StudioSections({ tab }: { tab: string }) {
  const { can } = useStaff()
  const router = useRouter()
  const { run } = useRun()
  const data = useQuery(api.admin.content.collections, {})
  const importBuiltIn = useMutation(api.admin.content.importBuiltIn)
  const createItem = useMutation(api.admin.content.createItem)
  const [title, setTitle] = useState('')
  if (!data) return null

  const brought = (what: 'resources' | 'faq' | 'posts', label: string) =>
    can('content.publish') && (
      <Button variant="outline" onClick={() => void run(() => importBuiltIn({ what }), `${label} copied in. Learners see the same content as before.`)}>
        Bring the built-in {label} here to edit
      </Button>
    )

  const newPost = async () => {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 55) || 'post'
    const id = await run(
      () =>
        createItem({
          kind: 'post',
          key: slug,
          data: { title: title.trim(), excerpt: '', content: '', author: '', authorRole: '', category: '', readTime: '', date: '', image: '', orderIndex: Math.min(9999, 100 + data.post.length), tags: { cbcLevels: [], subjects: [], counties: [] } },
        }),
      'Post created as a draft',
    )
    if (id) router.push(`/admin/content/item/${id}`)
  }

  return (
    <>
      {tab === 'resources' && <section className="rounded-lg border bg-background p-4" aria-labelledby="res-h">
        <h2 id="res-h" className="font-semibold">Resource library</h2>
        <p className="text-sm text-muted-foreground">Guides, templates and videos on the learners’ Resources page. Attach files or link out, and choose what is for Pro learners only.</p>
        {data.resources.length === 0 ? <div className="mt-3">{brought('resources', 'resource list')}</div> : <Rows entries={data.resources} />}
      </section>}

      {tab === 'faq' && <section className="rounded-lg border bg-background p-4" aria-labelledby="faq-h">
        <h2 id="faq-h" className="font-semibold">FAQ</h2>
        <p className="text-sm text-muted-foreground">The public Frequently Asked Questions page.</p>
        {data.faq.length === 0 ? <div className="mt-3">{brought('faq', 'FAQ')}</div> : <Rows entries={data.faq} />}
      </section>}

      {tab === 'blog' && <section className="rounded-lg border bg-background p-4" aria-labelledby="blog-h">
        <h2 id="blog-h" className="font-semibold">Blog posts</h2>
        <p className="text-sm text-muted-foreground">Articles on the public blog. The AI assistant can draft one from a title.</p>
        {can('content.edit') && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Input aria-label="New post title" className="max-w-md" placeholder="Title of a new post" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Button disabled={title.trim().length < 5} onClick={newPost}>Start a post</Button>
          </div>
        )}
        {data.post.length === 0 ? <div className="mt-3">{brought('posts', 'blog posts')}</div> : <Rows entries={data.post} />}
      </section>}
    </>
  )
}
