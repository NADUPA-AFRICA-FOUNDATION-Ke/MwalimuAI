'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'
import { Mail, Send, CheckCircle } from 'lucide-react'

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [startedAt] = useState(() => Date.now())
  const [website, setWebsite] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setIsSending(true)
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, website, startedAt }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error ?? 'Message could not be sent.')
      setSubmitted(true)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Message could not be sent. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="min-h-screen">
      <MarketingHeader />

      <main>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">Contact Us</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Send a message about the platform, your account, or a classroom use case.
        </p>
      </section>

      {/* Contact Form & Info */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Form */}
          <Card className="p-8">
            {submitted ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-2xl font-semibold mb-2">Message Sent!</h3>
                <p className="text-muted-foreground mb-6">
                  Your message was sent. We&apos;ll follow up using the email address you provided.
                </p>
                <Button onClick={() => setSubmitted(false)} variant="outline">
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
                  <label htmlFor="website">Leave this field empty</label>
                  <Input id="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    minLength={2}
                    maxLength={100}
                    className="mt-2"
                    placeholder="John Kamau"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    maxLength={160}
                    className="mt-2"
                    placeholder="john@school.ac.ke"
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    minLength={3}
                    maxLength={160}
                    className="mt-2"
                    placeholder="How can we help?"
                  />
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    minLength={10}
                    maxLength={5000}
                    className="mt-2 min-h-[150px]"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>
                {formError && <p role="alert" aria-live="assertive" className="text-sm text-red-700">{formError}</p>}
                <Button type="submit" disabled={isSending} className="w-full gap-2">
                  <Send className="w-4 h-4" />
                  {isSending ? 'Sending…' : 'Send Message'}
                </Button>
              </form>
            )}
          </Card>

          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
              <p className="text-muted-foreground mb-8">
                Use the form to send a question, report an issue, or share feedback about Mwalimu AI.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Email</h3>
                  <p className="text-muted-foreground">support@mwalimu.ai</p>
                </div>
              </div>
            </div>

            <Card className="p-6 bg-muted/50">
              <h3 className="font-semibold mb-2">School and team questions</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Include your team size and what you want to use the platform for in the message form.
              </p>
              <p className="text-sm text-muted-foreground">A support reply will use the email address you provide.</p>
            </Card>
          </div>
        </div>
      </section>

      </main>

      <MarketingFooter />
    </div>
  )
}
