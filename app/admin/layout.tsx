import type { Metadata } from 'next'
import { AdminApp } from '@/components/admin/auth-gate'

export const metadata: Metadata = {
  title: 'Staff console',
  robots: { index: false, follow: false, nocache: true },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminApp>{children}</AdminApp>
}
