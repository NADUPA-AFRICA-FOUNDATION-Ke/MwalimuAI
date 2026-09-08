'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BackButton } from '@/components/back-button'
import { BookOpen, Clock, BarChart3, ChevronRight, BookMarked, ClipboardCheck, Target, Users, Monitor, School, FileEdit, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { modulesData } from '@/lib/modules-data'
import { getProgress } from '@/lib/learning-progress'
import { useProfile } from '@/context/profile-context'

const MODULE_ICONS: Record<string, LucideIcon> = {
  CBC: BookMarked,
  CBA: ClipboardCheck,
  FA:  Target,
  INC: Users,
  DIG: Monitor,
  JSS: School,
  LP:  FileEdit,
}

const categories = [
  { id: 'all', name: 'All Modules' },
  { id: 'foundations', name: 'Foundations' },
  { id: 'assessment', name: 'Assessment' },
  { id: 'pedagogy', name: 'Pedagogy' },
  { id: 'technology', name: 'Technology' },
]

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  intermediate: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  advanced: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
}

export default function ModulesPage() {
  const { syncReady } = useProfile()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [progresses, setProgresses] = useState<Record<number, number>>({})

  useEffect(() => {
    if (!syncReady) return
    const map: Record<number, number> = {}
    for (const m of modulesData) {
      const p = getProgress(`module-${m.id}`)
      const total = m.lessons.length
      map[m.id] = total > 0 ? Math.round((p.completedLessons.length / total) * 100) : 0
    }
    setProgresses(map)
  }, [syncReady])

  const filteredModules =
    selectedCategory === 'all'
      ? modulesData
      : modulesData.filter((m) => m.category === selectedCategory)

  return (
    <div className="space-y-8">
      <BackButton fallbackHref="/dashboard" label="Back to Dashboard" />
      <div>
        <h1 className="text-3xl font-bold mb-2">Learning Modules</h1>
        <p className="text-muted-foreground">
          Develop your CBC teaching expertise through our comprehensive learning paths.
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            type="button"
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`min-h-11 px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-colors ${
              selectedCategory === category.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModules.map((module) => (
          <Link
            key={module.id}
            href={`/dashboard/modules/${module.id}`}
            className="group"
          >
            <Card className="overflow-hidden hover:shadow-lg transition-all hover:border-primary/50 flex flex-col h-full">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 flex items-center justify-center">
                {(() => { const Icon = MODULE_ICONS[module.icon] ?? BookOpen; return <Icon className="w-10 h-10 text-primary" aria-hidden="true" /> })()}
              </div>

              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-lg flex-1 group-hover:text-primary transition-colors">
                    {module.title}
                  </h3>
                  <Badge className={difficultyColors[module.difficulty]}>
                    {module.difficulty}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-4 flex-1">
                  {module.description}
                </p>

                <div className="space-y-3 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{module.duration} minutes</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BookOpen className="w-4 h-4" />
                    <span>{module.lessons.length} lessons</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BarChart3 className="w-4 h-4" />
                    <span>Progress: {progresses[module.id] ?? 0}%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-muted rounded-full mb-4 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progresses[module.id] ?? 0}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-primary">
                    {(progresses[module.id] ?? 0) > 0 ? 'Continue' : 'Start'} Learning
                  </span>
                  <ChevronRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {filteredModules.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No modules found in this category.</p>
        </Card>
      )}
    </div>
  )
}
