import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'
import { CoachExample, Faq, FinalCta, Hero, Steps, Tasks } from '@/components/marketing/landing'

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <Hero />
        <Tasks />
        <CoachExample />
        <Steps />
        <Faq />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  )
}
