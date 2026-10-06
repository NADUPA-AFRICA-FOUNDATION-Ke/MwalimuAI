// The Documentation page. Each guide describes what the product does today; the rules quoted (certificate
// requirements) come from the same constants the product enforces. Update this when the product changes.
import { CERTIFICATE_PASS_RATIO, MIN_REFLECTIONS_FOR_CERTIFICATE } from '../convex/lib/certificateRules'

export type DocArticle = { id: string; title: string; body: string[] } // body: paragraphs; lines starting "- " render as a list
export type DocSection = { id: string; title: string; summary: string; articles: DocArticle[] }

const passPercent = Math.round(CERTIFICATE_PASS_RATIO * 100)

export const DOCS: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    summary: 'Create an account and find your way around.',
    articles: [
      {
        id: 'create-account',
        title: 'Create your account',
        body: [
          'Choose Sign up. Enter an email address and a password of at least 8 characters, or continue with Google.',
          'There is no verification email to wait for: you are signed in straight away.',
        ],
      },
      {
        id: 'setup',
        title: 'The short setup',
        body: [
          'After sign-up you answer a few questions in four steps:',
          '- Your name, school and county',
          '- The subjects and grades you teach',
          '- Your CBC experience level',
          '- A short CBC quiz that suggests where to start',
          'You can skip the setup and fill in your profile later in Settings.',
        ],
      },
      {
        id: 'needs-assessment',
        title: 'The needs assessment',
        body: [
          'Dashboard → Assessment is a longer questionnaire about your classroom and your CBC knowledge. At the end it recommends learning paths to start with.',
        ],
      },
      {
        id: 'dashboard',
        title: 'Finding your way around',
        body: [
          'The menu groups what you can do:',
          '- Learn: your dashboard, learning paths, modules and the needs assessment',
          '- AI & Tools: the AI Coach, AI teaching tools and your journal',
          '- Community: the teacher forum and the resource library',
          '- Progress: your achievements and progress',
          'School, Support and Settings are in the menu too.',
        ],
      },
    ],
  },
  {
    id: 'learning',
    title: 'Learning paths and certificates',
    summary: 'How a path works and how to earn a certificate.',
    articles: [
      {
        id: 'structure',
        title: 'How a learning path is organised',
        body: [
          'A path is made of modules, and each module has lessons. A path also has quizzes (a pre-assessment before you start and a final assessment at the end) and an assignment.',
          'Open Dashboard → Learn, choose a path, and work through the lessons in order.',
        ],
      },
      {
        id: 'certificates',
        title: 'Earning a certificate',
        body: [
          'To earn the certificate for a learning path you need all three:',
          '- Complete every lesson in the path',
          `- Write at least ${MIN_REFLECTIONS_FOR_CERTIFICATE} reflections (each lesson has a reflection question)`,
          `- Score at least ${passPercent}% on the final assessment`,
          'Certificates are free on every plan. Each one has a serial number like MW-XXXXX-XXXXX.',
        ],
      },
      {
        id: 'verify',
        title: 'Verifying a certificate',
        body: [
          'Anyone can check a certificate: open the Verify page of this website and enter the serial number. It tells you whether the certificate is genuine and which path it is for.',
          'If you delete your account, your certificate stays verifiable but no longer shows your name.',
        ],
      },
      {
        id: 'offline',
        title: 'Reading lessons offline',
        body: [
          'On a learning path choose Save for offline. The lessons are stored on that device and open without a connection.',
          'Lessons you complete while offline are kept on the device and sent to your account when you are back online.',
          'The AI Coach and AI tools always need internet.',
        ],
      },
      {
        id: 'language',
        title: 'English and Kiswahili',
        body: ['Change the language in Settings. Lessons appear in Kiswahili where a translation has been published; otherwise they appear in English.'],
      },
    ],
  },
  {
    id: 'ai',
    title: 'AI Coach and tools',
    summary: 'What the AI features do and their limits.',
    articles: [
      {
        id: 'coach',
        title: 'Using the AI Coach',
        body: [
          'Describe a teaching question or a classroom situation. The Coach replies with suggestions you can ask follow-up questions about.',
          'AI answers can be incomplete or wrong. Check them against your own judgement, the curriculum documents and your school’s guidance.',
        ],
      },
      {
        id: 'tools',
        title: 'The AI teaching tools',
        body: [
          'Dashboard → Tools has eight tools:',
          '- Lesson Plan Generator',
          '- Report Card Comments',
          '- Differentiation Advisor',
          '- Parent Communication Helper',
          '- AI Lesson Rehearsal',
          '- Assignment Feedback',
          '- Action Research Guide',
          '- Policy Explainer',
        ],
      },
      {
        id: 'allowance',
        title: 'The daily allowance',
        body: [
          'The AI Coach and the tools share one daily allowance. It resets at midnight Kenya time. When you reach it, the app tells you and the allowance returns the next day.',
          'The pricing page shows the current allowance for the free and paid plans.',
        ],
      },
      {
        id: 'ai-privacy',
        title: 'Your conversations',
        body: [
          'Conversations are saved in your account so you can return to them, and are included in Download My Data.',
          'What you type is sent to an AI service provider to produce the reply. The Privacy Policy lists the providers.',
        ],
      },
    ],
  },
  {
    id: 'community',
    title: 'Community',
    summary: 'The teacher forum.',
    articles: [
      {
        id: 'posting',
        title: 'Posting and replying',
        body: ['Dashboard → Community lets you post a question or idea and reply to others. Your name appears on your posts and replies.'],
      },
      {
        id: 'reporting',
        title: 'Reporting a post',
        body: ['Every post and reply has a flag button. Reporting sends it to our staff to review. Nothing is hidden until a person has looked at it.'],
      },
    ],
  },
  {
    id: 'account',
    title: 'Account, plans and your data',
    summary: 'Settings, billing, and what you control.',
    articles: [
      {
        id: 'settings',
        title: 'Settings',
        body: [
          'In Settings you can change your language, switch on low-bandwidth mode, change your password, download your data, and manage your plan.',
        ],
      },
      {
        id: 'plans',
        title: 'Plans, paying and cancelling',
        body: [
          'The free plan includes learning paths, certificates, the community, progress tracking and offline lessons. Paid plans raise your daily AI allowance; the School plan adds the head-teacher dashboard. See the pricing page for prices.',
          'Payment is by card on Stripe’s secure checkout page. To cancel, open Settings → Your plan → Cancel my plan. The plan ends straight away and you are not charged again.',
        ],
      },
      {
        id: 'school',
        title: 'Using a school code',
        body: [
          'If your head teacher is on the School plan, they give you a code. Dashboard → School lets you join with it.',
          'Once you join, your head teacher can see your lessons finished, certificates and when you were last active. They cannot see your journal, AI conversations, messages or contact details. You can leave at any time and they lose access at once.',
        ],
      },
      {
        id: 'download-delete',
        title: 'Downloading or deleting your data',
        body: [
          'Settings → Download My Data saves a file of everything we hold about you.',
          'Settings → Delete Account removes your profile, progress, journal, AI conversations, activity and support tickets permanently, and removes your community posts. If you have a paid plan, cancel it first.',
        ],
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    summary: 'Common problems and what to do.',
    articles: [
      {
        id: 'sign-in',
        title: 'I cannot sign in',
        body: [
          'If you signed up with Google, use Continue with Google. If you signed up with a password and forgot it, choose Forgot password on the login page. We do not send password emails: write to our team there, and they give you a temporary password on a private page. Sign in with it, then change it in Settings.',
          'If it still fails, send us a message from the Support page.',
        ],
      },
      {
        id: 'progress',
        title: 'My progress did not save',
        body: [
          'Progress is saved to your account when you are online. If you were offline it is kept on your device and saved when the connection returns, so open the app online once.',
        ],
      },
      {
        id: 'limit',
        title: 'The AI says I have used my allowance',
        body: ['The daily allowance resets at midnight Kenya time. A paid plan raises it.'],
      },
      {
        id: 'support',
        title: 'Contacting support',
        body: [
          'Signed in: Dashboard → Support lets you raise a ticket and see replies in the app.',
          'Not signed in: use the Contact or Support page. After you send, you get a private conversation page where our reply appears. Bookmark it: we do not send email. If you later sign in, you can add the conversation to your account.',
        ],
      },
    ],
  },
]
