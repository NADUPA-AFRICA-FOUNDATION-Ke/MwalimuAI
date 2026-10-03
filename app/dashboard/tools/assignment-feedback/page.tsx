'use client'

import { useState, useRef, useEffect } from 'react'
import { authedFetch } from '@/lib/authed-fetch'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BackButton } from '@/components/back-button'
import { useProfile } from '@/context/profile-context'
import { recordToolUsed } from '@/lib/streak'
import {
  ClipboardCheck, Wand2, RefreshCw, Copy, Check, AlertCircle,
  Printer, ShieldAlert, ShieldCheck, ShieldQuestion, ChevronDown,
  ChevronUp, X, ScanSearch,
} from 'lucide-react'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { printPDF } from '@/lib/print-pdf'
import type { DetectionResult } from '@/app/api/detect-ai/route'
import { saveToolOutput, type ToolOutput } from '@/lib/tool-history'
import { ToolHistoryPanel } from '@/components/tool-history-panel'

const WORK_TYPES = [
  'Lesson Plan',
  'Reflective Journal Entry',
  'Unit Plan',
  'Assessment Design',
  'Differentiation Strategy',
  'Parent Communication',
  'Action Research Proposal',
]

function scoreColor(score: number) {
  if (score >= 65) return { bg: 'bg-red-50 dark:bg-red-950/20',   border: 'border-red-200 dark:border-red-800',   text: 'text-red-700 dark:text-red-400',   bar: 'bg-red-500' }
  if (score >= 35) return { bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400', bar: 'bg-amber-500' }
  return             { bg: 'bg-green-50 dark:bg-green-950/20',  border: 'border-green-200 dark:border-green-800',  text: 'text-green-700 dark:text-green-400',  bar: 'bg-green-500' }
}

function DetectionBanner({ result, onDismiss }: { result: DetectionResult; onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const c = scoreColor(result.score)
  const Icon = result.score >= 65 ? ShieldAlert : result.score >= 35 ? ShieldQuestion : ShieldCheck

  return (
    <div className={`rounded-xl border ${c.bg} ${c.border} mb-4 overflow-hidden`}>
      <div className="px-4 py-3 flex items-center gap-3">
        <Icon className={`w-4 h-4 shrink-0 ${c.text}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-sm ${c.text}`}>{result.verdict}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${c.border} ${c.text}`}>
              {result.score}% AI likelihood
            </span>
          </div>
          {/* Score bar */}
          <div className="mt-1.5 w-full bg-black/5 dark:bg-card/5 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${c.bar} transition-all duration-700`} style={{ width: `${result.score}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {result.flags.length > 0 && (
            <button onClick={() => setExpanded(v => !v)} className={`text-xs ${c.text} flex items-center gap-0.5 hover:opacity-70`}>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? 'Less' : 'Details'}
            </button>
          )}
          <button onClick={onDismiss} className="ml-2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className={`border-t ${c.border} px-4 py-3 space-y-2`}>
          <p className={`text-xs ${c.text}`}>{result.summary}</p>
          {result.flags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Signals detected</p>
              <ul className="space-y-1">
                {result.flags.map((flag, i) => (
                  <li key={i} className={`text-xs flex items-start gap-1.5 ${c.text}`}>
                    <span className="mt-0.5">·</span> {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground/60 pt-1">
            AI detection is an indicator only — not proof. Use professional judgement before any action.
          </p>
        </div>
      )}
    </div>
  )
}

export default function AssignmentFeedbackPage() {
  const { lang, user } = useProfile()
  const outputRef = useRef<HTMLDivElement>(null)

  const [workType, setWorkType] = useState('Lesson Plan')
  const [submission, setSubmission] = useState('')
  const [output, setOutput]         = useState('')
  const [isLoading, setIsLoading]   = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [copied, setCopied]         = useState(false)
  const [historyKey, setHistoryKey] = useState(0)

  // AI detection state
  const [detection, setDetection]           = useState<DetectionResult | null>(null)
  const [isDetecting, setIsDetecting]       = useState(false)
  const [detectionDismissed, setDetectionDismissed] = useState(false)

  const wordCount = submission.trim().split(/\s+/).filter(Boolean).length

  const generate = async () => {
    if (!submission.trim()) return
    setIsLoading(true)
    setOutput('')
    setError(null)
    setDetection(null)
    setDetectionDismissed(false)

    const prompt = `Work Type: ${workType}\n\nSubmission:\n${submission}`

    // Run feedback + detection in parallel
    const detectionPromise = (async () => {
      if (wordCount < 30) return
      setIsDetecting(true)
      try {
        const res = await authedFetch('/api/detect-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: submission }),
        })
        if (res.ok) {
          const result = await res.json() as DetectionResult
          setDetection(result)
        }
      } catch { /* detection failure is non-fatal */ }
      finally { setIsDetecting(false) }
    })()

    const feedbackPromise = (async () => {
      try {
        const res = await authedFetch('/api/tools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: 'assignment-feedback', prompt, lang }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error((data as { error?: string }).error ?? `Error ${res.status}`)
        }
        recordToolUsed('assignment-feedback', user?.id)
        const reader = res.body?.getReader()
        if (!reader) throw new Error('No stream')
        const decoder = new TextDecoder()
        let fullOutput = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          fullOutput += chunk
          setOutput(prev => prev + chunk)
        }

        if (fullOutput && user) {
          saveToolOutput(
            user.id,
            'assignment-feedback',
            `${workType} · ${wordCount} words`,
            { workType, submission },
            fullOutput,
          )
          setHistoryKey(k => k + 1)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Generation failed')
      } finally {
        setIsLoading(false)
      }
    })()

    await Promise.allSettled([feedbackPromise, detectionPromise])
  }

  const restoreEntry = (entry: ToolOutput) => {
    const i = entry.input as { workType?: string; submission?: string }
    setWorkType(i.workType ?? 'Lesson Plan')
    setSubmission(i.submission ?? '')
    setOutput(entry.output)
    setError(null)
    setDetection(null)
    setDetectionDismissed(false)
  }

  const copyOutput = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const printOutput = async () => {
    setIsPrinting(true)
    try { await printPDF({ title: `CBC Feedback: ${workType}`, meta: `${wordCount} words reviewed`, content: output, type: 'feedback' }) }
    finally { setIsPrinting(false) }
  }

  const showDetection = detection && !detectionDismissed

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <BackButton fallbackHref="/dashboard/tools" label="Back to Teacher Tools" />
        <div className="flex items-center gap-3 mt-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Assignment Feedback</h1>
            <p className="text-sm text-muted-foreground">AI reviews your work against CBC professional standards</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="glass rounded-2xl p-6 space-y-4 h-fit">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Your Work</h2>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Type of Work *</Label>
            <Select value={workType} onValueChange={setWorkType}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Paste Your {workType} *</Label>
              <span className="text-xs text-muted-foreground">{wordCount} words</span>
            </div>
            <Textarea
              placeholder={`Paste your ${workType.toLowerCase()} here for CBC-aligned feedback…`}
              value={submission}
              onChange={e => setSubmission(e.target.value)}
              className="rounded-xl resize-none min-h-[240px] text-sm"
              rows={12}
            />
          </div>

          <Button
            onClick={generate}
            disabled={wordCount < 30 || isLoading}
            className="w-full rounded-xl gap-2 font-semibold"
            size="lg"
          >
            {isLoading ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Reviewing…</>
            ) : (
              <><Wand2 className="w-4 h-4" /> Get CBC Feedback</>
            )}
          </Button>
          {wordCount > 0 && wordCount < 30 && (
            <p className="text-xs text-muted-foreground text-center">Add at least 30 words to get feedback</p>
          )}

          {/* Detection loading indicator (shows in form panel while detecting) */}
          {isDetecting && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ScanSearch className="w-3.5 h-3.5 animate-pulse" />
              <span>Running AI content check…</span>
            </div>
          )}
        </div>

        {/* Output */}
        <div ref={outputRef} className="glass rounded-2xl p-6 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">CBC Feedback</h2>
            {output && (
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" onClick={printOutput} disabled={isPrinting} className="rounded-xl gap-1.5 text-xs">
                  {isPrinting ? 'Generating…' : <><Printer className="w-3.5 h-3.5" /> Download PDF</>}
                </Button>
                <Button variant="ghost" size="sm" onClick={copyOutput} className="rounded-xl gap-1.5 text-xs">
                  {copied ? <><Check className="w-3.5 h-3.5 text-green-500" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </Button>
              </div>
            )}
          </div>

          {/* AI Detection banner */}
          {showDetection && (
            <DetectionBanner result={detection} onDismiss={() => setDetectionDismissed(true)} />
          )}

          {error && (
            <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/25 text-destructive px-4 py-3 rounded-xl text-sm mb-4">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
            </div>
          )}

          {!output && !isLoading && !error && !showDetection && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
              <ClipboardCheck className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">Paste your work and click<br /><span className="font-medium">Get CBC Feedback</span></p>
              <p className="text-xs mt-2 opacity-70">Includes CBC alignment score + AI content check</p>
            </div>
          )}

          {(output || isLoading) && (
            <div className="flex-1 overflow-y-auto">
              <MarkdownRenderer content={output} />
              {isLoading && (
                <span className="inline-block w-2 h-4 bg-primary/60 rounded-sm animate-pulse mt-1 align-middle" />
              )}
            </div>
          )}
        </div>
      </div>

      <ToolHistoryPanel toolId="assignment-feedback" refreshKey={historyKey} onRestore={restoreEntry} />
    </div>
  )
}
