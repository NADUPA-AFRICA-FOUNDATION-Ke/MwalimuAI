import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'
import { DocsBrowser } from '@/components/docs-browser'
import { DOCS } from '@/lib/docs-data'

export const metadata = {
  title: 'Documentation',
  description: 'Guides to Mwalimu AI: getting started, learning paths and certificates, the AI Coach, community, account and troubleshooting.',
}

export default function DocsPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main>
        <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Documentation</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">Step-by-step guides to what Mwalimu AI does today.</p>
        </section>
        <DocsBrowser sections={DOCS} />
      </main>
      <MarketingFooter />
    </div>
  )
}
