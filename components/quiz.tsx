'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  RotateCcw,
  Trophy,
  Lightbulb,
  Clock,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type QuizQuestion = {
  id: number
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
}

export type Quiz = {
  title: string
  description?: string
  questions: QuizQuestion[]
  passingScore?: number
}

interface QuizProps {
  quiz: Quiz
  onComplete?: (score: number, total: number, passed: boolean) => void
}

type QuestionState = {
  selectedAnswer: number | null
  isAnswered: boolean
  isCorrect: boolean
}

export function QuizComponent({ quiz, onComplete }: QuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [questionStates, setQuestionStates] = useState<QuestionState[]>(
    quiz.questions.map(() => ({ selectedAnswer: null, isAnswered: false, isCorrect: false }))
  )
  const [isQuizComplete, setIsQuizComplete] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const startTimeRef = useRef<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [timeTaken, setTimeTaken] = useState(0)

  useEffect(() => {
    startTimeRef.current = Date.now()
  }, [])

  const currentQuestion = quiz.questions[currentQuestionIndex]
  const currentState = questionStates[currentQuestionIndex]
  const passingScore = quiz.passingScore ?? 85

  const correctAnswers = questionStates.filter(s => s.isCorrect).length
  const answeredQuestions = questionStates.filter(s => s.isAnswered).length
  const scorePercent = quiz.questions.length > 0 
    ? Math.round((correctAnswers / quiz.questions.length) * 100) 
    : 0
  const passed = scorePercent >= passingScore

  const handleSelectAnswer = useCallback((optionIndex: number) => {
    if (currentState.isAnswered) return

    const isCorrect = optionIndex === currentQuestion.correctAnswer
    
    setQuestionStates(prev => {
      const newStates = [...prev]
      newStates[currentQuestionIndex] = {
        selectedAnswer: optionIndex,
        isAnswered: true,
        isCorrect
      }
      return newStates
    })
    setShowExplanation(true)
  }, [currentQuestionIndex, currentQuestion.correctAnswer, currentState.isAnswered])

  const handleNextQuestion = useCallback(() => {
    setShowExplanation(false)
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    } else {
      setIsQuizComplete(true)
      const completedAt = Date.now()
      setEndTime(completedAt)
      setTimeTaken(completedAt - (startTimeRef.current ?? completedAt))
      const finalCorrect = questionStates.filter(s => s.isCorrect).length
      const finalPercent = Math.round((finalCorrect / quiz.questions.length) * 100)
      onComplete?.(finalCorrect, quiz.questions.length, finalPercent >= passingScore)
    }
  }, [currentQuestionIndex, quiz.questions.length, questionStates, passingScore, onComplete])

  const handleRestartQuiz = useCallback(() => {
    setCurrentQuestionIndex(0)
    setQuestionStates(quiz.questions.map(() => ({ 
      selectedAnswer: null, 
      isAnswered: false, 
      isCorrect: false 
    })))
    setIsQuizComplete(false)
    setShowExplanation(false)
    startTimeRef.current = Date.now()
    setEndTime(null)
    setTimeTaken(0)
  }, [quiz.questions])

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Quiz Complete Screen
  if (isQuizComplete) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center">
          <div className={cn(
            "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6",
            passed ? "bg-primary/10" : "bg-orange-100 dark:bg-orange-900/30"
          )}>
            {passed ? (
              <Trophy className="w-10 h-10 text-primary" />
            ) : (
              <RotateCcw className="w-10 h-10 text-orange-600" />
            )}
          </div>
          
          <h2 className="text-2xl font-bold mb-2">
            {passed ? 'Congratulations!' : 'Keep Learning!'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {passed 
              ? 'You have successfully completed this quiz.' 
              : `You need ${passingScore}% to pass. Review the material and try again.`
            }
          </p>

          {/* Score Display */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-muted rounded-xl">
              <div className="text-3xl font-bold text-primary">{scorePercent}%</div>
              <div className="text-sm text-muted-foreground">Score</div>
            </div>
            <div className="p-4 bg-muted rounded-xl">
              <div className="text-3xl font-bold">{correctAnswers}/{quiz.questions.length}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div className="p-4 bg-muted rounded-xl">
              <div className="text-3xl font-bold">{formatTime(timeTaken)}</div>
              <div className="text-sm text-muted-foreground">Time</div>
            </div>
          </div>

          {/* Answer Summary */}
          <div className="mb-8">
            <h3 className="font-semibold mb-4 text-left">Question Summary</h3>
            <div className="grid grid-cols-5 gap-2">
              {questionStates.map((state, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => {
                    setIsQuizComplete(false)
                    setCurrentQuestionIndex(index)
                    setShowExplanation(true)
                  }}
                  className={cn(
                    "min-h-11 p-3 rounded-lg text-sm font-medium transition-colors",
                    state.isCorrect 
                      ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400" 
                      : "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                  )}
                  aria-label={`Question ${index + 1}: ${state.isCorrect ? 'Correct' : 'Incorrect'}`}
                >
                  Q{index + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={handleRestartQuiz}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            {passed && (
              <Button>
                Continue Learning
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    )
  }

  // Quiz Question Screen
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">{quiz.title}</h2>
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            In Progress
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <Progress 
            value={(answeredQuestions / quiz.questions.length) * 100} 
            className="flex-1 h-2"
            aria-label={`Quiz progress: ${answeredQuestions} of ${quiz.questions.length} questions answered`}
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {currentQuestionIndex + 1} / {quiz.questions.length}
          </span>
        </div>
      </Card>

      {/* Question Card */}
      <Card className="p-6 lg:p-8">
        <div className="mb-6">
          <Badge className="mb-3">Question {currentQuestionIndex + 1}</Badge>
          <h3 className="text-xl font-semibold leading-relaxed">
            {currentQuestion.question}
          </h3>
        </div>

        {/* Options */}
        <div className="space-y-3" role="radiogroup" aria-label="Answer options">
          {currentQuestion.options.map((option, index) => {
            const isSelected = currentState.selectedAnswer === index
            const isCorrectOption = index === currentQuestion.correctAnswer
            const showCorrectness = currentState.isAnswered

            return (
              <button
                type="button"
                key={index}
                onClick={() => handleSelectAnswer(index)}
                disabled={currentState.isAnswered}
                role="radio"
                aria-checked={isSelected}
                aria-disabled={currentState.isAnswered}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all duration-200",
                  "flex items-center gap-4 group",
                  !currentState.isAnswered && "hover:border-primary/50 hover:bg-primary/5 cursor-pointer",
                  currentState.isAnswered && "cursor-default",
                  !showCorrectness && isSelected && "border-primary bg-primary/10",
                  !showCorrectness && !isSelected && "border-border",
                  showCorrectness && isCorrectOption && "border-green-500 bg-green-50 dark:bg-green-900/20",
                  showCorrectness && isSelected && !isCorrectOption && "border-red-500 bg-red-50 dark:bg-red-900/20",
                  showCorrectness && !isSelected && !isCorrectOption && "border-border opacity-60"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full border-2 flex items-center justify-center font-medium text-sm shrink-0",
                  !showCorrectness && isSelected && "border-primary bg-primary text-primary-foreground",
                  !showCorrectness && !isSelected && "border-muted-foreground/30",
                  showCorrectness && isCorrectOption && "border-green-500 bg-green-500 text-white",
                  showCorrectness && isSelected && !isCorrectOption && "border-red-500 bg-red-500 text-white",
                  showCorrectness && !isSelected && !isCorrectOption && "border-muted-foreground/30"
                )}>
                  {showCorrectness ? (
                    isCorrectOption ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isSelected ? (
                      <XCircle className="w-5 h-5" />
                    ) : (
                      String.fromCharCode(65 + index)
                    )
                  ) : (
                    String.fromCharCode(65 + index)
                  )}
                </div>
                <span className="flex-1">{option}</span>
              </button>
            )
          })}
        </div>

        {/* Explanation */}
        {showExplanation && currentQuestion.explanation && (
          <div className={cn(
            "mt-6 p-4 rounded-xl flex gap-3",
            currentState.isCorrect 
              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" 
              : "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
          )}>
            <Lightbulb className={cn(
              "w-5 h-5 shrink-0 mt-0.5",
              currentState.isCorrect ? "text-green-600" : "text-orange-600"
            )} />
            <div>
              <p className="font-medium mb-1">
                {currentState.isCorrect ? 'Correct!' : 'Not quite right'}
              </p>
              <p className="text-sm text-muted-foreground">
                {currentQuestion.explanation}
              </p>
            </div>
          </div>
        )}

        {/* Feedback for answered questions without explanation */}
        {showExplanation && !currentQuestion.explanation && (
          <div className={cn(
            "mt-6 p-4 rounded-xl flex items-center gap-3",
            currentState.isCorrect 
              ? "bg-green-50 dark:bg-green-900/20" 
              : "bg-red-50 dark:bg-red-900/20"
          )}>
            {currentState.isCorrect ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <span className="font-medium">
              {currentState.isCorrect ? 'Correct!' : 'Incorrect. The correct answer is highlighted above.'}
            </span>
          </div>
        )}
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {correctAnswers} of {answeredQuestions} correct so far
        </div>
        
        {currentState.isAnswered && (
          <Button onClick={handleNextQuestion} className="gap-2">
            {currentQuestionIndex < quiz.questions.length - 1 ? (
              <>
                Next Question
                <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              <>
                View Results
                <Trophy className="w-4 h-4" />
              </>
            )}
          </Button>
        )}
      </div>

      {/* Accessibility: Screen reader status */}
      <div className="sr-only" role="status" aria-live="polite">
        Question {currentQuestionIndex + 1} of {quiz.questions.length}.
        {currentState.isAnswered && (
          currentState.isCorrect 
            ? ' Your answer is correct.' 
            : ' Your answer is incorrect.'
        )}
      </div>
    </div>
  )
}

// Helper to parse quiz content from markdown-like format
export function parseQuizFromContent(content: string): Quiz | null {
  try {
    const lines = content.trim().split('\n')
    const questions: QuizQuestion[] = []
    
    let title = ''
    let currentQuestion: Partial<QuizQuestion> | null = null
    let currentOptions: string[] = []
    let questionId = 0

    for (const line of lines) {
      const trimmed = line.trim()
      
      // Get title from first heading
      if (trimmed.startsWith('# ') && !title) {
        title = trimmed.slice(2)
        continue
      }

      // Question start
      if (trimmed.startsWith('**Question')) {
        if (currentQuestion && currentOptions.length > 0) {
          questions.push({
            id: questionId++,
            question: currentQuestion.question || '',
            options: currentOptions,
            correctAnswer: currentQuestion.correctAnswer || 0,
            explanation: currentQuestion.explanation
          })
        }
        const questionMatch = trimmed.match(/\*\*Question \d+:\*\*\s*(.+)/)
        currentQuestion = {
          question: questionMatch ? questionMatch[1] : ''
        }
        currentOptions = []
        continue
      }

      // Options (a), b), c), d) format
      const optionMatch = trimmed.match(/^([a-d])\)\s*(.+)/)
      if (optionMatch && currentQuestion) {
        currentOptions.push(optionMatch[2])
        continue
      }

      // Answer line
      if (trimmed.startsWith('**Answer:**') && currentQuestion) {
        const answerMatch = trimmed.match(/\*\*Answer:\*\*\s*([a-d])\)/)
        if (answerMatch) {
          const answerLetter = answerMatch[1].toLowerCase()
          currentQuestion.correctAnswer = answerLetter.charCodeAt(0) - 97 // a=0, b=1, etc.
        }
        continue
      }
    }

    // Don't forget the last question
    if (currentQuestion && currentOptions.length > 0) {
      questions.push({
        id: questionId,
        question: currentQuestion.question || '',
        options: currentOptions,
        correctAnswer: currentQuestion.correctAnswer || 0,
        explanation: currentQuestion.explanation
      })
    }

    if (questions.length === 0) {
      return null
    }

    return {
      title,
      questions,
      passingScore: 85
    }
  } catch {
    return null
  }
}
