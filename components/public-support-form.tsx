'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { rememberConversation } from '@/lib/support-conversations'

const CATEGORIES = [
  { value: 'account', label: 'My account or signing in' },
  { value: 'technical', label: 'Something is not working' },
  { value: 'payment', label: 'Billing and subscription' },
  { value: 'content', label: 'A question about the content' },
  { value: 'certificate', label: 'A certificate' },
  { value: 'feedback', label: 'Feedback or a suggestion' },
  { value: 'other', label: 'Something else' },
] as const

/**
 * Writing to support without an account. The reply comes back to a private link (no email is sent), which the person
 * keeps; if they sign in later they can add the conversation to their account inbox.
 */
export function PublicSupportForm({ defaultCategory = 'other', subjectPlaceholder = 'How can we help?' }: { defaultCategory?: (typeof CATEGORIES)[number]['value']; subjectPlaceholder?: string }) {
  const [startedAt] = useState(() => Date.now())
  const [website, setWebsite] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ number: string; path: string } | null>(null)
  const [form, setForm] = useState({ name: '', email: '', category: defaultCategory, subject: '', message: '' })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSending(true)
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, website, startedAt }) })
      const data = (await res.json().catch(() => ({}))) as { error?: string; number?: string; token?: string }
      if (!res.ok || !data.token || !data.number) throw new Error(data.error ?? 'Your message could not be sent. Please try again.')
      const path = `/support/conversation/${data.token}`
      rememberConversation({ number: data.number, subject: form.subject, path, at: Date.now() })
      setDone({ number: data.number, path })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your message could not be sent. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return (
      <div className="py-6 text-center" role="status">
        <CheckCircle className="mx-auto mb-4 h-14 w-14 text-green-700" aria-hidden="true" />
        <h3 className="mb-2 text-2xl font-semibold">Message sent</h3>
        <p className="mb-2 text-muted-foreground">Your reference is <span className="font-mono font-semibold text-foreground">{done.number}</span>.</p>
        <p className="mb-6 text-muted-foreground">
          Our reply will appear on your private conversation page. <strong>We do not send email</strong>, so bookmark that page: it is the only way back to it. This browser will also remember it.
        </p>
        <Button asChild>
          <Link href={done.path}>Open my conversation</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="psf-website">Leave this field empty</label>
        <Input id="psf-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="psf-name">Your name</Label>
        <Input id="psf-name" className="mt-2" required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="psf-email">Your email address</Label>
        <Input id="psf-email" className="mt-2" type="email" required maxLength={160} autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <p className="mt-1 text-xs text-muted-foreground">We use it to identify you and to check the address is real. We do not send email; replies appear on your private conversation page.</p>
      </div>
      <div>
        <Label htmlFor="psf-category">What is it about?</Label>
        <select id="psf-category" className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-10" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as typeof form.category })}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="psf-subject">Subject</Label>
        <Input id="psf-subject" className="mt-2" required minLength={3} maxLength={160} placeholder={subjectPlaceholder} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="psf-message">Message</Label>
        <Textarea id="psf-message" className="mt-2" rows={6} required minLength={10} maxLength={4000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Button type="submit" disabled={sending} className="w-full gap-2">
        <Send className="h-4 w-4" aria-hidden="true" />
        {sending ? 'Sending…' : 'Send message'}
      </Button>
    </form>
  )
}
