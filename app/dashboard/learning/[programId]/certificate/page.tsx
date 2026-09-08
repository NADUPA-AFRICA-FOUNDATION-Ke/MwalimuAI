'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getProgramById } from '@/lib/learning-paths-data'
import { getProgress, earnCertificate, isProgramComplete, type ProgramProgress } from '@/lib/learning-progress'
import { downloadCertificatePDF } from '@/lib/certificate-pdf'
import { makeQR } from '@/lib/qr'
import { useProfile } from '@/context/profile-context'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/back-button'
import { Award, Printer, Share2, CheckCircle2, Lock, ShieldCheck, RotateCw } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { getSiteUrl } from '@/lib/site-url'

export default function CertificatePage() {
  const params  = useParams<{ programId: string }>()
  const { profile, syncReady } = useProfile()
  const program = getProgramById(params.programId)

  const [progress, setProgress] = useState<ProgramProgress>({ completedLessons: [], reflections: {} })
  const [mounted, setMounted]   = useState(false)
  const [shared, setShared]         = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [flipped, setFlipped]       = useState(false)
  const certRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!program) return
    const p = getProgress(program.id)
    // Assign the earned date and a verifiable serial on first unlock, and
    // (re)register the public verification row so it always carries the
    // teacher name and program title — backfilling rows first created on the
    // assessment screen without them. earnCertificate is idempotent. Gated on
    // full eligibility (all lessons read, enough reflections, post-assessment
    // passed) — not merely having attempted the post-assessment.
    if (isProgramComplete(program, p)) {
      earnCertificate(program.id, profile?.name ?? 'Teacher', program.title)
    }
    setProgress(getProgress(program.id))
    setMounted(true)
  }, [program, syncReady, profile?.name])

  const isUnlocked = mounted && !!program && isProgramComplete(program, progress)
  const teacherName = profile?.name ?? 'Teacher'
  const serial      = progress.certificateSerial ?? ''
  const postScore   = progress.postAssessment ? `${progress.postAssessment.score}/${progress.postAssessment.total}` : null

  // Scan-to-verify QR (deep-links to /verify with the serial pre-filled).
  const qrDataUrl = useMemo(() => {
    if (!serial || typeof window === 'undefined') return ''
    try {
      const url = `${getSiteUrl()}/verify?serial=${encodeURIComponent(serial)}`
      return makeQR(url, 'M').createDataURL(6, 8)
    } catch { return '' }
  }, [serial])

  if (!program) return <div className="p-8 text-muted-foreground">Program not found.</div>

  const handlePrint = async () => {
    setIsPrinting(true)
    try {
      await downloadCertificatePDF({
        teacherName,
        programTitle:  program.title,
        subtitle:      program.certificate.subtitle,
        kicdAlignment: program.kicdAlignment,
        skills:        program.certificate.skills,
        hours:         program.hours,
        score:         postScore,
        serial,
        verifyUrl:     `${getSiteUrl()}/verify`,
      })
    } finally {
      setIsPrinting(false)
    }
  }

  const handleShare = async () => {
    const text = `I just completed the ${program.title} program on Mwalimu AI — a CBC professional development platform for Kenyan teachers! 🎓 #MwalimuAI #CBC #KenyanTeachers`
    if (navigator.share) {
      try { await navigator.share({ title: `${program.title} Certificate`, text }) } catch {}
    } else {
      await navigator.clipboard.writeText(text)
      setShared(true)
      setTimeout(() => setShared(false), 3000)
    }
  }

  if (mounted && !isUnlocked) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6"><BackButton fallbackHref={`/dashboard/learning/${program.id}`} label="Back to Program" /></div>
        <div className="glass rounded-2xl p-12 text-center">
          <Lock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Certificate Locked</h1>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
            Read every lesson, write at least 6 reflections, and score 85% or higher on the post-assessment to earn your certificate.
          </p>
          <Button asChild className="rounded-xl"><Link href={`/dashboard/learning/${program.id}`}>Back to Program</Link></Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Controls — hidden on print */}
      <div className="mb-6 print:hidden">
        <BackButton fallbackHref={`/dashboard/learning/${program.id}`} label="Back to Program" />
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold">Your Certificate</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setFlipped(f => !f)} className="rounded-xl gap-2" aria-pressed={flipped}>
              <RotateCw className="w-4 h-4" />
              {flipped ? 'Front' : 'Flip'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare} className="rounded-xl gap-2">
              <Share2 className="w-4 h-4" />
              {shared ? 'Copied!' : 'Share'}
            </Button>
            <Button size="sm" onClick={handlePrint} disabled={isPrinting} className="rounded-xl gap-2">
              {isPrinting ? 'Generating…' : <><Printer className="w-4 h-4" /> Save as PDF</>}
            </Button>
          </div>
        </div>
      </div>

      {/* Certificate — flips between the award (front) and verification (back) */}
      <div ref={certRef} className="certificate-container cert-flip" data-flipped={flipped}>
        <div className="cert-flip-inner">
        {/* ── FRONT ─────────────────────────────────────────────── */}
        <div className="cert-face relative bg-white dark:bg-gray-50 rounded-3xl overflow-hidden shadow-2xl shadow-primary/10 print:shadow-none print:rounded-none">
          {/* Outer border */}
          <div className="absolute inset-3 rounded-2xl border-2 border-primary/20 pointer-events-none" />
          <div className="absolute inset-4 rounded-xl border border-primary/10 pointer-events-none" />

          {/* Top decoration */}
          <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary" />

          <div className="px-10 py-10 text-center relative">
            {/* Background watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
              <BrandMark className="w-72 h-72" alt="" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <BrandMark className="w-12 h-12" />
              <div className="text-left">
                <p className="font-bold text-lg text-gray-900 leading-tight">Mwalimu AI</p>
                <p className="text-xs text-gray-500">Professional Development Platform</p>
              </div>
            </div>

            {/* Certificate title */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 bg-primary/8 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                <Award className="w-4 h-4" />
                Certificate of Completion
              </div>
              <p className="text-sm text-gray-500 mb-1">This is to certify that</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
                {teacherName}
              </h2>
              <p className="text-sm text-gray-500">
                has successfully completed the
              </p>
            </div>

            {/* Program name */}
            <div className="border-t border-b border-primary/20 py-5 mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{program.title}</h3>
              <p className="text-sm text-primary font-semibold">{program.certificate.subtitle}</p>
              <p className="text-xs text-gray-500 mt-1">{program.kicdAlignment}</p>
            </div>

            {/* Skills */}
            <div className="mb-6">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-3">Competencies Demonstrated</p>
              <div className="flex flex-wrap justify-center gap-2">
                {program.certificate.skills.map(skill => (
                  <span key={skill} className="flex items-center gap-1 text-xs bg-primary/6 text-primary px-3 py-1.5 rounded-full font-medium">
                    <CheckCircle2 className="w-3 h-3" /> {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Score */}
            {postScore && (
              <p className="text-xs text-gray-500 mb-4">Post-Assessment Score: <span className="font-bold text-primary">{postScore}</span></p>
            )}

            {/* Serial and signature */}
            <div className="flex items-end justify-between pt-4 border-t border-gray-100">
              <div className="text-left">
                <div className="text-xs text-gray-400 mb-1">Certificate No.</div>
                <div className="font-semibold text-sm text-gray-700 font-mono tracking-wide">{serial || '—'}</div>
              </div>
              <div className="text-center flex flex-col items-center">
                <div className="text-xl font-bold text-primary" style={{ fontFamily: 'cursive' }}>Mwalimu AI</div>
                <div className="w-24 h-px bg-gray-300 my-1" />
                <div className="text-xs text-gray-400">Authorised Signature</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400 mb-1">Duration</div>
                <div className="font-semibold text-sm text-gray-700">{program.hours} hours</div>
              </div>
            </div>
          </div>

          {/* Bottom decoration */}
          <div className="h-1.5 bg-gradient-to-r from-accent via-primary to-accent" />
        </div>

        {/* ── BACK — verification ───────────────────────────────── */}
        <div className="cert-face cert-face-back flex flex-col bg-white dark:bg-gray-50 rounded-3xl overflow-hidden shadow-2xl shadow-primary/10 print:shadow-none print:rounded-none">
          <div className="absolute inset-3 rounded-2xl border-2 border-primary/20 pointer-events-none z-10" />
          <div className="absolute inset-4 rounded-xl border border-primary/10 pointer-events-none z-10" />
          <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary" />

          <div className="flex-1 px-10 py-9 text-center relative flex flex-col">
            {/* watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
              <BrandMark className="w-72 h-72" alt="" />
            </div>

            {/* header */}
            <div className="flex items-center justify-center gap-3 mb-5">
              <BrandMark className="w-10 h-10" />
              <div className="text-left">
                <p className="font-bold text-base text-gray-900 leading-tight">Mwalimu AI</p>
                <p className="text-xs text-gray-500">Certificate Verification</p>
              </div>
            </div>

            <div className="inline-flex self-center items-center gap-2 bg-primary/8 text-primary px-4 py-1.5 rounded-full text-xs font-semibold mb-4">
              <ShieldCheck className="w-3.5 h-3.5" /> Authenticity &amp; Verification
            </div>

            <p className="text-xs text-gray-500 max-w-sm mx-auto mb-5 leading-relaxed">
              This certificate is registered in the Mwalimu AI credential registry and can be
              independently verified by anyone. Scan the code or enter the number online.
            </p>

            {/* QR */}
            <div className="mx-auto bg-white border border-primary/15 rounded-2xl p-3 shadow-sm">
              {qrDataUrl
                ? <Image src={qrDataUrl} alt="Scan to verify this certificate" width={160} height={160} unoptimized className="w-40 h-40" style={{ imageRendering: 'pixelated' }} />
                : <div className="w-40 h-40 bg-gray-50 rounded" />}
            </div>

            <p className="text-[11px] font-semibold tracking-[0.15em] text-gray-400 uppercase mt-5">Scan to verify this certificate</p>
            <p className="font-mono font-bold text-gray-800 tracking-wide mt-1">{serial || '—'}</p>
            <p className="text-xs text-primary font-medium mt-1">mwalimu.ai/verify</p>

            {/* issued-to summary */}
            <div className="mt-auto pt-4 border-t border-gray-100 flex items-end justify-between text-left">
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Issued to</div>
                <div className="font-semibold text-sm text-gray-700">{teacherName}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400 mb-0.5">Programme</div>
                <div className="font-semibold text-sm text-gray-700">{program.title}</div>
              </div>
            </div>
          </div>

          <div className="h-1.5 bg-gradient-to-r from-accent via-primary to-accent" />
        </div>
        </div>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground text-center mt-4 print:hidden">
        <ShieldCheck className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
        Anyone can verify this certificate at{' '}
        <Link href="/verify" className="text-primary font-medium hover:underline">mwalimu.ai/verify</Link>
        {' '}using certificate number <span className="font-mono font-medium">{serial || '—'}</span>
      </p>
    </div>
  )
}
