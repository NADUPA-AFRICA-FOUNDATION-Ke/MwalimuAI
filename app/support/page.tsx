'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'
import Link from 'next/link'
import { MessageSquare, Mail, FileText, HelpCircle } from 'lucide-react'
import { PublicSupportForm } from '@/components/public-support-form'
import { SUPPORT_EMAIL } from '@/lib/site'

const supportOptions = [
  {
    icon: FileText,
    title: 'Documentation',
    description: 'Step-by-step guides to the main features',
    action: 'View Docs',
    href: '/docs',
  },
  {
    icon: HelpCircle,
    title: 'FAQ',
    description: 'Find answers to commonly asked questions',
    action: 'View FAQ',
    href: '/faq',
  },
  {
    icon: MessageSquare,
    title: 'Community Forum',
    description: 'Get help from fellow teachers',
    action: 'Visit Forum',
    href: '/dashboard/community',
  },
]

export default function SupportPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      <main>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">Support Center</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Find resources, get answers, or send a support request about your account or the platform.
        </p>
      </section>

      {/* Quick Links */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {supportOptions.map((option) => (
            <Card key={option.title} className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <option.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{option.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{option.description}</p>
              <Button asChild variant="outline" size="sm">
                <Link href={option.href}>
                  {option.action}
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* Support Form */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
        <div className="grid md:grid-cols-2 gap-12">
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-2">Send us a message</h2>
            <p className="text-sm text-muted-foreground mb-6">Signed in? <Link href="/dashboard/support" className="underline text-primary">Raise a ticket from your dashboard</Link> and see replies there. Otherwise use this form: your reply appears on a private page, not in your email.</p>
            <PublicSupportForm defaultCategory="technical" subjectPlaceholder="Brief description of your issue" />
          </Card>

          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
              <p className="text-muted-foreground mb-8">
                Use the support form for account questions, technical issues, content questions, or feedback.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{SUPPORT_EMAIL ? 'Email Support' : 'How we reply'}</h3>
                  {SUPPORT_EMAIL ? (
                    <a className="text-primary underline underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
                  ) : (
                    <p className="text-muted-foreground">Use the form above. Messages go straight to our support team, and we reply to the email address you give.</p>
                  )}
                </div>
              </div>
            </div>

            <Card className="p-6 bg-muted/50">
              <h3 className="font-semibold mb-2">Need account help?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Include the email used for your account and a short description of the issue so it can be investigated.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/pricing">
                  View Plans
                </Link>
              </Button>
            </Card>
          </div>
        </div>
      </section>

      </main>

      <MarketingFooter />
    </div>
  )
}
