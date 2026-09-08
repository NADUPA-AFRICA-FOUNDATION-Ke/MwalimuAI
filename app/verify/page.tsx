'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShieldCheck, ShieldX, Loader2, Search } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'

interface VerifiedCert {
  serial:        string
  programTitle:  string
  teacherName:   string
  earnedAt:      string
}

type Status = 'idle' | 'checking' | 'valid' | 'invalid'

export default function VerifyPage() {
  const [serial, setSerial] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [cert, setCert]     = useState<VerifiedCert | null>(null)
  const normalizedSerial = serial.trim().toUpperCase()
  const convexCert = useQuery(api.certificates.verify, normalizedSerial ? { serial: normalizedSerial } : 'skip')

  const check = (override?: string) => {
    const cleaned = (override ?? serial).trim().toUpperCase()
    if (!cleaned) return
    setSerial(cleaned)
    setStatus('checking')
    setCert(null)
  }

  useEffect(() => {
    if (status !== 'checking' || !normalizedSerial || convexCert === undefined) return
    if (convexCert) {
        setCert({
          serial: convexCert.serial,
          programTitle: convexCert.programTitle,
          teacherName: convexCert.teacherName,
          earnedAt: new Date(convexCert.earnedAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }),
        })
      setStatus(convexCert.valid ? 'valid' : 'invalid')
    } else {
      setStatus('invalid')
    }
  }, [convexCert, normalizedSerial, status])

  // Auto-verify when arriving from a certificate QR (…/verify?serial=MW-…).
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('serial')
    if (param) check(param)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40">
        <div className="max-w-2xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-semibold">
            <BrandMark className="w-8 h-8" />
            Mwalimu AI
          </Link>
          <span className="text-xs text-muted-foreground">Certificate Verification</span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-5 py-12">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Verify a Certificate</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Enter the certificate number printed on a Mwalimu AI certificate to confirm it is genuine.
          </p>
        </div>

        {/* Lookup form */}
        <div className="glass rounded-2xl p-6 mb-6">
          <Label htmlFor="serial" className="text-sm font-medium">Certificate number</Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="serial"
              placeholder="MW-XXXXX-XXXXX"
              value={serial}
              onChange={e => setSerial(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') check() }}
              className="rounded-xl font-mono uppercase tracking-wide"
              autoComplete="off"
              spellCheck={false}
            />
            <Button onClick={() => check()} disabled={!serial.trim() || status === 'checking'} className="rounded-xl gap-2 shrink-0">
              {status === 'checking'
                ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                : <Search className="w-4 h-4" aria-hidden="true" />}
              Verify
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            The number is on the bottom-left of the certificate, e.g. MW-7F3K9-Q2D8M.
          </p>
        </div>

        {/* Result */}
        {status === 'valid' && cert && (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 p-6" role="status">
            <div className="flex items-center gap-2.5 mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <p className="font-bold text-emerald-700 dark:text-emerald-300">Valid certificate</p>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground mb-0.5">Awarded to</dt>
                <dd className="font-semibold">{cert.teacherName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground mb-0.5">Program</dt>
                <dd className="font-semibold">{cert.programTitle}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground mb-0.5">Date earned</dt>
                <dd className="font-semibold">{cert.earnedAt}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground mb-0.5">Certificate number</dt>
                <dd className="font-semibold font-mono tracking-wide">{cert.serial}</dd>
              </div>
            </dl>
          </div>
        )}

        {status === 'invalid' && (
          <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-6" role="alert" aria-live="assertive">
            <div className="flex items-center gap-2.5 mb-2">
              <ShieldX className="w-5 h-5 text-red-600 dark:text-red-400" aria-hidden="true" />
              <p className="font-bold text-red-700 dark:text-red-300">No certificate found</p>
            </div>
            <p className="text-sm text-muted-foreground">
              The number <span className="font-mono">{serial.trim().toUpperCase()}</span> does not match any certificate
              in our records. Check for typing mistakes, the letters O, I and L are never used.
            </p>
          </div>
        )}
      </main>

      <footer className="border-t border-border/40 py-5 text-center text-xs text-muted-foreground">
        Mwalimu AI · KICD-aligned professional development for Kenyan teachers
      </footer>
    </div>
  )
}
