import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'
import Link from 'next/link'
import { BookOpen, Zap, Users, Settings, HelpCircle, FileText } from 'lucide-react'

export const metadata = {
  title: 'Documentation',
  description: 'Guides for using Mwalimu AI learning modules, AI Coach, community, and account features.',
}

const sectionLinks: Record<string, string> = {
  'Getting Started': '/auth/sign-up',
  'Learning Modules': '/dashboard/learning',
  'AI Coach': '/dashboard/ai-coach',
  'Community Forum': '/dashboard/community',
  'Account Settings': '/dashboard/settings',
  'Troubleshooting': '/support',
}

const docSections = [
  {
    icon: BookOpen,
    title: 'Getting Started',
    description: 'Create an account, complete your profile, and open your dashboard.',
    articles: [
      'Creating your account',
      'Completing the needs assessment',
      'Navigating the dashboard',
      'Setting up your profile',
    ],
  },
  {
    icon: FileText,
    title: 'Learning Modules',
    description: 'Open lessons and activities, then review completed work from your dashboard.',
    articles: [
      'Module structure and lessons',
      'Completing activities and quizzes',
      'Tracking your progress',
      'Earning certificates',
    ],
  },
  {
    icon: Zap,
    title: 'AI Coach',
    description: 'Use the AI Coach to ask teaching and planning questions.',
    articles: [
      'How the AI Coach works',
      'Asking effective questions',
      'Getting lesson plan help',
      'Classroom strategy advice',
    ],
  },
  {
    icon: Users,
    title: 'Community Forum',
    description: 'Read questions and participate in teacher discussions.',
    articles: [
      'Posting and replying',
      'Sharing resources',
      'Community guidelines',
      'Finding relevant discussions',
    ],
  },
  {
    icon: Settings,
    title: 'Account Settings',
    description: 'Review the account settings available to you.',
    articles: [
      'Updating your profile',
      'Notification preferences',
      'Managing your subscription',
      'Deleting your account',
    ],
  },
  {
    icon: HelpCircle,
    title: 'Troubleshooting',
    description: 'Review common account and platform issues, or contact support.',
    articles: [
      'Login problems',
      'Progress not saving',
      'Video playback issues',
      'Contacting support',
    ],
  },
]

export default function DocsPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      <main>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">Documentation</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Find practical guidance for accounts, learning modules, AI Coach, community, and support.
        </p>
      </section>

      {/* Search */}
      <section className="max-w-2xl mx-auto px-4 md:px-8 pb-12">
        <div className="relative">
          <label htmlFor="docs-search" className="sr-only">Search documentation</label>
          <input
            id="docs-search"
            type="search"
            aria-label="Search documentation"
            placeholder="Search documentation..."
            className="w-full px-4 py-3 rounded-lg border bg-background text-lg"
          />
        </div>
      </section>

      {/* Doc Sections */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {docSections.map((section) => (
            <Card key={section.title} className="p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <section.icon className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">{section.title}</h2>
              <p className="text-muted-foreground text-sm mb-4">{section.description}</p>
              <ul className="space-y-2">
                {section.articles.map((article) => (
                  <li key={article}>
                    <Link
                      href={sectionLinks[section.title]}
                      className="text-sm text-primary hover:underline"
                    >
                      {article}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Popular Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <h3 className="font-semibold mb-2">Guidance Articles</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Read articles about teaching, planning, and using the platform.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/blog">Browse Articles</Link>
              </Button>
            </div>
            <div className="text-center">
              <h3 className="font-semibold mb-2">CBC Quick Reference</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Browse the resources available in your dashboard.
              </p>
              <Button asChild variant="outline" size="sm"><Link href="/dashboard/resources">Browse Resources</Link></Button>
            </div>
            <div className="text-center">
              <h3 className="font-semibold mb-2">Community Support</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ask questions and get help from other teachers.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/community">Visit Forum</Link>
              </Button>
            </div>
          </div>
        </Card>
      </section>

      </main>

      <MarketingFooter />
    </div>
  )
}
