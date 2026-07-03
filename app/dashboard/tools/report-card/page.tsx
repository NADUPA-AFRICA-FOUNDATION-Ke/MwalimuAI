'use client'

import { useState, useRef, useEffect } from 'react'
import { authedFetch } from '@/lib/authed-fetch'
import { useProfile } from '@/context/profile-context'
import { recordToolUsed } from '@/lib/streak'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BackButton } from '@/components/back-button'
import { MessageSquare, Wand2, Copy, Check, AlertCircle, RefreshCw } from 'lucide-react'
import { saveToolOutput, type ToolOutput } from '@/lib/tool-history'
import { ToolHistoryPanel } from '@/components/tool-history-panel'

const SUBJECTS = [
  'English', 'Kiswahili', 'Mathematics', 'Science & Technology',
  'Social Studies', 'Creative Arts & Crafts', 'Physical & Health Education',
  'Religious Education', 'Pre-Technical Studies', 'Agriculture & Nutrition',
]

const GRADES = ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9']

const PERFORMANCE_LEVELS = [
  { value: 'EE', label: 'Exceeds Expectations' },
  { value: 'ME', label: 'Meets Expectations' },
  { value: 'AE', label: 'Approaching Expectations' },
  { value: 'BE', label: 'Below Expectations' },
]

function buildPrompt(f: {
  grade: string; subject: string; performance: string; gender: string
  strengths: string; improvements: string; effort: string
}) {
  return `Write a report card comment for this learner:

Grade: ${f.grade}
Subject: ${f.subject}
Performance Level: ${f.performance}
Gender/Pronoun: ${f.gender}
Strengths observed: ${f.strengths}
Areas for growth: ${f.improvements || 'Not specified'}
Effort level: ${f.effort}

Remember: 60–80 words, CBC-aligned, parent-friendly, positive and encouraging.`
}

export default function ReportCardPage() {
  const { lang, user } = useProfile()
  const [form, setForm] = useState({
    grade: '', subject: '', performance: '', gender: 'They/Their',
    strengths: '', improvements: '', effort: 'Consistent',
  })
  const [output, setOutput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [historyKey, setHistoryKey] = useState(0)
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (output && outputRef.current) {
      outputRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [output])

  const isValid = form.grade && form.subject && form.performance && form.strengths.trim()

  const generate = async () => {
    if (!isValid) return
    setIsLoading(true)
    setOutput('')
    setError(null)

    try {
      const res = await authedFetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'report-card', prompt: buildPrompt(form), lang }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Server error ${res.status}`)
      }

      recordToolUsed('report-card', user?.id)
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response stream')
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
          'report-card',
          `${form.subject || 'Subject'} · ${form.grade || ''} · ${form.performance || ''}`.trim(),
          form,
          fullOutput,
        )
        setHistoryKey(k => k + 1)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setIsLoading(false)
    }
  }

  const copyOutput = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const restoreEntry = (entry: ToolOutput) => {
    const i = entry.input as Partial<typeof form>
    setForm({
      grade:        i.grade        ?? '',
      subject:      i.subject      ?? '',
      performance:  i.performance  ?? '',
      gender:       i.gender       ?? 'They/Their',
      strengths:    i.strengths    ?? '',
      improvements: i.improvements ?? '',
      effort:       i.effort       ?? 'Consistent',
    })
    setOutput(entry.output)
    setError(null)
  }

  const set = (key: keyof typeof form) => (value: string) => setForm(f => ({ ...f, [key]: value }))

  const wordCount = output.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <BackButton fallbackHref="/dashboard/tools" label="Back to Teacher Tools" />
        <div className="flex items-center gap-3 mt-4">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Report Card Comments</h1>
            <p className="text-sm text-muted-foreground">Professional CBC-aligned comments in plain language</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="glass rounded-2xl p-6 space-y-4 h-fit">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Learner Information</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="grade" className="text-sm font-medium">Grade *</Label>
              <Select value={form.grade} onValueChange={set('grade')}>
                <SelectTrigger id="grade" className="rounded-xl">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="subject" className="text-sm font-medium">Subject *</Label>
              <Select value={form.subject} onValueChange={set('subject')}>
                <SelectTrigger id="subject" className="rounded-xl">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="performance" className="text-sm font-medium">Performance Level *</Label>
              <Select value={form.performance} onValueChange={set('performance')}>
                <SelectTrigger id="performance" className="rounded-xl">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {PERFORMANCE_LEVELS.map(p => (
                    <SelectItem key={p.value} value={p.label}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gender" className="text-sm font-medium">Pronoun</Label>
              <Select value={form.gender} onValueChange={set('gender')}>
                <SelectTrigger id="gender" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="He/His">He / His</SelectItem>
                  <SelectItem value="She/Her">She / Her</SelectItem>
                  <SelectItem value="They/Their">They / Their</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="strengths" className="text-sm font-medium">Observed Strengths *</Label>
            <Textarea
              id="strengths"
              placeholder="e.g. Active participation in group activities, strong comprehension of fractions, creative problem-solving..."
              value={form.strengths}
              onChange={e => set('strengths')(e.target.value)}
              className="rounded-xl resize-none"
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="improvements" className="text-sm font-medium">Areas for Growth <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              id="improvements"
              placeholder="e.g. Needs to work on reading fluency, struggling with carrying in addition..."
              value={form.improvements}
              onChange={e => set('improvements')(e.target.value)}
              className="rounded-xl resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="effort" className="text-sm font-medium">Effort Level</Label>
            <Select value={form.effort} onValueChange={set('effort')}>
              <SelectTrigger id="effort" className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Exceptional">Exceptional</SelectItem>
                <SelectItem value="Consistent">Consistent</SelectItem>
                <SelectItem value="Improving">Improving</SelectItem>
                <SelectItem value="Needs encouragement">Needs encouragement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={generate}
            disabled={!isValid || isLoading}
            className="w-full rounded-xl gap-2 font-semibold"
            size="lg"
          >
            {isLoading ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Writing comment…</>
            ) : (
              <><Wand2 className="w-4 h-4" /> Generate Comment</>
            )}
          </Button>
        </div>

        {/* Output */}
        <div ref={outputRef} className="glass rounded-2xl p-6 flex flex-col min-h-[360px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Report Card Comment</h2>
              {output && (
                <p className="text-xs text-muted-foreground mt-0.5">{wordCount} words</p>
              )}
            </div>
            {output && (
              <Button variant="ghost" size="sm" onClick={copyOutput} className="rounded-xl gap-1.5 text-xs">
                {copied ? <><Check className="w-3.5 h-3.5 text-green-500" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
              </Button>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/25 text-destructive px-4 py-3 rounded-xl text-sm mb-4">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!output && !isLoading && !error && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
              <MessageSquare className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">Fill in the learner details and click<br /><span className="font-medium">Generate Comment</span></p>
              <p className="text-xs mt-2 opacity-70">Tip: the more specific your strengths, the better the comment</p>
            </div>
          )}

          {(output || isLoading) && (
            <div className="flex-1">
              <div className="bg-muted/40 rounded-xl p-5 border border-border/40">
                <p className="text-sm leading-relaxed text-foreground">
                  {output}
                  {isLoading && <span className="inline-block w-2 h-4 bg-primary/60 rounded-sm animate-pulse ml-0.5 align-middle" />}
                </p>
              </div>
              {output && !isLoading && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generate}
                  className="mt-3 text-xs text-muted-foreground hover:text-foreground rounded-xl gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <ToolHistoryPanel toolId="report-card" refreshKey={historyKey} onRestore={restoreEntry} />
    </div>
  )
}
