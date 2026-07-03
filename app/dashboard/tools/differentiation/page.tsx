'use client'

import { useState, useRef, useEffect } from 'react'
import { authedFetch } from '@/lib/authed-fetch'
import { useProfile } from '@/context/profile-context'
import { recordToolUsed } from '@/lib/streak'
import { saveToolOutput, type ToolOutput } from '@/lib/tool-history'
import { ToolHistoryPanel } from '@/components/tool-history-panel'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BackButton } from '@/components/back-button'
import { Users, Wand2, Copy, Check, AlertCircle, RefreshCw, Circle } from 'lucide-react'
import { MarkdownRenderer } from '@/components/markdown-renderer'

const GRADES = ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9']

const SUBJECTS = [
  'English', 'Kiswahili', 'Mathematics', 'Science & Technology',
  'Social Studies', 'Creative Arts & Crafts', 'Physical & Health Education',
  'Religious Education', 'Pre-Technical Studies', 'Agriculture & Nutrition',
  'General (across subjects)',
]

const BARRIERS = [
  { id: 'reading', label: 'Reading difficulty / dyslexia' },
  { id: 'attention', label: 'Attention & focus challenges (ADHD)' },
  { id: 'language', label: 'Language barrier (English/Kiswahili not first language)' },
  { id: 'hearing', label: 'Hearing impairment' },
  { id: 'vision', label: 'Visual impairment' },
  { id: 'physical', label: 'Physical / mobility challenge' },
  { id: 'social', label: 'Social-emotional / behavioural needs' },
  { id: 'gifted', label: 'Gifted / advanced learner' },
  { id: 'slow', label: 'Slow processing / intellectual disability' },
]

function buildPrompt(f: {
  grade: string; subject: string; challenge: string; barriers: string[]
}) {
  return `Suggest inclusive differentiation strategies for the following learner:

Grade: ${f.grade}
Subject / Learning Area: ${f.subject}
Description of challenge: ${f.challenge}
${f.barriers.length > 0 ? `Identified learning barriers: ${f.barriers.join(', ')}` : ''}

Please provide 4–5 specific, practical strategies suited to a Kenyan CBC classroom.`
}

export default function DifferentiationPage() {
  const { lang, user } = useProfile()
  const [form, setForm] = useState({
    grade: '', subject: '', challenge: '', barriers: [] as string[],
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

  const isValid = form.grade && form.subject && form.challenge.trim().length > 10

  const restoreEntry = (entry: ToolOutput) => {
    const i = entry.input as Partial<typeof form>
    setForm({
      grade:     i.grade     ?? '',
      subject:   i.subject   ?? '',
      challenge: i.challenge ?? '',
      barriers:  (i.barriers as string[]) ?? [],
    })
    setOutput(entry.output)
    setError(null)
  }

  const toggleBarrier = (id: string) => {
    setForm(f => ({
      ...f,
      barriers: f.barriers.includes(id)
        ? f.barriers.filter(b => b !== id)
        : [...f.barriers, id],
    }))
  }

  const generate = async () => {
    if (!isValid) return
    setIsLoading(true)
    setOutput('')
    setError(null)

    const selectedLabels = BARRIERS.filter(b => form.barriers.includes(b.id)).map(b => b.label)

    try {
      const res = await authedFetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'differentiation',
          prompt: buildPrompt({ ...form, barriers: selectedLabels }),
          lang,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Server error ${res.status}`)
      }

      recordToolUsed('differentiation', user?.id)
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
          'differentiation',
          `${form.subject || 'Subject'} · ${form.grade || ''} · ${form.challenge.slice(0, 40)}`.trim(),
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

  const set = (key: keyof typeof form) => (value: string) => setForm(f => ({ ...f, [key]: value }))

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <BackButton fallbackHref="/dashboard/tools" label="Back to Teacher Tools" />
        <div className="flex items-center gap-3 mt-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Differentiation Advisor</h1>
            <p className="text-sm text-muted-foreground">Inclusive strategies for every learner</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="glass rounded-2xl p-6 space-y-4 h-fit">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Learner Context</h2>

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

          <div className="space-y-1.5">
            <Label htmlFor="challenge" className="text-sm font-medium">Describe the Learner's Challenge *</Label>
            <Textarea
              id="challenge"
              placeholder="e.g. This learner struggles to follow written instructions, often seems confused during reading activities, and takes much longer than peers to complete written tasks. They are very engaged during oral discussions..."
              value={form.challenge}
              onChange={e => set('challenge')(e.target.value)}
              className="rounded-xl resize-none"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Be as specific as possible for more targeted strategies.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Learning Barriers <span className="text-muted-foreground font-normal">(select all that apply)</span></Label>
            <div className="grid grid-cols-1 gap-1.5">
              {BARRIERS.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggleBarrier(b.id)}
                  className={`text-left px-3.5 py-2.5 rounded-xl border text-sm transition-all duration-150 ${
                    form.barriers.includes(b.id)
                      ? 'border-primary/50 bg-primary/8 text-foreground font-medium'
                      : 'border-border/50 bg-transparent text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <span className={`mr-2 inline-flex items-center ${form.barriers.includes(b.id) ? 'text-primary' : 'text-muted-foreground/30'}`}>
                    {form.barriers.includes(b.id)
                      ? <Check className="w-3.5 h-3.5" />
                      : <Circle className="w-3.5 h-3.5" />}
                  </span>
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={generate}
            disabled={!isValid || isLoading}
            className="w-full rounded-xl gap-2 font-semibold"
            size="lg"
          >
            {isLoading ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Finding strategies…</>
            ) : (
              <><Wand2 className="w-4 h-4" /> Get Differentiation Strategies</>
            )}
          </Button>
        </div>

        {/* Output */}
        <div ref={outputRef} className="glass rounded-2xl p-6 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Strategies</h2>
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
              <Users className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">Describe the learner and click<br /><span className="font-medium">Get Differentiation Strategies</span></p>
              <p className="text-xs mt-2 opacity-70">Strategies are tailored to Kenyan CBC classrooms</p>
            </div>
          )}

          {(output || isLoading) && (
            <div className="flex-1 overflow-y-auto">
              <MarkdownRenderer content={output} />
              {isLoading && (
                <span className="inline-block w-2 h-4 bg-primary/60 rounded-sm animate-pulse mt-1 align-middle" />
              )}
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
      <ToolHistoryPanel toolId="differentiation" refreshKey={historyKey} onRestore={restoreEntry} />
    </div>
  )
}
