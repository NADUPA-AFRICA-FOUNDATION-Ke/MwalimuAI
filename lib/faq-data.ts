// The built-in FAQ. Staff manage the live copy in the admin console (Content > FAQ); the public FAQ page uses the
// published copy when one exists and falls back to this.

export type FaqSection = { category: string; questions: { q: string; a: string }[] }

export const FAQS: FaqSection[] = [
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
