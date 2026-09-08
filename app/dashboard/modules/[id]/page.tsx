'use client'

import { useParams, notFound } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BackButton } from '@/components/back-button'
import { Progress } from '@/components/ui/progress'
import {
  BookOpen,
  Clock,
  PlayCircle,
  FileText,
  HelpCircle,
  Activity,
  CheckCircle,
  Circle,
  ChevronRight,
  Target,
  AlertCircle,
  BookMarked,
  ClipboardCheck,
  Users,
  Monitor,
  School,
  FileEdit,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { getModuleById, type Lesson } from '@/lib/modules-data'
import { getLegacyModuleGuide } from '@/lib/curriculum-guidance'
import { ModuleImplementationGuide } from '@/components/module-implementation-guide'
import { getProgress, completeLesson, uncompleteLesson } from '@/lib/learning-progress'
import { useProfile } from '@/context/profile-context'
import { recordActivity } from '@/lib/streak'

const MODULE_ICONS: Record<string, LucideIcon> = {
  CBC: BookMarked,
  CBA: ClipboardCheck,
  FA:  Target,
  INC: Users,
  DIG: Monitor,
  JSS: School,
  LP:  FileEdit,
}

const lessonTypeIcons = {
  video: PlayCircle,
  reading: FileText,
  quiz: HelpCircle,
  activity: Activity,
}

const lessonTypeColors = {
  video: 'text-blue-500',
  reading: 'text-green-500',
  quiz: 'text-orange-500',
  activity: 'text-purple-500',
}

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  intermediate: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  advanced: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
}

export default function ModuleDetailPage() {
  const params = useParams()
  const moduleId = Number(params.id)
  const moduleData = getModuleById(moduleId)
  const { user, syncReady } = useProfile()

  const programId = `module-${moduleId}`
  const [completedLessons, setCompletedLessons] = useState<number[]>([])

  useEffect(() => {
    if (!syncReady || !moduleData) return
    const p = getProgress(programId)
    const ids = p.completedLessons
      .map(k => Number(k.split('/')[1]))
      .filter(id => moduleData.lessons.some(l => l.id === id))
    setCompletedLessons(ids)
  }, [syncReady, programId, moduleData])

  if (!moduleData) {
    return (
      <div className="space-y-8">
        <BackButton fallbackHref="/dashboard/modules" label="Back to Modules" />
        <Card className="p-12 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Module Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The module you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Button asChild>
            <Link href="/dashboard/modules">Browse All Modules</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const completedCount = completedLessons.length
  const totalLessons = moduleData.lessons.length
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0
  const nextLessonId = moduleData.lessons.find(l => !completedLessons.includes(l.id))?.id ?? moduleData.lessons[0]?.id ?? 1

  const toggleLessonComplete = (lessonId: number) => {
    const isNowComplete = !completedLessons.includes(lessonId)
    setCompletedLessons(prev =>
      isNowComplete ? [...prev, lessonId] : prev.filter(id => id !== lessonId)
    )
    if (isNowComplete) {
      completeLesson(programId, String(moduleId), String(lessonId))
      recordActivity('lesson', user?.id)
    } else {
      uncompleteLesson(programId, String(moduleId), String(lessonId))
    }
  }

  return (
    <div className="space-y-8">
      <BackButton fallbackHref="/dashboard/modules" label="Back to Modules" />
      
      {/* Module Header */}
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            {(() => { const Icon = MODULE_ICONS[moduleData.icon] ?? BookOpen; return <Icon className="w-9 h-9 text-primary" aria-hidden="true" /> })()}
            <div>
              <Badge className={difficultyColors[moduleData.difficulty]}>
                {moduleData.difficulty}
              </Badge>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold mb-3">{moduleData.title}</h1>
          <p className="text-lg text-muted-foreground mb-6">{moduleData.description}</p>
          
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{moduleData.duration} minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>{totalLessons} lessons</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span>{completedCount} completed</span>
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <Card className="p-6 lg:w-80">
          <h3 className="font-semibold mb-4">Your Progress</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
            <div className="text-sm text-muted-foreground">
              {completedCount} of {totalLessons} lessons completed
            </div>
            {completedCount === 0 && (
              <Button className="w-full" asChild>
                <Link href={`/dashboard/modules/${moduleData.id}/lesson/1`}>
                  Start Learning
                </Link>
              </Button>
            )}
            {completedCount > 0 && completedCount < totalLessons && (
              <Button className="w-full" asChild>
                <Link href={`/dashboard/modules/${moduleData.id}/lesson/${nextLessonId}`}>
                  Continue Learning
                </Link>
              </Button>
            )}
            {completedCount === totalLessons && totalLessons > 0 && (
              <div className="text-center py-2">
                <CheckCircle className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-medium text-primary">Module Completed!</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Learning Objectives */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Learning Objectives</h2>
        </div>
        <p className="text-muted-foreground mb-4">By the end of this module, you will be able to:</p>
        <ul className="space-y-2">
          {moduleData.objectives.map((objective, index) => (
            <li key={index} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <span>{objective}</span>
            </li>
          ))}
        </ul>
      </Card>

      {getLegacyModuleGuide(moduleData.id) && (
        <Card className="overflow-hidden">
          <ModuleImplementationGuide guide={getLegacyModuleGuide(moduleData.id)!} />
        </Card>
      )}

      {/* Prerequisites */}
      {moduleData.prerequisites.length > 0 && (
        <Card className="p-6 border-orange-200 dark:border-orange-800/50 bg-orange-50/50 dark:bg-orange-950/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h2 className="font-semibold text-orange-900 dark:text-orange-100">Prerequisites</h2>
          </div>
          <p className="text-sm text-orange-700 dark:text-orange-300">
            Complete these modules first: {moduleData.prerequisites.join(', ')}
          </p>
        </Card>
      )}

      {/* Lessons List */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Lessons</h2>
        <div className="space-y-3">
          {moduleData.lessons.map((lesson, index) => {
            const Icon = lessonTypeIcons[lesson.type]
            const isCompleted = completedLessons.includes(lesson.id)
            
            return (
              <Card 
                key={lesson.id} 
                className={`p-4 transition-all hover:shadow-md ${
                  isCompleted ? 'bg-primary/5 border-primary/20' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Completion Status */}
                  <button
                    onClick={() => toggleLessonComplete(lesson.id)}
                    className="flex-shrink-0"
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-primary" />
                    ) : (
                      <Circle className="w-6 h-6 text-muted-foreground hover:text-primary transition-colors" />
                    )}
                  </button>

                  {/* Lesson Number */}
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>

                  {/* Lesson Type Icon */}
                  <div className={`p-2 rounded-lg bg-muted ${lessonTypeColors[lesson.type]}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Lesson Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                      {lesson.title}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="capitalize">{lesson.type}</span>
                      <span>•</span>
                      <span>{lesson.duration} min</span>
                    </div>
                  </div>

                  {/* Action */}
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/dashboard/modules/${moduleData.id}/lesson/${lesson.id}`}>
                      <span className="sr-only">Go to lesson</span>
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
