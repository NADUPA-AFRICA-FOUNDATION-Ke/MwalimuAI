'use client'

import { useState, useRef, useEffect } from 'react'
import { authedFetch } from '@/lib/authed-fetch'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BackButton } from '@/components/back-button'
import { useProfile } from '@/context/profile-context'
import { recordToolUsed } from '@/lib/streak'
import {
  FlaskConical, ChevronRight, ChevronLeft, RefreshCw, Copy,
  Check, AlertCircle, Printer, CheckCircle2, Wand2,
} from 'lucide-react'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { printPDF } from '@/lib/print-pdf'
import { saveToolOutput, type ToolOutput } from '@/lib/tool-history'
import { ToolHistoryPanel } from '@/components/tool-history-panel'

const STEPS = [
  { id: 1, title: 'Identify the Problem', label: 'Problem', placeholder: 'Describe the challenge you are seeing in your classroom. Be specific — which learners, which subject, what exactly is happening?' },
  { id: 2, title: 'Research Question', label: 'Question', placeholder: 'Write one clear research question. Start with "How can I..." or "What happens when..." — something you can actually test.' },
  { id: 3, title: 'Plan Your Intervention', label: 'Plan', placeholder: 'What strategy or change will you try? Describe what you will do differently for the next 2–4 weeks.' },
  { id: 4, title: 'Collect Evidence', label: 'Evidence', placeholder: 'How did your data collection go? What did you observe, record, or collect? Paste notes, observations, or learner work descriptions.' },
  { id: 5, title: 'Reflect & Share', label: 'Reflection', placeholder: 'What happened? Did the intervention work? What surprised you? What would you do differently?' },
]

interface StepData {
  input: string
  output: string
}

