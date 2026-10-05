'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { FaqSection } from '@/lib/faq-data'

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const answerId = `faq-answer-${question.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={answerId}
        className="w-full min-h-11 py-4 flex items-center justify-between text-left"
      >
        <span className="font-medium pr-4">{question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
        )}
      </button>
      <div id={answerId} aria-hidden={!isOpen} className={`pb-4 text-muted-foreground ${isOpen ? '' : 'hidden'}`}>
          {answer}
      </div>
    </div>
  )
}

export function FaqList({ sections }: { sections: FaqSection[] }) {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <Card key={section.category} className="p-6">
          <h2 className="text-xl font-semibold mb-4">{section.category}</h2>
          <div>
            {section.questions.map((faq) => (
              <FAQItem key={faq.q} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
