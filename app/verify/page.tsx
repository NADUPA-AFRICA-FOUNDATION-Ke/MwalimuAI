import type { Metadata } from 'next'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { VerifyClient } from './verify-client'

type Props = { searchParams: Promise<{ serial?: string }> }

/** A shared certificate link previews as "<name> earned <programme>" in WhatsApp, LinkedIn and search. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const serial = (await searchParams).serial?.trim().toUpperCase()
  const fallback: Metadata = { title: 'Verify a certificate', description: 'Check that a Mwalimu AI certificate is genuine.' }
  if (!serial || !/^MW-[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(serial)) return fallback
  try {
    const cert = await fetchQuery(api.certificates.verify, { serial })
    if (!cert || !cert.valid) return fallback
    const title = `${cert.teacherName} earned a certificate in ${cert.programTitle}`
    const description = `Verified Mwalimu AI certificate ${cert.serial}. Professional development for Kenyan CBC teachers.`
    return { title, description, openGraph: { title, description, type: 'website', siteName: 'Mwalimu AI' }, twitter: { card: 'summary', title, description } }
  } catch {
    return fallback
  }
}

export default function VerifyPage() {
  return <VerifyClient />
}