export default function ActionResearchPage() {
  const { lang, user } = useProfile()

  const [currentStep, setCurrentStep] = useState(1)
  const [stepData, setStepData]       = useState<Record<number, StepData>>(
    Object.fromEntries(STEPS.map(s => [s.id, { input: '', output: '' }]))
  )
  const [isLoading, setIsLoading]     = useState(false)
  const [isPrinting, setIsPrinting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [copied, setCopied]           = useState<number | null>(null)
  const [historyKey, setHistoryKey]   = useState(0)
  const outputRef = useRef<HTMLDivElement>(null)

  const step  = STEPS.find(s => s.id === currentStep)!
  const data  = stepData[currentStep]

  const setInput = (v: string) => setStepData(prev => ({ ...prev, [currentStep]: { ...prev[currentStep], input: v } }))

  const buildPrompt = () => {
    // Truncate each prior step to 150 chars to keep cumulative context lean
    const context = STEPS.slice(0, currentStep - 1)
      .map(s => {
        const snippet = stepData[s.id].input.slice(0, 150)
        return `${s.title}: ${snippet}${stepData[s.id].input.length > 150 ? '…' : ''}`
      })
      .filter(s => s.trim())
      .join('\n')

    return `${context ? `Context from previous steps:\n${context}\n\n` : ''}Current step — ${step.title}:\n${data.input}`
  }

  const generate = async () => {
    if (!data.input.trim()) return
    recordToolUsed('action-research', user?.id)
    setIsLoading(true)
    setError(null)
    setStepData(prev => ({ ...prev, [currentStep]: { ...prev[currentStep], output: '' } }))

    try {
      const res = await authedFetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'action-research', prompt: buildPrompt(), lang }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? `Error ${res.status}`)
      }
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream')
      const decoder = new TextDecoder()
      let fullOutput = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullOutput += chunk
        setStepData(prev => ({ ...prev, [currentStep]: { ...prev[currentStep], output: prev[currentStep].output + chunk } }))
      }

      if (fullOutput && user) {
        const snapshot = { ...stepData, [currentStep]: { input: data.input, output: fullOutput } }
        saveToolOutput(
          user.id,
          'action-research',
          `Step ${currentStep}: ${step.title}`,
          { stepData: snapshot, currentStep },
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

  const restoreEntry = (entry: ToolOutput) => {
    const i = entry.input as { stepData?: Record<number, StepData>; currentStep?: number }
    if (i.stepData) {
      const restored: Record<number, StepData> = Object.fromEntries(STEPS.map(s => [s.id, { input: '', output: '' }]))
      for (const s of STEPS) {
        const v = i.stepData[s.id]
        if (v) restored[s.id] = { input: v.input ?? '', output: v.output ?? '' }
      }
      setStepData(restored)
    }
    if (typeof i.currentStep === 'number') setCurrentStep(i.currentStep)
    setError(null)
  }

  const copyStep = (stepId: number) => {
    const text = `${STEPS.find(s => s.id === stepId)!.title}\n\n${stepData[stepId].output}`
    navigator.clipboard.writeText(text)
    setCopied(stepId)
    setTimeout(() => setCopied(null), 2000)
  }

  const printAll = async () => {
    const completedSteps = STEPS.filter(s => stepData[s.id].output)
    if (completedSteps.length === 0) return
    const combined = completedSteps.map(s =>
      `## ${s.id}. ${s.title}\n\n**Your notes:** ${stepData[s.id].input}\n\n${stepData[s.id].output}`
    ).join('\n\n---\n\n')
    setIsPrinting(true)
    try {
      await printPDF({ title: 'Classroom Action Research Cycle', meta: `${completedSteps.length} of ${STEPS.length} steps completed`, content: combined, type: 'research' })
    } finally { setIsPrinting(false) }
  }

  const completedCount = STEPS.filter(s => stepData[s.id].output).length

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <BackButton fallbackHref="/dashboard/tools" label="Back to Teacher Tools" />
        <div className="flex items-center justify-between mt-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Action Research Guide</h1>
              <p className="text-sm text-muted-foreground">Walk through a full classroom action research cycle with AI guidance</p>
            </div>
          </div>
          {completedCount > 0 && (
            <Button variant="outline" size="sm" onClick={printAll} disabled={isPrinting} className="rounded-xl gap-1.5 text-xs shrink-0">
              {isPrinting ? 'Generating…' : <><Printer className="w-3.5 h-3.5" /> Download PDF</>}
            </Button>
          )}
        </div>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const done   = !!stepData[s.id].output
          const active = s.id === currentStep
          return (
            <div key={s.id} className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setCurrentStep(s.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : done
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {done && <CheckCircle2 className="w-3.5 h-3.5" />}
                {!done && <span>{s.id}</span>}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <div className="glass rounded-2xl p-6 space-y-4 h-fit">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{step.id}</span>
            <h2 className="font-semibold">{step.title}</h2>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Your Notes *</Label>
            <Textarea
              placeholder={step.placeholder}
              value={data.input}
              onChange={e => setInput(e.target.value)}
              className="rounded-xl resize-none min-h-[180px] text-sm"
              rows={8}
            />
          </div>

          <Button
            onClick={generate}
            disabled={data.input.trim().length < 20 || isLoading}
            className="w-full rounded-xl gap-2 font-semibold"
          >
            {isLoading ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Getting guidance…</>
            ) : (
              <><Wand2 className="w-4 h-4" /> Get AI Guidance</>
            )}
          </Button>

          {/* Step navigation */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
              disabled={currentStep === 1}
              className="flex-1 rounded-xl gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(s => Math.min(STEPS.length, s + 1))}
              disabled={currentStep === STEPS.length}
              className="flex-1 rounded-xl gap-1.5"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Output panel */}
        <div ref={outputRef} className="glass rounded-2xl p-6 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">AI Guidance — Step {step.id}</h2>
            {data.output && (
              <Button variant="ghost" size="sm" onClick={() => copyStep(currentStep)} className="rounded-xl gap-1.5 text-xs">
                {copied === currentStep ? <><Check className="w-3.5 h-3.5 text-green-500" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
              </Button>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/25 text-destructive px-4 py-3 rounded-xl text-sm mb-4">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
            </div>
          )}

          {!data.output && !isLoading && !error && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
              <FlaskConical className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">Add your notes for this step<br />and click <span className="font-medium">Get AI Guidance</span></p>
            </div>
          )}

          {(data.output || isLoading) && (
            <div className="flex-1 overflow-y-auto">
              <MarkdownRenderer content={data.output} />
              {isLoading && (
                <span className="inline-block w-2 h-4 bg-primary/60 rounded-sm animate-pulse mt-1 align-middle" />
              )}
            </div>
          )}

          {/* Completed steps summary */}
          {completedCount > 1 && (
            <div className="mt-4 pt-4 border-t border-border/40">
              <p className="text-xs text-muted-foreground font-semibold uppercase mb-2">Completed Steps</p>
              <div className="flex flex-wrap gap-1.5">
                {STEPS.filter(s => stepData[s.id].output).map(s => (
                  <button
                    key={s.id}
                    onClick={() => setCurrentStep(s.id)}
                    className="text-xs bg-primary/8 text-primary px-2.5 py-1 rounded-lg font-medium hover:bg-primary/15 transition-colors"
                  >
                    {s.id}. {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ToolHistoryPanel toolId="action-research" refreshKey={historyKey} onRestore={restoreEntry} />
    </div>
  )
}
