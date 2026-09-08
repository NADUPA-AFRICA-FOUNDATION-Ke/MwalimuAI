import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support Center',
  description: 'Get help with Mwalimu AI accounts, progress, learning modules, and AI Coach.',
}

export default function SupportLayout({ children }: { children: React.ReactNode }) { return children }
