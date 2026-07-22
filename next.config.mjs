// Static CSP (no nonce): 'unsafe-inline' in script-src lets Next's inline
// bootstrap scripts run on statically prerendered pages, so marketing pages
// stay cacheable on the CDN. A nonce would force every route to render
// dynamically per-request — measured 0.7–2.7s TTFB from iad1 vs ~50ms from
// the CDN edge. The app has no raw-HTML injection path (React escaping;
// react-markdown without rehype-raw), so the practical XSS exposure of
// 'unsafe-inline' here is minimal. Dev additionally needs 'unsafe-eval'
// for React dev tooling and Turbopack HMR.
const isDev = process.env.NODE_ENV === 'development'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://*.supabase.co'
const supabaseWs = supabaseUrl.replace(/^https:/, 'wss:')
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://images.unsplash.com`,
  `font-src 'self'`,
  `connect-src 'self' ${supabaseUrl} ${supabaseWs}`,
  `worker-src 'self'`,
  `manifest-src 'self'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
  images: {
    unoptimized: true,
  },
  // jsPDF and html2canvas are browser-only and use dynamic requires that
  // Turbopack cannot statically resolve. Mark them as server-external so
  // they are only bundled by the client-side bundler at runtime.
  serverExternalPackages: ['jspdf', 'html2canvas'],

  // Tree-shake large icon / UI packages so only the symbols actually imported
  // are included in each page bundle — biggest win for lucide-react (1000+ icons).
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'date-fns',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-label',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-toggle',
      '@radix-ui/react-tooltip',
    ],
  },
}

export default nextConfig
