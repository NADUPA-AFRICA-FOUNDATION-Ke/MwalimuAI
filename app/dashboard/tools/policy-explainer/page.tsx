'use client'

import { useState, useRef, useEffect } from 'react'
import { authedFetch } from '@/lib/authed-fetch'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { BackButton } from '@/components/back-button'
import { useProfile } from '@/context/profile-context'
import { recordToolUsed } from '@/lib/streak'
import { FileText, Wand2, RefreshCw, Copy, Check, AlertCircle, Printer } from 'lucide-react'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { printPDF } from '@/lib/print-pdf'
import { saveToolOutput, type ToolOutput } from '@/lib/tool-history'
import { ToolHistoryPanel } from '@/components/tool-history-panel'

const EXAMPLES = [
  'TSC Teacher Performance Appraisal circular',
  'KICD CBC implementation guidelines',
  'MoE competency-based grading framework',
  'New school term dates circular',
]

export default function PolicyExplainerPage() {
  const { lang, user } = useProfile()

  const [policyText, setPolicyText] = useState('')
  const [output, setOutput]         = useState('')
  const [isLoading, setIsLoading]   = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [copied, setCopied]         = useState(false)
  const [historyKey, setHistoryKey] = useState(0)
  const outputRef = useRef<HTMLDivElement>(null)

  const wordCount = policyText.trim().split(/\s+/).filter(Boolean).length

  const generate = async () => {
    if (!policyText.trim()) return
    setIsLoading(true)
    setOutput('')
    setError(null)

    try {
      const res = await authedFetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'policy-explainer', prompt: policyText, lang }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `Error ${res.status}`)
      }
      recordToolUsed('policy-explainer', user?.id)
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
        const firstLine = policyText.split('\n').find(l => l.trim())?.slice(0, 80) ?? 'Policy'
        saveToolOutput(user.id, 'policy-explainer', firstLine, { policyText }, fullOutput)
        setHistoryKey(k => k + 1)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setIsLoading(false)
    }
  }

  const restoreEntry = (entry: ToolOutput) => {
    const i = entry.input as { policyText?: string }
    setPolicyText(i.policyText ?? '')
    setOutput(entry.output)
    setError(null)
  }

  const copyOutput = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const printOutput = async () => {
    setIsPrinting(true)
    try { await printPDF({ title: 'Policy Explained', meta: `${wordCount} words analysed`, content: output, type: 'policy' }) }
    finally { setIsPrinting(false) }
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <BackButton fallbackHref="/dashboard/tools" label="Back to Teacher Tools" />
        <div className="flex items-center gap-3 mt-4">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Policy Explainer</h1>
            <p className="text-sm text-muted-foreground">Paste any MoE/KICD/TSC circular — get a plain-language breakdown in seconds</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="glass rounded-2xl p-6 space-y-4 h-fit">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Policy or Circular</h2>

          <div className="bg-muted/30 rounded-xl p-3">
            <p className="text-xs text-muted-foreground font-medium mb-2">Works with:</p>
            <div className="space-y-1">
              {EXAMPLES.map(e => (
                <p key={e} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="text-primary">·</span> {e}
                </p>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Policy Text *</Label>
              <span className="text-xs text-muted-foreground">{wordCount} words</span>
            </div>
            <Textarea
              placeholder="Paste the full text of the policy circular, memo, or guideline here…"
              value={policyText}
              onChange={e => setPolicyText(e.target.value)}
              className="rounded-xl resize-none min-h-[240px] text-sm"
              rows={12}
            />
          </div>

          <Button
            onClick={generate}
            disabled={wordCount < 20 || isLoading}
            className="w-full rounded-xl gap-2 font-semibold"
            size="lg"
          >
            {isLoading ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Explaining…</>
            ) : (
              <><Wand2 className="w-4 h-4" /> Explain in Plain Language</>
            )}
          </Button>
        </div>

        {/* Output */}
        <div ref={outputRef} className="glass rounded-2xl p-6 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Plain Language Explanation</h2>
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

          {error && (
            <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/25 text-destructive px-4 py-3 rounded-xl text-sm mb-4">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
            </div>
          )}

          {!output && !isLoading && !error && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
              <FileText className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">Paste a policy document and click<br /><span className="font-medium">Explain in Plain Language</span></p>
              <p className="text-xs mt-2 opacity-70">Includes key points, action steps, and jargon explained</p>
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

      <ToolHistoryPanel toolId="policy-explainer" refreshKey={historyKey} onRestore={restoreEntry} />
    </div>
  )
}
