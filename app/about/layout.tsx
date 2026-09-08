import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Mwalimu AI',
  description: 'Learn why Mwalimu AI supports Kenyan teachers with practical CBC professional development.',
}

export default function AboutLayout({ children }: { children: React.ReactNode }) { return children }
