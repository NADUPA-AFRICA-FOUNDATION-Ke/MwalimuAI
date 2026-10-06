'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getProgress, saveAssignment } from '@/lib/learning-progress'
import { PEER_SUBMISSIONS } from '@/lib/learning-progress'
import { useProfile } from '@/context/profile-context'
import { usePrograms } from '@/context/content-context'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { AssessmentGuard, GuardedTextarea } from '@/components/assessment-guard'
import { BackButton } from '@/components/back-button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText, Wand2, RefreshCw, Copy, Check, AlertCircle,
  CheckCircle2, MessageSquare, Users, Lightbulb,
} from 'lucide-react'

export default function AssignmentPage() {
  const params  = useParams<{ programId: string }>()
  const { lang, profile, syncReady, user } = useProfile()
  const { getProgramById } = usePrograms()
  const program = getProgramById(params.programId)
  const assignment = program?.assignment

  const [submission, setSubmission]         = useState('')
  const [feedback, setFeedback]             = useState('')
  const [isReviewing, setIsReviewing]       = useState(false)
  const [reviewError, setReviewError]       = useState<string | null>(null)
  const [submitted, setSubmitted]           = useState(false)
  const [copied, setCopied]                 = useState(false)
  const [peerFeedbacks, setPeerFeedbacks]   = useState<Record<string, string>>({})
  const [mounted, setMounted]               = useState(false)

  useEffect(() => {
    if (!program) return
    const p = getProgress(program.id)
    if (p.assignment) {
      setSubmission(p.assignment.text)
      setFeedback(p.assignment.feedback)
      setSubmitted(true)
    }
    setMounted(true)
  }, [program, syncReady])

  if (!program || !assignment) return <div className="p-8 text-muted-foreground">Assignment not found.</div>

  const wordCount = submission.trim().split(/\s+/).filter(Boolean).length

  const requestFeedback = async () => {
    if (!submission.trim()) return
    setIsReviewing(true)
    setFeedback('')
    setReviewError(null)

    try {
      const res = await fetch('/api/assignment-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment: assignment.task,
          submission,
          rubric: assignment.rubric,
          lang,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Server error ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response stream')
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        full += chunk
        setFeedback(prev => prev + chunk)
      }

      saveAssignment(program.id, submission, full)
      setSubmitted(true)
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : 'Review failed')
    } finally {
      setIsReviewing(false)
    }
  }

  const copyFeedback = () => {
    navigator.clipboard.writeText(feedback)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <BackButton fallbackHref={`/dashboard/learning/${program.id}`} label="Back to Program" />
        <div className="flex items-center gap-3 mt-4">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{assignment.title}</h1>
            <p className="text-sm text-muted-foreground">{program.shortTitle} · Practical Assignment</p>
          </div>
          {submitted && (
            <span className="ml-auto text-xs text-primary font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Submitted
            </span>
          )}
        </div>
      </div>

      <Tabs defaultValue="write">
        <TabsList className="rounded-xl mb-5">
          <TabsTrigger value="write" className="rounded-lg gap-1.5">
            <FileText className="w-3.5 h-3.5" /> My Assignment
          </TabsTrigger>
          <TabsTrigger value="peer" className="rounded-lg gap-1.5">
            <Users className="w-3.5 h-3.5" /> Peer Review
          </TabsTrigger>
        </TabsList>

        {/* My assignment tab */}
        <TabsContent value="write">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Brief + submission */}
            <div className="space-y-4">
              <div className="glass rounded-2xl p-5">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Assignment Brief</h2>
                <p className="text-sm text-muted-foreground italic mb-3 leading-relaxed">{assignment.context}</p>
                <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 mb-3">
                  <p className="text-sm font-semibold mb-2">Your Task:</p>
                  <p className="text-sm leading-relaxed">{assignment.task}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Hints</p>
                  {assignment.hints.map((h, i) => (
                    <div key={i} className="flex gap-2 mb-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed">{h}</p>
                    </div>
                  ))}
                </div>
              </div>

              <AssessmentGuard watermark={`${profile?.name || 'Learner'} · ${(user?.id ?? '').slice(-6)}`} title="Your assignment is written here, under assessment rules">
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Your Submission</h2>
                  <span className="text-xs text-muted-foreground">{wordCount} words</span>
                </div>
                <GuardedTextarea
                  placeholder="Write your assignment here. Aim for 300–500 words, specific to your classroom context..."
                  value={submission}
                  onValueChange={setSubmission}
                  aria-label="Your assignment"
                  className="rounded-xl resize-none min-h-[200px] text-sm"
                  rows={10}
                />
                <Button
                  onClick={requestFeedback}
                  disabled={isReviewing || wordCount < 50}
                  className="w-full mt-3 rounded-xl gap-2 font-semibold"
                >
                  {isReviewing ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Getting AI Feedback…</>
                  ) : (
                    <><Wand2 className="w-4 h-4" /> {submitted ? 'Re-submit for New Feedback' : 'Submit & Get AI Feedback'}</>
                  )}
                </Button>
                {wordCount < 50 && wordCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-1.5 text-center">Write at least 50 words to submit</p>
                )}
              </div>
              </AssessmentGuard>
            </div>

            {/* AI feedback */}
            <div className="glass rounded-2xl p-5 flex flex-col min-h-[400px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4.5 h-4.5 text-primary" />
                  <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">AI Feedback</h2>
                </div>
                {feedback && (
                  <Button variant="ghost" size="sm" onClick={copyFeedback} className="rounded-xl gap-1.5 text-xs">
                    {copied ? <><Check className="w-3.5 h-3.5 text-green-700" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </Button>
                )}
              </div>

              {reviewError && (
                <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/25 text-destructive px-4 py-3 rounded-xl text-sm mb-4">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{reviewError}</span>
                </div>
              )}

              {!feedback && !isReviewing && !reviewError && (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
                  <MessageSquare className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm">Submit your assignment to receive<br /><span className="font-medium">personalised AI feedback</span></p>
                  <p className="text-xs mt-2 opacity-70">Based on the assignment rubric</p>
                </div>
              )}

              {(feedback || isReviewing) && (
                <div className="flex-1 overflow-y-auto">
                  <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {feedback}
                    {isReviewing && <span className="inline-block w-2 h-4 bg-primary/60 rounded-sm animate-pulse ml-0.5 align-middle" />}
                  </pre>
                </div>
              )}

              {feedback && !isReviewing && (
                <div className="mt-4 pt-4 border-t border-border/40">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Rubric</p>
                  {assignment.rubric.map((r, i) => (
                    <div key={i} className="flex gap-2 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">{r}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Peer review tab */}
        <TabsContent value="peer">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4.5 h-4.5 text-accent" />
              <h2 className="font-semibold">Peer Submissions</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Review submissions from fellow teachers in your cohort. Leave constructive feedback to earn a Peer Reviewer badge.
            </p>

            <div className="space-y-5">
              {PEER_SUBMISSIONS.map(sub => (
                <div key={sub.id} className="border border-border/50 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                        {sub.author.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{sub.author}</p>
                        <p className="text-xs text-muted-foreground">{sub.submittedAt}</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-3">{sub.preview}</p>
                  <Textarea
                    placeholder="Write your feedback for this teacher's assignment... (be specific and constructive)"
                    value={peerFeedbacks[sub.id] ?? ''}
                    onChange={e => setPeerFeedbacks(prev => ({ ...prev, [sub.id]: e.target.value }))}
                    className="rounded-xl resize-none text-sm"
                    rows={3}
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs gap-1.5"
                      disabled={!(peerFeedbacks[sub.id]?.trim())}
                      onClick={() => {
                        setPeerFeedbacks(prev => ({ ...prev, [`${sub.id}_sent`]: 'sent' }))
                      }}
                    >
                      {peerFeedbacks[`${sub.id}_sent`] ? <><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Sent</> : 'Send Feedback'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-muted/30 rounded-xl text-center">
              <p className="text-xs text-muted-foreground">
                Peer review is in preview. Full cohort peer review requires a school account with real-time features.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
