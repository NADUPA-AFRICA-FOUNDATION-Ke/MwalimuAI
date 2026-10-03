import Link from 'next/link'
import { BrandMark } from '@/components/brand-mark'

const COLUMNS = [
  { title: 'Product', links: [['/features', 'Features'], ['/pricing', 'Pricing'], ['/blog', 'Blog']] },
  { title: 'Company', links: [['/about', 'About'], ['/contact', 'Contact'], ['/privacy', 'Privacy'], ['/terms', 'Terms']] },
  { title: 'Help', links: [['/docs', 'Documentation'], ['/faq', 'FAQ'], ['/support', 'Support'], ['/verify', 'Verify a certificate']] },
]

/** One footer for every public page. Light, tonal, and every link is a 44px target. */
export function MarketingFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-secondary pb-[max(24px,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex min-h-11 w-fit items-center gap-2.5">
              <BrandMark className="h-9 w-9" />
              <span className="text-lg font-bold tracking-tight">Mwalimu AI</span>
            </Link>
            <p className="mt-2 max-w-[16rem] text-sm text-muted-foreground">Learn smarter. Teach better. Professional learning for Kenyan CBC teachers.</p>
          </div>
          {COLUMNS.map(({ title, links }) => (
            <nav key={title} aria-label={title}>
              <h2 className="mb-1 text-sm font-semibold text-foreground">{title}</h2>
              <ul>
                {links.map(([href, label]) => (
                  <li key={href}><Link href={href} className="flex min-h-11 items-center text-base text-muted-foreground hover:text-foreground">{label}</Link></li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">&copy; 2026 Mwalimu AI. All rights reserved.</p>
      </div>
    </footer>
  )
}
