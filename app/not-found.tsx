import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'
import { AppErrorState } from '@/components/app-error-state'

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <AppErrorState variant="not-found" />
      <MarketingFooter />
    </div>
  )
}
