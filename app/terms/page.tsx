import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'The terms that apply when you use Mwalimu AI.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto max-w-4xl px-4 py-16 md:px-8">
        <h1 className="mb-4 text-4xl font-bold">Terms &amp; Conditions</h1>
        <p className="mb-10 text-muted-foreground">Last updated: September 7, 2026</p>

        <div className="space-y-8 leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">1. Using Mwalimu AI</h2>
            <p>Mwalimu AI provides professional-development learning tools for adult educators. You must provide accurate account information, keep your credentials secure, and use the service lawfully.</p>
          </section>
          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">2. Your content and account</h2>
            <p>You retain ownership of content you submit. You give us permission to store and process it only as needed to provide, secure, and improve the service. Do not upload confidential learner information or content you do not have permission to use.</p>
          </section>
          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">3. AI Coach</h2>
            <p>AI responses are educational assistance, not professional, legal, medical, or safeguarding advice. Review outputs and apply your own professional judgment and applicable school or curriculum requirements.</p>
          </section>
          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">4. Plans and payments</h2>
            <p>Free and paid features are described on the <Link className="text-primary underline underline-offset-4" href="/pricing">pricing page</Link>. Paid subscriptions, where offered, renew and may be cancelled according to the checkout terms shown before payment.</p>
          </section>
          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">5. Acceptable use</h2>
            <p>Do not misuse the service, attempt unauthorized access, interfere with other users, send spam, scrape content, or use the platform to harm people. We may suspend access when necessary to protect users or the service.</p>
          </section>
          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">6. Availability and changes</h2>
            <p>We work to keep Mwalimu AI available, but features may change and temporary interruptions may occur for maintenance or security. We may update these terms; the revised version will be posted here with a new date.</p>
          </section>
          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">7. Contact</h2>
            <p>Questions about these terms can be sent to <a className="text-primary underline underline-offset-4" href="mailto:support@mwalimu.ai">support@mwalimu.ai</a>. Please also review our <Link className="text-primary underline underline-offset-4" href="/privacy">Privacy Policy</Link>.</p>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  )
}
