import type { Metadata, Viewport } from 'next'
import { Providers } from '@/components/providers'
import { GradientBackground } from '@/components/gradient-background'
import { SWRegister } from '@/components/sw-register'
import { AnalyticsConsent } from '@/components/analytics-consent'
import { CookieConsent } from '@/components/cookie-consent'
import './globals.css'

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFCFB' },
    { media: '(prefers-color-scheme: dark)',  color: '#0E201B' },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL('https://mwalimu-ai-nu.vercel.app'),
  title: {
    default: 'Mwalimu AI — Learn Smarter. Teach Better.',
    template: '%s · Mwalimu AI',
  },
  description: 'AI-powered professional development for Kenyan CBC teachers.',
  verification: {
    google: 'CtkTzynmMk7TzRvZGE1k6r3a0d-j8GRhOSjvahFa7IE',
  },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: 'https://mwalimu-ai-nu.vercel.app',
    siteName: 'Mwalimu AI',
    title: 'Mwalimu AI — Learn Smarter. Teach Better.',
    description: 'AI-powered professional development for Kenyan CBC teachers.',
    images: [{ url: '/og-image.svg', width: 1200, height: 630, alt: 'Mwalimu AI for Kenyan CBC teachers' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mwalimu AI — Learn Smarter. Teach Better.',
    description: 'AI-powered professional development for Kenyan CBC teachers.',
    images: ['/og-image.svg'],
  },
  robots: { index: true, follow: true },
  applicationName: 'Mwalimu AI',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/mwalimu-mark.svg', type: 'image/svg+xml' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="bg-background">
      <style href="mwalimu-layout" precedence="default">{`
        body { font-family: var(--font-family-body); }
        h1, h2, h3, h4, h5, h6 { text-wrap: balance; }
        p, li, figcaption        { text-wrap: pretty; }

        @keyframes card-rise {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .stagger-1 { animation: card-rise 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both; }
        .stagger-2 { animation: card-rise 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.12s both; }
        .stagger-3 { animation: card-rise 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.20s both; }
        .stagger-4 { animation: card-rise 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.28s both; }
        @media (prefers-reduced-motion: reduce) {
          .stagger-1, .stagger-2, .stagger-3, .stagger-4 { animation: none; }
        }

        .pb-safe-nav { padding-bottom: calc(4.5rem + env(safe-area-inset-bottom, 0px)); }
        .sidebar-nav  { width: 16rem; }
        .layout-main  { transition: margin-left 250ms ease-out; }
        @media (min-width: 768px) {
          .sidebar-nav { transition: width 250ms ease-out; }
          [data-sidebar="expanded"]  .sidebar-nav { width: 14rem; }
          [data-sidebar="collapsed"] .sidebar-nav { width: 4rem;  }
          [data-sidebar="expanded"]  .layout-main { margin-left: 14rem; }
          [data-sidebar="collapsed"] .layout-main { margin-left: 4rem;  }
        }
      `}</style>
      <body className="antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded-xl focus:shadow-lg focus:border focus:border-border"
        >
          Skip to main content
        </a>
        <GradientBackground />
        <Providers>
          <div id="main-content" tabIndex={-1} className="outline-none">{children}</div>
          <AnalyticsConsent />
        </Providers>
        <CookieConsent />
        <SWRegister />
      </body>
    </html>
  )
}
