import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'
import { FaqList } from '@/components/faq-list'
import { FAQS } from '@/lib/faq-data'
import { cmsFaq } from '@/lib/server-content'
import Link from 'next/link'

// The FAQ is managed in the admin console; edits appear here within a few minutes.
export const revalidate = 300

export default async function FAQPage() {
  const faqs = (await cmsFaq()) ?? FAQS
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
        <FaqList sections={faqs} />
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
