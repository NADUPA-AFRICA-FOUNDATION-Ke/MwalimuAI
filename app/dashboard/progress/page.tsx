'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { BackButton } from '@/components/back-button'
import { useProfile } from '@/context/profile-context'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { getT, getCategories } from '@/lib/i18n'
import {
  TrendingUp, Plus, Trash2, CheckCircle2, Circle,
  ChevronDown, ChevronUp, X, Loader2,
} from 'lucide-react'

type Category = 'assessment' | 'pedagogy' | 'digital' | 'community' | 'wellbeing' | 'other'

interface Milestone {
  id: string; text: string; completed: boolean; completedAt?: string
}

interface Goal {
  id: string; title: string; category: Category
  milestones: Milestone[]; createdAt: string
}

const CATEGORY_COLORS: Record<Category, string> = {
  assessment: 'bg-primary/10 text-primary border-primary/20',
  pedagogy:   'bg-accent/10 text-accent border-accent/20',
  digital:    'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  community:  'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400',
  wellbeing:  'bg-pink-500/10 text-pink-600 border-pink-500/20 dark:text-pink-400',
  other:      'bg-muted text-muted-foreground border-border',
}

function uid() { return Math.random().toString(36).slice(2, 9) }

function dbToGoal(row: any): Goal {
  return {
    id:         row._id,
    title:      row.title    ?? '',
    category:   row.category ?? 'other',
    milestones: row.milestones ?? [],
    createdAt: new Date(row.createdAt ?? row._creationTime).toLocaleDateString(),
  }
}

