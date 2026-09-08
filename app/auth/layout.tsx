import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Account access',
  description: 'Sign in or create a Mwalimu AI account and continue your CBC teacher journey.',
  robots: { index: false, follow: false },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) { return children }
