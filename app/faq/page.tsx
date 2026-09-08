'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'

const faqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'What is Mwalimu AI?',
        a: 'Mwalimu AI is a professional learning platform for Kenyan CBC teachers. It brings together learning modules, an AI Coach, teacher tools, community discussions, and progress tracking.',
      },
      {
        q: 'How do I get started?',
        a: 'Create an account, complete your profile, and open your dashboard. From there you can choose a module, take the needs assessment, or open the AI Coach.',
      },
      {
        q: 'How do I create an account?',
        a: 'Click Sign Up, enter your email and password, then complete your profile with your teaching details. Follow any verification instructions shown after sign-up.',
      },
      {
        q: 'What devices can I use Mwalimu AI on?',
        a: 'Mwalimu AI is a responsive web app that can be used on a phone, tablet, laptop, or desktop with a modern browser.',
      },
    ],
  },
  {
    category: 'Learning & Content',
    questions: [
      {
        q: 'What topics do the learning modules cover?',
        a: 'Available modules cover teaching and professional learning topics. Open the Learning Modules area to see the current content and descriptions.',
      },
      {
        q: 'How long does each module take to complete?',
        a: 'Module length varies. The module page shows the lessons and activities included, and you can return to your progress when you are ready.',
      },
      {
        q: 'Do I get a certificate after completing modules?',
        a: 'Certificate availability depends on the learning content and plan shown in the product. Check the relevant module or plan details for the current information.',
      },
      {
        q: 'Can I download content for offline use?',
        a: 'Some saved content can be available offline. The AI Coach still needs an internet connection for a live response.',
      },
    ],
  },
  {
    category: 'AI Coach',
    questions: [
      {
        q: 'How does the AI Coach work?',
        a: 'Type a teaching or planning question, or describe a classroom challenge. The AI Coach returns suggestions that you should review alongside your own professional judgment and school guidance.',
      },
      {
        q: 'What kind of questions can I ask the AI Coach?',
        a: 'You can ask about lesson planning, assessment, classroom management, teaching strategies, or a specific classroom challenge.',
      },
      {
        q: 'Does the AI Coach need an internet connection?',
        a: 'Yes. A live AI Coach response requires an internet connection.',
      },
      {
        q: 'How accurate is the AI Coach advice?',
        a: 'AI responses can be incomplete or incorrect. Review suggestions alongside your own professional judgment and school guidance.',
      },
    ],
  },
  {
    category: 'Account & Billing',
    questions: [
      {
        q: 'How do I manage a paid plan?',
        a: 'Open the pricing page to review the current plans. If you choose a paid plan, the checkout flow will show the available payment and account steps.',
      },
      {
        q: 'Can I cancel my subscription anytime?',
        a: 'Plan changes and cancellation options are shown in your account or checkout experience. Contact support if you need help with a paid plan.',
      },
      {
        q: 'Can I ask about using Mwalimu AI with a school?',
        a: 'Yes. Send a message through the contact form with the details of your school or team and the support team can advise on the next step.',
      },
      {
        q: 'How do I reset my password?',
        a: 'Click "Forgot Password" on the login page and enter your email address. You\'ll receive a link to create a new password within a few minutes.',
      },
    ],
  },
]

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const answerId = `faq-answer-${question.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={answerId}
        className="w-full min-h-11 py-4 flex items-center justify-between text-left"
      >
        <span className="font-medium pr-4">{question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
        )}
      </button>
      <div id={answerId} aria-hidden={!isOpen} className={`pb-4 text-muted-foreground ${isOpen ? '' : 'hidden'}`}>
          {answer}
      </div>
    </div>
  )
}

export default function FAQPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      <main>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">Frequently Asked Questions</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Find answers to common questions about Mwalimu AI. Can&apos;t find what you&apos;re looking for?
          Contact our support team.
        </p>
      </section>

      {/* FAQ Sections */}
      <section className="max-w-4xl mx-auto px-4 md:px-8 pb-20">
        <div className="space-y-8">
          {faqs.map((section) => (
            <Card key={section.category} className="p-6">
              <h2 className="text-xl font-semibold mb-4">{section.category}</h2>
              <div>
                {section.questions.map((faq) => (
                  <FAQItem key={faq.q} question={faq.q} answer={faq.a} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="max-w-4xl mx-auto px-4 md:px-8 pb-20">
        <Card className="p-8 text-center bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <h2 className="text-2xl font-bold mb-4">Still Have Questions?</h2>
          <p className="text-muted-foreground mb-6">
            If your question is not here, send us a message through the contact form.
          </p>
          <Button asChild><Link href="/contact">Contact Support</Link></Button>
        </Card>
      </section>

      </main>

      <MarketingFooter />
    </div>
  )
}
