'use client'

import { useState, useRef, useEffect } from 'react'
import { authedFetch } from '@/lib/authed-fetch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BackButton } from '@/components/back-button'
import { BookOpen, Wand2, Copy, Check, AlertCircle, RefreshCw, Printer } from 'lucide-react'
import { recordToolUsed } from '@/lib/streak'
import { useProfile } from '@/context/profile-context'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { printPDF } from '@/lib/print-pdf'
import { saveToolOutput, type ToolOutput } from '@/lib/tool-history'
import { ToolHistoryPanel } from '@/components/tool-history-panel'

const SUBJECTS = [
  'English', 'Kiswahili', 'Mathematics', 'Science & Technology',
  'Social Studies', 'Creative Arts & Crafts', 'Physical & Health Education',
  'Religious Education', 'Pre-Technical Studies', 'Agriculture & Nutrition',
]

const GRADES = ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9']
const DURATIONS = ['30 minutes', '40 minutes', '60 minutes', '80 minutes']

function buildPrompt(f: {
  subject: string; grade: string; strand: string; subStrand: string
  topic: string; duration: string; level: string
}) {
  return `Generate a CBC lesson plan for the following:

Learning Area: ${f.subject}
Grade: ${f.grade}
Strand: ${f.strand}
Sub-strand: ${f.subStrand}
Lesson Focus / Topic: ${f.topic}
Duration: ${f.duration}
Class Ability Level: ${f.level}

Please generate a complete, practical CBC lesson plan for a Kenyan classroom.`
}

export default function LessonPlanPage() {
  const { lang, user } = useProfile()
  const [form, setForm] = useState({
    subject: '', grade: '', strand: '', subStrand: '', topic: '', duration: '40 minutes', level: 'Mixed ability',
  })
  const [output, setOutput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [historyKey, setHistoryKey] = useState(0)
  const outputRef = useRef<HTMLDivElement>(null)

  const printOutput = async () => {
    setIsPrinting(true)
    try {
      await printPDF({
        title:    `Lesson Plan: ${form.subject} · ${form.grade}`,
        subtitle: form.strand ? `${form.strand} — ${form.subStrand}` : undefined,
        meta:     `${form.duration} · ${form.level}`,
        content:  output,
        type:     'lesson-plan',
      })
    } finally {
      setIsPrinting(false)
    }
  }

  useEffect(() => {
    if (isLoading && outputRef.current) {
      outputRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [output, isLoading])

  const isValid = form.subject && form.grade && form.strand && form.subStrand && form.topic

  const generate = async () => {
    if (!isValid) return
    recordToolUsed('lesson-plan', user?.id)
    setIsLoading(true)
    setOutput('')
    setError(null)

    try {
      const res = await authedFetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'lesson-plan', prompt: buildPrompt(form), lang }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Server error ${res.status}`)
      }

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
          'lesson-plan',
          `${form.subject || 'Lesson'} · ${form.grade || ''} · ${form.topic || ''}`.trim(),
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
      subject:   i.subject   ?? '',
      grade:     i.grade     ?? '',
      strand:    i.strand    ?? '',
      subStrand: i.subStrand ?? '',
      topic:     i.topic     ?? '',
      duration:  i.duration  ?? '40 minutes',
      level:     i.level     ?? 'Mixed ability',
    })
    setOutput(entry.output)
    setError(null)
  }

  const set = (key: keyof typeof form) => (value: string) => setForm(f => ({ ...f, [key]: value }))

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <BackButton fallbackHref="/dashboard/tools" label="Back to Teacher Tools" />
        <div className="flex items-center gap-3 mt-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Lesson Plan Generator</h1>
            <p className="text-sm text-muted-foreground">Full CBC lesson plan from subject + topic in seconds</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="glass rounded-2xl p-6 space-y-4 h-fit">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Lesson Details</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="subject" className="text-sm font-medium">Learning Area *</Label>
              <Select value={form.subject} onValueChange={set('subject')}>
                <SelectTrigger id="subject" className="rounded-xl">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

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
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="strand" className="text-sm font-medium">Strand *</Label>
            <Input
              id="strand"
              placeholder="e.g. Reading, Numbers, Living Things"
              value={form.strand}
              onChange={e => set('strand')(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subStrand" className="text-sm font-medium">Sub-strand *</Label>
            <Input
              id="subStrand"
              placeholder="e.g. Reading Comprehension, Fractions, Ecosystems"
              value={form.subStrand}
              onChange={e => set('subStrand')(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="topic" className="text-sm font-medium">Lesson Focus / Topic *</Label>
            <Input
              id="topic"
              placeholder="e.g. Identifying main idea in a paragraph"
              value={form.topic}
              onChange={e => set('topic')(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="duration" className="text-sm font-medium">Duration</Label>
              <Select value={form.duration} onValueChange={set('duration')}>
                <SelectTrigger id="duration" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="level" className="text-sm font-medium">Class Level</Label>
              <Select value={form.level} onValueChange={set('level')}>
                <SelectTrigger id="level" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mixed ability">Mixed ability</SelectItem>
                  <SelectItem value="Below average">Below average</SelectItem>
                  <SelectItem value="Average">Average</SelectItem>
                  <SelectItem value="Above average">Above average</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={generate}
            disabled={!isValid || isLoading}
            className="w-full rounded-xl gap-2 font-semibold"
            size="lg"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating lesson plan…
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate Lesson Plan
              </>
            )}
          </Button>
        </div>

        {/* Output */}
        <div ref={outputRef} className="glass rounded-2xl p-6 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Generated Lesson Plan</h2>
            {output && (
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" onClick={printOutput} disabled={isPrinting} className="rounded-xl gap-1.5 text-xs">
                  {isPrinting
                    ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Generating…</>
                    : <><Printer className="w-3.5 h-3.5" aria-hidden="true" /> Download PDF</>}
                </Button>
                <Button variant="ghost" size="sm" onClick={copyOutput} className="rounded-xl gap-1.5 text-xs">
                  {copied ? <><Check className="w-3.5 h-3.5 text-green-500" aria-hidden="true" /> Copied!</> : <><Copy className="w-3.5 h-3.5" aria-hidden="true" /> Copy</>}
                </Button>
              </div>
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
              <BookOpen className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">Fill in the lesson details and click<br /><span className="font-medium">Generate Lesson Plan</span></p>
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

      <ToolHistoryPanel toolId="lesson-plan" refreshKey={historyKey} onRestore={restoreEntry} />
    </div>
  )
}
