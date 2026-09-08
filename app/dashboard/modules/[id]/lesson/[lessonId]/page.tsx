'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BackButton } from '@/components/back-button'
import { Progress } from '@/components/ui/progress'
import {
  PlayCircle,
  FileText,
  HelpCircle,
  Activity,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { getModuleById } from '@/lib/modules-data'
import { QuizComponent, parseQuizFromContent } from '@/components/quiz'
import { getProgress, completeLesson, uncompleteLesson, isLessonComplete } from '@/lib/learning-progress'
import { useProfile } from '@/context/profile-context'
import { recordActivity } from '@/lib/streak'
import { renderInline } from '@/lib/render-md'

const lessonTypeIcons = {
  video: PlayCircle,
  reading: FileText,
  quiz: HelpCircle,
  activity: Activity,
}

const lessonTypeBadgeColors = {
  video: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  reading: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  quiz: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  activity: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
}

export default function LessonPage() {
  const params = useParams()
  const moduleId = Number(params.id)
  const lessonId = Number(params.lessonId)
  const { user, syncReady } = useProfile()

  const lessonModule = getModuleById(moduleId)
  const programId = `module-${moduleId}`
  const [isCompleted, setIsCompleted] = useState(false)

  useEffect(() => {
    if (!syncReady) return
    const p = getProgress(programId)
    setIsCompleted(isLessonComplete(p, String(moduleId), String(lessonId)))
  }, [syncReady, programId, moduleId, lessonId])

  const toggleComplete = () => {
    const next = !isCompleted
    setIsCompleted(next)
    if (next) {
      completeLesson(programId, String(moduleId), String(lessonId))
      recordActivity('lesson', user?.id)
    } else {
      uncompleteLesson(programId, String(moduleId), String(lessonId))
    }
  }

  if (!lessonModule) {
    return (
      <div className="space-y-8">
        <BackButton fallbackHref="/dashboard/modules" label="Back to Modules" />
        <Card className="p-12 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Module Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The module you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button asChild>
            <Link href="/dashboard/modules">Browse All Modules</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const lesson = lessonModule.lessons.find(l => l.id === lessonId)
  const lessonIndex = lessonModule.lessons.findIndex(l => l.id === lessonId)
  
  if (!lesson) {
    return (
      <div className="space-y-8">
        <BackButton fallbackHref={`/dashboard/modules/${moduleId}`} label="Back to Module" />
        <Card className="p-12 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Lesson Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This lesson doesn&apos;t exist in this module.
          </p>
          <Button asChild>
            <Link href={`/dashboard/modules/${moduleId}`}>Back to Module</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const prevLesson = lessonIndex > 0 ? lessonModule.lessons[lessonIndex - 1] : null
  const nextLesson = lessonIndex < lessonModule.lessons.length - 1 ? lessonModule.lessons[lessonIndex + 1] : null
  const progressPercent = Math.round(((lessonIndex + 1) / lessonModule.lessons.length) * 100)

  const Icon = lessonTypeIcons[lesson.type]

  // Simple markdown-like rendering
  const renderContent = (content: string) => {
    const lines = content.trim().split('\n')
    const elements: React.ReactNode[] = []
    let currentList: string[] = []
    let currentTable: string[][] = []
    let inTable = false

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 mb-4 ml-4">
            {currentList.map((item, i) => (
              <li key={i}>{renderInline(item)}</li>
            ))}
          </ul>
        )
        currentList = []
      }
    }

    const flushTable = () => {
      if (currentTable.length > 1) {
        elements.push(
          <div key={`table-${elements.length}`} className="overflow-x-auto mb-4">
            <table className="w-full border-collapse border border-border">
              <thead>
                <tr className="bg-muted">
                  {currentTable[0].map((cell, i) => (
                    <th key={i} className="border border-border px-3 py-2 text-left font-semibold">
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentTable.slice(2).map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="border border-border px-3 py-2">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        currentTable = []
        inTable = false
      }
    }

    lines.forEach((line, index) => {
      const trimmedLine = line.trim()
      
      // Skip empty lines
      if (!trimmedLine) {
        flushList()
        if (inTable) flushTable()
        return
      }

      // Tables
      if (trimmedLine.startsWith('|')) {
        flushList()
        inTable = true
        const cells = trimmedLine.split('|').filter(c => c.trim()).map(c => c.trim())
        currentTable.push(cells)
        return
      } else if (inTable) {
        flushTable()
      }

      // Headers
      if (trimmedLine.startsWith('# ')) {
        flushList()
        elements.push(
          <h1 key={index} className="text-2xl font-bold mt-6 mb-4">
            {renderInline(trimmedLine.slice(2))}
          </h1>
        )
        return
      }
      if (trimmedLine.startsWith('## ')) {
        flushList()
        elements.push(
          <h2 key={index} className="text-xl font-semibold mt-6 mb-3">
            {renderInline(trimmedLine.slice(3))}
          </h2>
        )
        return
      }
      if (trimmedLine.startsWith('### ')) {
        flushList()
        elements.push(
          <h3 key={index} className="text-lg font-semibold mt-4 mb-2">
            {renderInline(trimmedLine.slice(4))}
          </h3>
        )
        return
      }

      // List items
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        currentList.push(trimmedLine.slice(2))
        return
      }
      if (/^\d+\.\s/.test(trimmedLine)) {
        currentList.push(trimmedLine.replace(/^\d+\.\s/, ''))
        return
      }

      // Horizontal rule
      if (trimmedLine === '---') {
        flushList()
        elements.push(<hr key={index} className="my-6 border-border" />)
        return
      }

      // Paragraph
      flushList()
      elements.push(
        <p 
          key={index} 
          className="mb-3 leading-relaxed"
        >
          {renderInline(trimmedLine.replace(/❌/g, '✕').replace(/✅/g, '✓'))}
        </p>
      )
    })

    flushList()
    if (inTable) flushTable()

    return elements
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <BackButton fallbackHref={`/dashboard/modules/${moduleId}`} label={`Back to ${lessonModule.title}`} />
      
      {/* Progress Bar */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          Lesson {lessonIndex + 1} of {lessonModule.lessons.length}
        </span>
        <Progress value={progressPercent} className="flex-1 h-2" />
        <span className="text-sm font-medium">{progressPercent}%</span>
      </div>

      {/* Lesson Header */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl bg-muted ${lessonTypeBadgeColors[lesson.type].split(' ')[0]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={lessonTypeBadgeColors[lesson.type]}>
                {lesson.type}
              </Badge>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {lesson.duration} min
              </span>
            </div>
            <h1 className="text-2xl font-bold">{lesson.title}</h1>
          </div>
        </div>
      </Card>

      {/* Lesson Content */}
      {lesson.type === 'quiz' ? (
        (() => {
          const quiz = parseQuizFromContent(lesson.content)
          if (quiz) {
            return (
              <QuizComponent
                quiz={quiz}
                onComplete={(score, total, passed) => {
                  if (passed && !isCompleted) {
                    setIsCompleted(true)
                    completeLesson(programId, String(moduleId), String(lessonId))
                    recordActivity('lesson', user?.id)
                  }
                }}
              />
            )
          }
          // Fallback if quiz parsing fails
          return (
            <Card className="p-6 lg:p-8">
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Quiz Loading Error</h3>
                <p className="text-muted-foreground">
                  There was an issue loading this quiz. Please try refreshing the page.
                </p>
              </div>
            </Card>
          )
        })()
      ) : (
        <Card className="p-6 lg:p-8">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            {renderContent(lesson.content)}
          </div>
        </Card>
      )}

      {/* Completion Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isCompleted ? (
              <>
                <CheckCircle className="w-6 h-6 text-primary" />
                <span className="font-medium text-primary">Lesson Completed!</span>
              </>
            ) : (
              <span className="text-muted-foreground">Mark as complete when you&apos;re done</span>
            )}
          </div>
          <Button
            variant={isCompleted ? 'outline' : 'default'}
            onClick={toggleComplete}
          >
            {isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
          </Button>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        {prevLesson ? (
          <Button variant="outline" asChild>
            <Link href={`/dashboard/modules/${moduleId}/lesson/${prevLesson.id}`}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous: {prevLesson.title.length > 30 ? prevLesson.title.slice(0, 30) + '...' : prevLesson.title}
            </Link>
          </Button>
        ) : (
          <div />
        )}
        
        {nextLesson ? (
          <Button asChild>
            <Link href={`/dashboard/modules/${moduleId}/lesson/${nextLesson.id}`}>
              Next: {nextLesson.title.length > 30 ? nextLesson.title.slice(0, 30) + '...' : nextLesson.title}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href={`/dashboard/modules/${moduleId}`}>
              Back to Module Overview
              <ChevronRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
