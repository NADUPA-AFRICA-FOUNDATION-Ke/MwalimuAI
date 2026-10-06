// The built-in FAQ. Staff manage the live copy in the admin console (Content > FAQ); the public FAQ page uses the
// published copy when one exists and falls back to this. Every answer describes what the product does today;
// numbers come from the same constants the product enforces.
import { CERTIFICATE_PASS_RATIO, MIN_REFLECTIONS_FOR_CERTIFICATE } from '../convex/lib/certificateRules'

export type FaqSection = { category: string; questions: { q: string; a: string }[] }

const passPercent = Math.round(CERTIFICATE_PASS_RATIO * 100)

export const FAQS: FaqSection[] = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'What is Mwalimu AI?',
        a: 'A web app for Kenyan CBC teachers: learning paths with quizzes and certificates, an AI Coach and AI teaching tools, a community forum, and progress tracking.',
      },
      {
        q: 'How do I create an account?',
        a: 'Choose Sign up, then enter an email address and a password of at least 8 characters, or continue with Google. There is no verification email to wait for. A short setup follows: your name, school and county, subjects and grades, and a few CBC questions that suggest a starting level.',
      },
      {
        q: 'What devices can I use?',
        a: 'Any phone, tablet or computer with a modern web browser. There is nothing to install.',
      },
      {
        q: 'Do I have to pay?',
        a: 'No. Learning paths, certificates, the community, progress tracking and offline lessons are free. A paid plan raises your daily AI allowance, and the School plan adds a head-teacher dashboard. The pricing page shows the current prices and numbers.',
      },
    ],
  },
  {
    category: 'Learning & Certificates',
    questions: [
      {
        q: 'What can I learn here?',
        a: 'Open Learn in your dashboard to see the learning paths that are published now, with their hours and lessons. Each path has lessons, quizzes, a final assessment and an assignment.',
      },
      {
        q: 'How do I earn a certificate?',
        a: `For each learning path you complete every lesson, write at least ${MIN_REFLECTIONS_FOR_CERTIFICATE} reflections, and score at least ${passPercent}% on the final assessment. Certificates are free on every plan.`,
      },
      {
        q: 'How can someone check that my certificate is genuine?',
        a: 'Every certificate has a serial number that looks like MW-XXXXX-XXXXX. Anyone can enter it on the Verify page of this website to see whether it is genuine. A certificate you earned stays verifiable even after you delete your account, but it no longer shows your name.',
      },
      {
        q: 'Can I read lessons offline?',
        a: 'Yes. Open a learning path and choose Save for offline. Saved lessons open on that device without a connection. The AI Coach and AI tools always need internet.',
      },
      {
        q: 'Are lessons available in Kiswahili?',
        a: 'Where a Kiswahili translation has been published, the lesson appears in Kiswahili; otherwise it appears in English. Change the language in Settings.',
      },
    ],
  },
  {
    category: 'AI Coach & Tools',
    questions: [
      {
        q: 'How does the AI Coach work?',
        a: 'Describe a teaching question or a classroom situation and the Coach suggests ideas. The AI tools (such as the Lesson Plan Generator and Report Card Comments) work the same way for specific jobs.',
      },
      {
        q: 'How many AI requests can I make?',
        a: 'There is one daily allowance shared by the AI Coach and the AI tools. It resets at midnight Kenya time. The pricing page lists the current allowance for the free and paid plans.',
      },
      {
        q: 'How accurate is the advice?',
        a: 'AI answers can be incomplete or wrong. Treat them as suggestions and check them against your own professional judgement, the curriculum documents and your school’s guidance.',
      },
      {
        q: 'Who can see my conversations?',
        a: 'Your AI conversations are saved in your account so you can come back to them, and they are included when you download your data. What you type is sent to an AI service provider to produce the reply (see the Privacy Policy). Support staff cannot read the contents of your conversations or journal.',
      },
    ],
  },
  {
    category: 'Account & Billing',
    questions: [
      {
        q: 'How do I pay for a plan?',
        a: 'Sign in, open the pricing page and choose a plan. Payment is by card on Stripe’s secure checkout page, billed monthly in Kenya shillings. Your card details go to Stripe; we never see or store them.',
      },
      {
        q: 'How do I cancel?',
        a: 'Open Settings, find Your plan, and choose Cancel my plan. The plan ends straight away and you are not charged again. Your account, progress and certificates stay.',
      },
      {
        q: 'How do I reset my password?',
        a: 'We do not send password emails. On the login page choose Forgot password and write to our team with the email address on your account. They give you a temporary password on a private page. Sign in with it, then change it in Settings → Change password. If you signed up with Google, just use Continue with Google.',
      },
      {
        q: 'Can I download or delete my data?',
        a: 'Yes, both are in Settings. Download My Data gives you a file with your profile, progress, certificates, activity, journal, AI conversations, community posts and support tickets. Delete Account removes them permanently; if you have a paid plan, cancel it first.',
      },
      {
        q: 'Can my school use Mwalimu AI?',
        a: 'Yes. Teachers can each use their own account. A head teacher on the School plan can create a school, share its code, and see members’ learning progress. Use the contact form to ask about the School plan; our reply appears on your private conversation page.',
      },
      {
        q: 'How do I get help?',
        a: 'Signed in: Dashboard → Support lets you raise a ticket and see replies in the app. Not signed in: use the Contact or Support page; you get a private conversation page where our reply appears. Bookmark it, because we do not send email. You can add that conversation to your account later.',
      },
    ],
  },
]
