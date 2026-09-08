'use client'

import { useState } from 'react'
import { Wand2, Copy, Check } from 'lucide-react'

/**
 * Copyable prompt / code block used inside lesson readings (rendered for
 * fenced ``` blocks by renderReading).
 */
export function PromptBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="rounded-xl border border-border/60 overflow-hidden bg-muted/30 my-2">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <Wand2 className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Prompt template</span>
        </div>
        <button
          type="button"
          onClick={copy}
          className={`min-h-11 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors shrink-0 ${
            copied
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-border'
          }`}
          aria-label={copied ? 'Copied' : 'Copy prompt'}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="m-0 px-4 py-4 text-xs leading-relaxed text-foreground/80 font-mono whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
        {code}
      </pre>
    </div>
  )
}
