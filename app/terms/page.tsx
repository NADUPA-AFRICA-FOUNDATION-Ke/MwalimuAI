import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'
import { LEGAL_UPDATED, OPERATOR, SUPPORT_EMAIL } from '@/lib/site'
import { CERTIFICATE_PASS_RATIO, MIN_REFLECTIONS_FOR_CERTIFICATE } from '@/convex/lib/certificateRules'

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'The terms that apply when you use Mwalimu AI.',
}

const link = 'text-primary underline underline-offset-4'
const h2 = 'mb-3 text-2xl font-semibold text-foreground'

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto max-w-4xl px-4 py-16 md:px-8">
        <h1 className="mb-4 text-4xl font-bold">Terms &amp; Conditions</h1>
        <p className="mb-10 text-muted-foreground">Last updated: {LEGAL_UPDATED}</p>

        <div className="space-y-8 text-muted-foreground">
          <section>
            <h2 className={h2}>1. Using Mwalimu AI</h2>
            <p>
              Mwalimu AI provides professional-development learning tools for adult educators.{OPERATOR.name ? ` It is operated by ${OPERATOR.name}.` : ''} You must give accurate account information, keep your sign-in details secure, and use the service lawfully.
            </p>
          </section>
          <section>
            <h2 className={h2}>2. Your content</h2>
            <p>You keep ownership of what you write (journal entries, community posts, messages). You allow us to store and process it only as needed to run, secure and support the service. Do not put learners&apos; personal details or confidential information into the app, or content you have no right to share.</p>
          </section>
          <section>
            <h2 className={h2}>3. AI Coach and tools</h2>
            <p>AI replies are suggestions to help with planning and teaching. They can be incomplete or wrong, and are not professional, legal, medical or safeguarding advice. Check them and apply your own judgement and your school&apos;s and the curriculum&apos;s requirements. Each account has a daily AI allowance, which we may change.</p>
          </section>
          <section>
            <h2 className={h2}>4. Certificates</h2>
            <p>
              A Mwalimu AI certificate shows that you completed a learning path on this platform: all its lessons, at least {MIN_REFLECTIONS_FOR_CERTIFICATE} reflections, and a final assessment score of at least {Math.round(CERTIFICATE_PASS_RATIO * 100)}%. It is not a qualification awarded by the Teachers Service Commission, the Kenya Institute of Curriculum Development or any other regulator, and we do not claim otherwise. Anyone can check a certificate by its serial number on the Verify page. We may revoke a certificate that was obtained improperly.
            </p>
          </section>
          <section>
            <h2 className={h2}>5. Plans and payments</h2>
            <p>
              What each plan includes, and its price, is on the <Link className={link} href="/pricing">pricing page</Link>. Paid plans are billed monthly in Kenya shillings by card through Stripe. You can cancel at any time in Settings → Your plan; cancelling ends the plan straight away and you are not charged again. We may change prices or plan contents for future billing periods and will show the new details on the pricing page before you are charged.
            </p>
          </section>
          <section>
            <h2 className={h2}>6. Schools</h2>
            <p>If you join a school with its code, the head teacher can see your learning progress (lessons finished, certificates and last activity), as described in the <Link className={link} href="/privacy">Privacy Policy</Link>. You can leave the school at any time.</p>
          </section>
          <section>
            <h2 className={h2}>7. Community conduct</h2>
            <p>Be respectful, and do not post anything unlawful, abusive, misleading, or that exposes learners or colleagues. Reported posts are reviewed by staff, who can remove them.</p>
          </section>
          <section>
            <h2 className={h2}>8. Acceptable use</h2>
            <p>Do not misuse the service, attempt unauthorised access, interfere with other users, send spam, scrape content, or use the platform to harm people. We may suspend an account when that is needed to protect users or the service.</p>
          </section>
          <section>
            <h2 className={h2}>9. Availability and changes</h2>
            <p>We work to keep Mwalimu AI available, but features can change and there may be interruptions for maintenance or security. If we change these terms in a way that matters, we will update the date at the top of this page.</p>
          </section>
          <section>
            <h2 className={h2}>10. Contact</h2>
            <p>
              Questions about these terms: use the <Link className={link} href="/contact">Contact page</Link>
              {SUPPORT_EMAIL && <> or write to <a className={link} href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></>}. See also our <Link className={link} href="/privacy">Privacy Policy</Link>.
            </p>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  )
}