export default function ProgressPage() {
  const { lang, user } = useProfile()
  const t    = getT(lang)
  const cats = getCategories(lang)
  const remoteGoals = useQuery(api.goals.listMine, user ? {} : 'skip')
  const createGoal = useMutation(api.goals.create)
  const updateGoal = useMutation(api.goals.update)
  const removeGoal = useMutation(api.goals.remove)

  const [goals, setGoals]       = useState<Goal[]>([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle]         = useState('')
  const [newCategory, setNewCategory]   = useState<Category>('assessment')
  const [newMilestones, setNewMilestones] = useState([''])

  useEffect(() => {
    if (remoteGoals !== undefined) { setGoals(remoteGoals.map(dbToGoal)); setLoading(false) }
  }, [remoteGoals])

  const persistMilestones = async (goalId: string, milestones: Milestone[]) => {
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, milestones } : g))
    await updateGoal({ goalId: goalId as Id<'goals'>, milestones })
  }

  const toggleMilestone = (goalId: string, msId: string) => {
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return
    const updated = goal.milestones.map(m => m.id !== msId ? m : {
      ...m, completed: !m.completed,
      completedAt: !m.completed ? new Date().toLocaleDateString() : undefined,
    })
    persistMilestones(goalId, updated)
  }

  const deleteGoal = async (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id))
    await removeGoal({ goalId: id as Id<'goals'> })
  }

  const toggleExpand = (id: string) => {
    const next = new Set(expanded)
    next.has(id) ? next.delete(id) : next.add(id)
    setExpanded(next)
  }

  const saveGoal = async () => {
    if (!newTitle.trim() || !user) return
    const milestones = newMilestones
      .map(s => s.trim()).filter(Boolean)
      .map(text => ({ id: uid(), text, completed: false }))

    const inserted = await createGoal({ title: newTitle.trim(), category: newCategory, milestones, clientId: `goal-${Date.now()}` })
    const goal = dbToGoal({ _id: inserted, title: newTitle.trim(), category: newCategory, milestones, createdAt: Date.now() })
    setGoals(prev => [...prev, goal]); setExpanded(prev => new Set([...prev, goal.id]))

    setShowForm(false)
    setNewTitle('')
    setNewCategory('assessment')
    setNewMilestones([''])
  }

  const totalMilestones     = goals.reduce((s, g) => s + g.milestones.length, 0)
  const completedMilestones = goals.reduce((s, g) => s + g.milestones.filter(m => m.completed).length, 0)
  const overallPct = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <BackButton fallbackHref="/dashboard" label="Back to Dashboard" />
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{t('progress.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('progress.sub')}</p>
            </div>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="rounded-xl gap-2 font-semibold" size="sm">
              <Plus className="w-4 h-4" /> {t('progress.addGoal')}
            </Button>
          )}
        </div>
      </div>

      {/* Overall progress */}
      {goals.length > 0 && (
        <div className="glass rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Overall Progress</span>
            <span className="text-sm font-bold text-primary tabular-nums">{overallPct}%</span>
          </div>
          <Progress value={overallPct} className="h-2 mb-1.5" />
          <p className="text-xs text-muted-foreground">
            {completedMilestones} / {totalMilestones} milestones {t('progress.complete')}
          </p>
        </div>
      )}

      {/* Add goal form */}
      {showForm && (
        <div className="glass rounded-2xl p-6 mb-5 border border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{t('progress.addGoal')}</h2>
            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('progress.goalTitle')} *</Label>
              <Input placeholder={t('progress.goalTitlePlaceholder')} value={newTitle}
                onChange={e => setNewTitle(e.target.value)} className="rounded-xl" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('progress.category')}</Label>
              <Select value={newCategory} onValueChange={v => setNewCategory(v as Category)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(cats) as [Category, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('progress.milestone')}</Label>
              {newMilestones.map((ms, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder={t('progress.milestonePlaceholder')} value={ms}
                    onChange={e => { const next = [...newMilestones]; next[i] = e.target.value; setNewMilestones(next) }}
                    className="rounded-xl flex-1" />
                  {newMilestones.length > 1 && (
                    <button onClick={() => setNewMilestones(newMilestones.filter((_, j) => j !== i))}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setNewMilestones([...newMilestones, ''])}
                className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1.5 transition-colors">
                <Plus className="w-3.5 h-3.5" /> {t('progress.addMilestone')}
              </button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1 rounded-xl">
                {t('progress.cancel')}
              </Button>
              <Button onClick={saveGoal} disabled={!newTitle.trim()} className="flex-1 rounded-xl font-semibold">
                {t('progress.save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Goals list */}
      {goals.length === 0 && !showForm ? (
        <div className="glass rounded-2xl p-12 text-center">
          <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold mb-1">{t('progress.noGoals')}</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">{t('progress.noGoalsSub')}</p>
          <Button onClick={() => setShowForm(true)} className="rounded-xl gap-2">
            <Plus className="w-4 h-4" /> {t('progress.addGoal')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map(goal => {
            const done  = goal.milestones.filter(m => m.completed).length
            const total = goal.milestones.length
            const pct   = total > 0 ? Math.round((done / total) * 100) : 0
            const open  = expanded.has(goal.id)

            return (
              <div key={goal.id} className="glass rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 p-5 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => toggleExpand(goal.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[goal.category]}`}>
                        {cats[goal.category]}
                      </span>
                      <span className="text-xs text-muted-foreground">{goal.createdAt}</span>
                    </div>
                    <h3 className="font-semibold text-sm leading-tight mb-2">{goal.title}</h3>
                    <div className="flex items-center gap-3">
                      <Progress value={pct} className="flex-1 h-1.5" />
                      <span className="text-xs font-bold text-primary tabular-nums shrink-0">{done}/{total}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button onClick={e => { e.stopPropagation(); deleteGoal(goal.id) }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                      title={t('progress.delete')}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {open && goal.milestones.length > 0 && (
                  <div className="border-t border-border/40 px-5 pb-4 pt-3 space-y-2">
                    {goal.milestones.map(ms => (
                      <div key={ms.id} className="flex items-center gap-3 group cursor-pointer"
                        onClick={() => toggleMilestone(goal.id, ms.id)}>
                        {ms.completed
                          ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                          : <Circle className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary/60 shrink-0 transition-colors" />}
                        <span className={`text-sm flex-1 transition-colors ${ms.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {ms.text}
                        </span>
                        {ms.completedAt && (
                          <span className="text-xs text-muted-foreground shrink-0">{ms.completedAt}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
