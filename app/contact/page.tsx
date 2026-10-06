'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'
import { Mail } from 'lucide-react'
import { PublicSupportForm } from '@/components/public-support-form'
import { SUPPORT_EMAIL } from '@/lib/site'

export default function ContactPage() {
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
            <PublicSupportForm subjectPlaceholder="How can we help?" />
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
                  <h3 className="font-semibold mb-1">{SUPPORT_EMAIL ? 'Email' : 'How we reply'}</h3>
                  {SUPPORT_EMAIL ? (
                    <a className="text-primary underline underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
                  ) : (
                    <p className="text-muted-foreground">Use the form. Messages go straight to our support team, and we reply to the email address you give.</p>
                  )}
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
