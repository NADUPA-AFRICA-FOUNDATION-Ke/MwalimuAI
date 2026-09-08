'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

interface Props {
  content: string
  compact?: boolean
  article?: boolean
  className?: string
}

const makeComponents = (compact: boolean, article: boolean): Components => ({
  h1: ({ children }) => (
    <h1 className={`font-bold text-foreground ${article ? 'text-3xl mt-8 mb-4 first:mt-0' : compact ? 'text-base mt-3 mb-1.5 first:mt-0' : 'text-lg mt-6 mb-2.5 first:mt-0 pb-2 border-b border-border/40'}`}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className={`font-semibold text-foreground ${article ? 'text-2xl mt-8 mb-4 first:mt-0' : compact ? 'text-sm mt-2.5 mb-1 first:mt-0' : 'text-base mt-5 mb-2 first:mt-0'}`}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className={`font-semibold text-foreground ${article ? 'text-xl mt-6 mb-3 first:mt-0' : compact ? 'text-sm mt-2 mb-1 first:mt-0' : 'text-sm mt-4 mb-1.5 first:mt-0'}`}>
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className={`${article ? 'text-base md:text-lg text-muted-foreground leading-relaxed' : 'text-sm text-foreground'} ${compact ? 'mb-1.5 last:mb-0' : article ? 'mb-4 last:mb-0' : 'mb-3 last:mb-0'}`}>
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className={`${article ? 'text-base md:text-lg' : 'text-sm'} list-disc ${compact ? 'ml-4 mb-1.5 space-y-0.5 last:mb-0' : article ? 'ml-6 mb-5 space-y-2 last:mb-0' : 'ml-5 mb-3 space-y-1 last:mb-0'}`}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className={`${article ? 'text-base md:text-lg' : 'text-sm'} list-decimal ${compact ? 'ml-4 mb-1.5 space-y-0.5 last:mb-0' : article ? 'ml-6 mb-5 space-y-2 last:mb-0' : 'ml-5 mb-3 space-y-1 last:mb-0'}`}>
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className={`${article ? 'text-base md:text-lg text-muted-foreground' : 'text-sm text-foreground'} leading-relaxed`}>{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-muted-foreground">{children}</em>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.startsWith('language-')
    if (isBlock) return (
      <code className="block bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto my-2">{children}</code>
    )
    return (
      <code className="bg-muted text-primary px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
    )
  },
  pre: ({ children }) => (
    <pre className="bg-muted rounded-xl p-4 overflow-x-auto mb-3 text-xs font-mono leading-relaxed">{children}</pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary/40 pl-4 my-3 text-muted-foreground text-sm italic bg-muted/30 py-2 rounded-r-lg">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-border/40 my-4" />,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-primary underline underline-offset-2 hover:text-primary/80"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-3">
      <table className="text-xs w-full border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
  th: ({ children }) => (
    <th className="text-left font-semibold px-3 py-2 border border-border/40 text-foreground">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 border border-border/40 text-foreground">{children}</td>
  ),
})

export function MarkdownRenderer({ content, compact = false, article = false, className = '' }: Props) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={makeComponents(compact, article)}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
