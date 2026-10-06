import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'
import { LEGAL_UPDATED, OPERATOR, SUPPORT_EMAIL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What Mwalimu AI collects, why, who it is shared with, how long it is kept, and how to see or delete it.',
}

const link = 'text-primary underline underline-offset-4'
const h2 = 'text-2xl font-semibold mb-3'
const p = 'text-muted-foreground mb-4'
const ul = 'list-disc pl-6 text-muted-foreground space-y-2 mb-4'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="max-w-4xl mx-auto px-4 md:px-8 py-16">
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10">Last updated: {LEGAL_UPDATED}</p>

        <div className="space-y-10">
          <section>
            <h2 className={h2}>1. Who this covers</h2>
            <p className={p}>
              This policy explains what personal information Mwalimu AI collects from the teachers who use it, why, who it is shared with, how long it is kept, and what you can do about it. It is written to match what the app actually does today.
            </p>
            {(OPERATOR.name || OPERATOR.address || OPERATOR.odpcRegistration) && (
              <p className={p}>
                {OPERATOR.name && <>Operated by {OPERATOR.name}. </>}
                {OPERATOR.address && <>Address: {OPERATOR.address}. </>}
                {OPERATOR.odpcRegistration && <>Registered with the Office of the Data Protection Commissioner under {OPERATOR.odpcRegistration}.</>}
              </p>
            )}
          </section>

          <section>
            <h2 className={h2}>2. What we collect</h2>
            <p className={p}>Information you give us:</p>
            <ul className={ul}>
              <li>Account: your email address and a password (stored only in scrambled, hashed form), or your name, email address and profile picture from Google if you sign in with Google.</li>
              <li>Profile: your name, school, county, the subjects and grades you teach, your CBC experience level, and your language and accessibility settings.</li>
              <li>What you do in the app: lessons completed, quiz and assessment answers and scores, lesson reflections, needs-assessment answers, goals, journal entries, community posts and replies, and support tickets and their messages.</li>
              <li>Your AI Coach and AI tool conversations, which are saved so you can return to them.</li>
              <li>Messages you send through the Contact and Support forms: your name, the email address you type, and your message. Our replies are kept with them. If you are not signed in, you are given a private link to the conversation (we store only a scrambled form of it, never the link itself). We check that the address&apos;s domain can receive mail but do not send email to it.</li>
            </ul>
            <p className={p}>Information created as you use the service:</p>
            <ul className={ul}>
              <li>Certificates you earn (a serial number, the path, the date and, until you delete your account, your name).</li>
              <li>The days you were active, used for streaks, and in-app notifications.</li>
              <li>Your plan and billing status. Card payments are handled by Stripe; we receive a customer and subscription reference and the plan status, never your card number.</li>
              <li>If you join a school: that membership.</li>
              <li>A random device identifier kept in your browser, used so that an account is open on one device at a time.</li>
              <li>Technical error reports (the error message, the page it happened on and your browser type) kept to fix bugs. They are not meant to include what you wrote.</li>
              <li>Counts of AI requests per day, to apply the daily allowance.</li>
            </ul>
          </section>

          <section>
            <h2 className={h2}>3. Why we use it</h2>
            <ul className={ul}>
              <li>To run your account: sign you in, save your progress, issue and verify certificates, and show your dashboard.</li>
              <li>To give you AI answers: your message is sent to an AI provider (see section 5).</li>
              <li>To take payment and apply your plan.</li>
              <li>To answer your tickets and messages. Replies stay in the app (your Support page, or your private conversation page); we do not email learners.</li>
              <li>To keep the service safe and working: limits on AI use, spam protection on the forms, moderation of reported community posts, and bug reports.</li>
              <li>To understand how the service is used, in aggregate: for example counts of completed lessons and how many people picked each answer in the needs assessment. These counts are not tied to your name.</li>
            </ul>
            <p className={p}>We do not sell your personal information, and we do not use your conversations to train AI models.</p>
          </section>

          <section>
            <h2 className={h2}>4. Who can see it</h2>
            <ul className={ul}>
              <li><strong>Other learners</strong> see your name on your community posts and replies, and nothing else.</li>
              <li><strong>Your head teacher</strong>, only if you join a school with its code: your lessons finished, certificates and when you were last active. Not your journal, AI conversations, messages or contact details. You can leave at any time and they lose access at once.</li>
              <li><strong>Our staff</strong> see what they need for their job through a console that requires a second sign-in step. Support staff can see your profile and progress and the tickets you send them; they cannot read the contents of your journal or AI conversations. Staff actions are logged.</li>
              <li><strong>Anyone</strong> can check a certificate by its serial number on the Verify page; it shows whether it is genuine and which path it is for.</li>
            </ul>
          </section>

          <section>
            <h2 className={h2}>5. Companies that process data for us</h2>
            <p className={p}>We use these providers to run the service. Each receives only what its job needs.</p>
            <ul className={ul}>
              <li><strong>Convex</strong>: our database and backend, which stores your account and learning data.</li>
              <li><strong>Vercel</strong>: hosts the website. If you accept analytics cookies, Vercel Web Analytics also measures page visits.</li>
              <li><strong>Groq</strong>: generates AI Coach and AI tool replies. It receives the message you send and the lesson context needed to answer it.</li>
              <li><strong>Stripe</strong>: takes card payments and manages subscriptions.</li>
              <li><strong>Resend</strong>: sends a few emails to our own staff, such as staff invitations. We do not use it to email learners.</li>
              <li><strong>Google</strong>: only if you choose Continue with Google.</li>
            </ul>
            <p className={p}>These providers operate outside Kenya, including in the United States, so your information can be processed there.</p>
          </section>

          <section>
            <h2 className={h2}>6. Cookies and local storage</h2>
            <p className={p}>
              We set one cookie to remember your cookie choice (<code>mwalimu_cookie_consent</code>, kept for 180 days). Your sign-in session, language, accessibility settings, device identifier and any lessons you save for offline use are stored in your browser&apos;s local storage on your device. Analytics runs only if you accept it in the cookie banner.
            </p>
          </section>

          <section>
            <h2 className={h2}>7. How long we keep it</h2>
            <ul className={ul}>
              <li>Your account data: until you delete your account.</li>
              <li>Technical error reports: 90 days.</li>
              <li>Daily AI usage counts: about two months.</li>
              <li>Support tickets: two years after they are resolved.</li>
              <li>Notifications you have read or dismissed: six months.</li>
              <li>Contact-form messages that staff have dealt with: one year after they arrived.</li>
              <li>A certificate&apos;s verification record stays so the certificate remains checkable, but it no longer shows your name once you delete your account.</li>
              <li>Records of staff actions are kept for accountability.</li>
            </ul>
          </section>

          <section>
            <h2 className={h2}>8. Your rights and how to use them</h2>
            <p className={p}>Under Kenya&apos;s Data Protection Act, 2019 you can see, correct and delete your personal data, ask for a copy, and object to how it is used. In the app:</p>
            <ul className={ul}>
              <li><strong>See or take a copy:</strong> Settings → Download My Data gives you a file with your profile, progress, certificates, activity, journal, AI conversations, community posts and support tickets.</li>
              <li><strong>Correct:</strong> change your profile and settings in Settings.</li>
              <li><strong>Delete:</strong> Settings → Delete Account removes your profile, progress, journal, AI conversations, activity and support tickets, and your community posts. If you have a paid plan, cancel it first.</li>
              <li><strong>Password:</strong> change it in Settings → Change password. If you are locked out, ask support on the Support page and they will give you a temporary password.</li>
            </ul>
            <p className={p}>
              For anything else, send us a message through the <Link className={link} href="/contact">Contact page</Link>
              {SUPPORT_EMAIL && <> or write to <a className={link} href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></>}. If you are not satisfied with our answer you can complain to the{' '}
              <a className={link} href="https://www.odpc.go.ke/" target="_blank" rel="noopener noreferrer">Office of the Data Protection Commissioner</a>.
            </p>
          </section>

          <section>
            <h2 className={h2}>9. Security</h2>
            <ul className={ul}>
              <li>The site is served over HTTPS only.</li>
              <li>Passwords are stored hashed, never in plain text.</li>
              <li>Staff tools need a second sign-in step and each staff role can only do what it needs to; every change is logged.</li>
              <li>No system is perfectly secure. If a breach affects you we will tell you and the authorities as the law requires.</li>
            </ul>
          </section>

          <section>
            <h2 className={h2}>10. Children</h2>
            <p className={p}>Mwalimu AI is for adult teachers and is not meant for children. Please do not put learners&apos; personal details into the journal, community or AI tools.</p>
          </section>

          <section>
            <h2 className={h2}>11. Changes</h2>
            <p className={p}>If we change this policy in a way that matters, we will update the date at the top of this page. Earlier versions are not kept on this page.</p>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  )
}
