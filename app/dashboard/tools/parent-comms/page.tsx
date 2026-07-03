'use client'

import { useState, useRef, useEffect } from 'react'
import { authedFetch } from '@/lib/authed-fetch'
import { useProfile } from '@/context/profile-context'
import { recordToolUsed } from '@/lib/streak'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BackButton } from '@/components/back-button'
import { Mail, Wand2, Copy, Check, AlertCircle, RefreshCw, FileText, Users } from 'lucide-react'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { saveToolOutput, type ToolOutput } from '@/lib/tool-history'
import { ToolHistoryPanel } from '@/components/tool-history-panel'

const GRADES = ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9']

const TOPICS = [
  'Academic performance', 'Attendance concerns', 'Behaviour in class',
  'Social difficulties', 'Outstanding achievement', 'Health-related concern',
  'Learning support / extra help', 'End-of-term summary', 'Upcoming school event',
  'Fees / administrative matter', 'Other',
]

function buildPrompt(f: {
  type: string; grade: string; studentName: string; topic: string
  keyPoints: string; tone: string; teacherName: string
}) {
  return `Draft a ${f.type === 'letter' ? 'parent letter' : 'parent meeting notes document'} for the following:

Communication type: ${f.type === 'letter' ? 'Formal Letter to Parent/Guardian' : 'Parent-Teacher Meeting Notes'}
Grade: ${f.grade}
${f.studentName ? `Learner name: ${f.studentName}` : 'Learner name: [use general reference]'}
Topic / subject of communication: ${f.topic}
Key points to communicate:
${f.keyPoints}
Tone: ${f.tone}
${f.teacherName ? `Teacher's name: ${f.teacherName}` : ''}

Please write the complete document ready for use.`
}

export default function ParentCommsPage() {
  const { lang, user } = useProfile()
  const [form, setForm] = useState({
    type: 'letter', grade: '', studentName: '', topic: '',
    keyPoints: '', tone: 'Warm & Supportive', teacherName: '',
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

  const isValid = form.grade && form.topic && form.keyPoints.trim().length > 10

  const generate = async () => {
    if (!isValid) return
    setIsLoading(true)
    setOutput('')
    setError(null)

    try {
      const res = await authedFetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'parent-comms', prompt: buildPrompt(form), lang }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Server error ${res.status}`)
      }

      recordToolUsed('parent-comms', user?.id)
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
        const typeLabel = form.type === 'letter' ? 'Letter' : 'Meeting Notes'
        saveToolOutput(
          user.id,
          'parent-comms',
          `${typeLabel} · ${form.topic || ''}${form.studentName ? ' · ' + form.studentName : ''}`.trim(),
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
      type:        i.type        ?? 'letter',
      grade:       i.grade       ?? '',
      studentName: i.studentName ?? '',
      topic:       i.topic       ?? '',
      keyPoints:   i.keyPoints   ?? '',
      tone:        i.tone        ?? 'Warm & Supportive',
      teacherName: i.teacherName ?? '',
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
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
            <Mail className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Parent Communication Helper</h1>
            <p className="text-sm text-muted-foreground">Draft letters and meeting notes in plain language</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="glass rounded-2xl p-6 space-y-4 h-fit">
          {/* Type toggle */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Communication Type *</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'letter', label: 'Letter', icon: FileText },
                { value: 'meeting', label: 'Meeting Notes', icon: Users },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('type')(value)}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-150 ${
                    form.type === value
                      ? 'border-primary/50 bg-primary/8 text-foreground'
                      : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${form.type === value ? 'text-primary' : ''}`} />
                  {label}
                </button>
              ))}
            </div>
          </div>

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
              <Label htmlFor="studentName" className="text-sm font-medium">Learner Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="studentName"
                placeholder="e.g. Brian, Amina"
                value={form.studentName}
                onChange={e => set('studentName')(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="topic" className="text-sm font-medium">Topic *</Label>
            <Select value={form.topic} onValueChange={set('topic')}>
              <SelectTrigger id="topic" className="rounded-xl">
                <SelectValue placeholder="Select topic" />
              </SelectTrigger>
              <SelectContent>
                {TOPICS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="keyPoints" className="text-sm font-medium">Key Points to Communicate *</Label>
            <Textarea
              id="keyPoints"
              placeholder={form.type === 'letter'
                ? 'e.g. Brian has been frequently absent on Mondays. His classwork is affected. We want to understand the reason and support him. Asking parents to come in for a meeting next week...'
                : 'e.g. Discussed Amina\'s improvement in maths. Parent mentioned she studies from 7–9pm. Agreed to give extra worksheets. Teacher will check in next month. Parent happy with progress...'
              }
              value={form.keyPoints}
              onChange={e => set('keyPoints')(e.target.value)}
              className="rounded-xl resize-none"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tone" className="text-sm font-medium">Tone</Label>
              <Select value={form.tone} onValueChange={set('tone')}>
                <SelectTrigger id="tone" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Warm & Supportive">Warm & Supportive</SelectItem>
                  <SelectItem value="Professional & Formal">Professional & Formal</SelectItem>
                  <SelectItem value="Urgent & Direct">Urgent & Direct</SelectItem>
                  <SelectItem value="Celebratory">Celebratory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="teacherName" className="text-sm font-medium">Your Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="teacherName"
                placeholder="e.g. Mr. Kamau"
                value={form.teacherName}
                onChange={e => set('teacherName')(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <Button
            onClick={generate}
            disabled={!isValid || isLoading}
            className="w-full rounded-xl gap-2 font-semibold"
            size="lg"
          >
            {isLoading ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Drafting…</>
            ) : (
              <><Wand2 className="w-4 h-4" /> Generate {form.type === 'letter' ? 'Letter' : 'Meeting Notes'}</>
            )}
          </Button>
        </div>

        {/* Output */}
        <div ref={outputRef} className="glass rounded-2xl p-6 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              {form.type === 'letter' ? 'Parent Letter' : 'Meeting Notes'}
            </h2>
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
              <Mail className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">Fill in the details and click<br /><span className="font-medium">Generate {form.type === 'letter' ? 'Letter' : 'Meeting Notes'}</span></p>
              <p className="text-xs mt-2 opacity-70">Always review before sending to parents</p>
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

      <ToolHistoryPanel toolId="parent-comms" refreshKey={historyKey} onRestore={restoreEntry} />
    </div>
  )
}
