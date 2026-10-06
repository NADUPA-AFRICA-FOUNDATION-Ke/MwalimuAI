'use client'

import { useState } from 'react'
import { Check, Copy, Linkedin, MessageCircle, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

/** Where the certificate can be checked by anyone, and the places a learner will want to share it. */
export function CertificateShare({ programTitle, serial, earnedAt, verifyUrl }: { programTitle: string; serial: string; earnedAt?: string; verifyUrl: string }) {
  const [copied, setCopied] = useState(false)
  const text = `I earned a certificate in ${programTitle} on Mwalimu AI. You can verify it here: ${verifyUrl}`
  const when = earnedAt ? new Date(earnedAt) : new Date()
  const linkedIn =
    'https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME' +
    `&name=${encodeURIComponent(programTitle)}&organizationName=${encodeURIComponent('Mwalimu AI')}` +
    `&issueYear=${when.getFullYear()}&issueMonth=${when.getMonth() + 1}&certUrl=${encodeURIComponent(verifyUrl)}&certId=${encodeURIComponent(serial)}`
  const copy = async () => {
    try { await navigator.clipboard.writeText(verifyUrl); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch { /* clipboard blocked */ }
  }
  const native = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl gap-2 min-h-11"><Share2 className="w-4 h-4" aria-hidden="true" />Share</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {native && <DropdownMenuItem className="min-h-11" onSelect={() => { void navigator.share({ title: `${programTitle} certificate`, text, url: verifyUrl }).catch(() => {}) }}><Share2 className="w-4 h-4 mr-2" />Share…</DropdownMenuItem>}
        <DropdownMenuItem className="min-h-11" asChild><a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="w-4 h-4 mr-2" />WhatsApp</a></DropdownMenuItem>
        <DropdownMenuItem className="min-h-11" asChild><a href={linkedIn} target="_blank" rel="noopener noreferrer"><Linkedin className="w-4 h-4 mr-2" />Add to LinkedIn profile</a></DropdownMenuItem>
        <DropdownMenuItem className="min-h-11" onSelect={(e) => { e.preventDefault(); void copy() }}>{copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}{copied ? 'Link copied' : 'Copy verification link'}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
