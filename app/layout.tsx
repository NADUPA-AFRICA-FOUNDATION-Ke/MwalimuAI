import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { headers } from 'next/headers'
import { Providers } from '@/components/providers'
import { GradientBackground } from '@/components/gradient-background'
import { SWRegister } from '@/components/sw-register'
import './globals.css'

const geist     = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)',  color: '#0f0f14' },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL('https://mwalimu-ai-nu.vercel.app'),
  title: {
    default: 'Mwalimu AI — Learn Smarter. Teach Better.',
    template: '%s · Mwalimu AI',
  },
  description: 'AI-powered professional development for Kenyan CBC teachers.',
  applicationName: 'Mwalimu AI',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Reading headers() forces this (and every route under it) to render
  // dynamically per-request, which is required for Next to apply a
  // per-request CSP nonce to its own inline scripts.
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <html lang="en" suppressHydrationWarning className={`bg-background ${geist.variable} ${geistMono.variable}`}>
      <style href="mwalimu-layout" precedence="default">{`
        body { font-family: var(--font-geist-sans, 'Geist', system-ui, sans-serif); }
        h1, h2, h3, h4, h5, h6 { text-wrap: balance; }
        p, li, figcaption        { text-wrap: pretty; }

        @keyframes card-rise {
          from { opacity: 0; transform: translateY(10px); filter: blur(2px); }
          to   { opacity: 1; transform: translateY(0);    filter: blur(0);   }
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
        .layout-main  { transition: margin-left 300ms ease-in-out; }
        @media (min-width: 768px) {
          .sidebar-nav { transition: width 300ms ease-in-out; }
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
        <Providers nonce={nonce}>
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </Providers>
        <SWRegister />
      </body>
    </html>
  )
}
