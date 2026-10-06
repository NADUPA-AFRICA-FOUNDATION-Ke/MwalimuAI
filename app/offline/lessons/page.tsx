import type { Metadata } from 'next'
import { OfflineReader } from './reader'

export const metadata: Metadata = { title: 'My downloaded lessons', robots: { index: false } }

/** Works with no connection: it reads only what this device already saved. No sign-in needed to open it. */
export default function OfflineLessonsPage() {
  return <OfflineReader />
}
