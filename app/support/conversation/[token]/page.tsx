'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'
import { forgetConversation } from '@/lib/support-conversations'
import { errorMessage } from '@/lib/support'
import { ConvexNativeAuthBoundary } from '@/context/profile-context'

const STATUS: Record<string, string> = { open: 'Waiting for our reply', pending_user: 'We replied: waiting for you', resolved: 'Resolved' }
const when = (ms: number) => new Date(ms).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })

/** A visitor's private conversation with support. Anyone holding the link can read and reply, so the link is the secret. */
export default function ConversationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  // Needs the auth-aware provider so a signed-in visitor can add the conversation to their account.
  return <ConvexNativeAuthBoundary handleCode={false}><Conversation token={token} /></ConvexNativeAuthBoundary>
}

function Conversation({ token }: { token: string }) {
  const data = useQuery(api.tickets.publicThread, { token })
  const reply = useMutation(api.tickets.publicReply)
  const claim = useMutation(api.tickets.claimByToken)
  const { isAuthenticated } = useConvexAuth()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim().length < 2) return
    setBusy(true)
    try {
      await reply({ token, body: text })
      setText('')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const addToAccount = async () => {
    setBusy(true)
    try {
      const id = await claim({ token })
      forgetConversation(`/support/conversation/${token}`)
      toast.success('Added to your account. Find it under Support in your dashboard.')
      window.location.href = `/dashboard/support/${id}`
    } catch {
      toast.error('Could not add this conversation. You need a finished profile on your account.')
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 md:px-8">
        {data === undefined ? (
          <p role="status" className="text-muted-foreground">Loading…</p>
        ) : data === null ? (
          <Card className="p-8 text-center">
            <h1 className="text-2xl font-bold">We could not find this conversation</h1>
            <p className="mt-2 text-muted-foreground">The link may be incomplete, or the conversation may have been added to an account. If you have an account, sign in and look under Support.</p>
            <Button asChild className="mt-6"><Link href="/support">Back to Support</Link></Button>
          </Card>
        ) : (
          <>
            <p className="font-mono text-sm text-muted-foreground">{data.ticket.number}</p>
            <h1 className="mt-1 text-3xl font-bold">{data.ticket.subject}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{STATUS[data.ticket.status]}. Bookmark this page: it is the only way back, and we do not send email.</p>

            <ul className="mt-8 space-y-4" aria-label="Messages">
              {data.messages.map((m) => (
                <li key={m._id} className={`rounded-lg border p-4 ${m.author === 'staff' ? 'bg-primary/5' : 'bg-background'}`}>
                  <p className="text-xs text-muted-foreground">{m.authorLabel} · {when(m.createdAt)}</p>
                  <p className="mt-2 whitespace-pre-wrap break-words">{m.body}</p>
                </li>
              ))}
            </ul>

            <form onSubmit={send} className="mt-8 space-y-3">
              <label htmlFor="conv-reply" className="text-sm font-medium">Reply</label>
              <Textarea id="conv-reply" rows={4} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)} />
              <Button type="submit" disabled={busy || text.trim().length < 2}>Send reply</Button>
            </form>

            <Card className="mt-10 p-5">
              <h2 className="font-semibold">Keep this in your account</h2>
              {isAuthenticated ? (
                <>
                  <p className="mt-1 text-sm text-muted-foreground">Add this conversation to your account inbox. After that the private link stops working and you reach it under Support in your dashboard.</p>
                  <Button className="mt-3" variant="outline" disabled={busy} onClick={addToAccount}>Add to my account</Button>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  <Link className="text-primary underline underline-offset-4" href="/auth/login">Sign in</Link> or <Link className="text-primary underline underline-offset-4" href="/auth/sign-up">create an account</Link>, then open this page again to add the conversation to your inbox.
                </p>
              )}
            </Card>
          </>
        )}
      </main>
      <MarketingFooter />
    </div>
  )
}
