'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PROGRAMS, TRACKS, type Track } from '@/lib/learning-paths-data'
import { getProgress, getProgramCompletionPct } from '@/lib/learning-progress'
import { useProfile } from '@/context/profile-context'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  BookMarked, Clock, ChevronRight, Lock, Award, Filter,
  BookOpen, Microscope, Globe, PenLine, Users, Heart,
} from 'lucide-react'

const TRACK_ICONS: Record<Track, React.FC<{ className?: string }>> = {
  core:       BookOpen,
  stem:       Microscope,
  languages:  PenLine,
  humanities: Globe,
  leadership: Users,
  wellbeing:  Heart,
}

export default function LearningPage() {
  const { syncReady } = useProfile()
  const [activeTrack, setActiveTrack] = useState<Track | 'all'>('all')
  const [progresses, setProgresses] = useState<Record<string, number>>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const map: Record<string, number> = {}
    for (const p of PROGRAMS) {
      if (p.available) map[p.id] = getProgramCompletionPct(p, getProgress(p.id))
    }
    setProgresses(map)
    setMounted(true)
  }, [syncReady])

  const visible = PROGRAMS.filter(p => activeTrack === 'all' || p.track === activeTrack)

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-semibold mb-4">
          <BookMarked className="w-3.5 h-3.5" />
          Learning Paths
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">Professional Development Programs</h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          Curated CBC professional development programs aligned with KICD, CEMASTEA, and KEMI frameworks.
          Each program includes lessons, practical assignments, assessments, and a shareable completion certificate.
        </p>
      </div>

      {/* Track filter */}
      <div className="flex flex-wrap gap-2 mb-7">
          <button
            type="button"
            onClick={() => setActiveTrack('all')}
            className={`min-h-11 px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-150 ${
            activeTrack === 'all'
              ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
              : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/40'
          }`}
        >
          All Programs ({PROGRAMS.length})
        </button>
        {TRACKS.map(track => {
          const Icon = TRACK_ICONS[track.id]
          return (
            <button
              type="button"
              key={track.id}
              onClick={() => setActiveTrack(track.id)}
              className={`min-h-11 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-150 ${
                activeTrack === track.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                  : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {track.label} ({track.count})
            </button>
          )
        })}
      </div>

      {/* Program grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {visible.map(program => {
          const pct   = mounted ? (progresses[program.id] ?? 0) : 0
          const Icon  = TRACK_ICONS[program.track]
          const isAvailable = program.available

          return (
            <div
              key={program.id}
              className={`glass rounded-2xl overflow-hidden transition-all duration-300 ${isAvailable ? 'hover:shadow-2xl hover:shadow-primary/8 hover:-translate-y-1' : 'opacity-70'}`}
            >
              {/* Color bar */}
              <div className={`h-1.5 w-full ${program.accent === 'primary' ? 'bg-primary' : 'bg-accent'}`} />

              <div className="p-6">
                {/* Labels */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    program.accent === 'primary' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'
                  }`}>
                    <Icon className="w-3 h-3 inline mr-1" />
                    {TRACKS.find(t => t.id === program.track)?.label}
                  </span>
                  {program.launchingSoon && (
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-muted text-muted-foreground border border-border/50">
                      Launching Soon
                    </span>
                  )}
                  {mounted && pct === 100 && (
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-green-500/10 text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Award className="w-3 h-3" /> Completed
                    </span>
                  )}
                </div>

                <h2 className="font-bold text-lg tracking-tight mb-1">{program.title}</h2>
                <p className="text-xs text-primary/80 font-medium mb-3">{program.kicdAlignment}</p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">{program.description}</p>

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {program.hours}h
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" /> {program.lessons} lessons
                  </span>
                  {isAvailable && (
                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> Certificate
                    </span>
                  )}
                </div>

                {/* Progress */}
                {isAvailable && mounted && pct > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold text-primary">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                )}

                {/* CTA */}
                {isAvailable ? (
                  <Link href={`/dashboard/learning/${program.id}`} className={`flex items-center justify-between min-h-11 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      program.accent === 'primary'
                        ? 'bg-primary/8 text-primary hover:bg-primary/15'
                        : 'bg-accent/8 text-accent hover:bg-accent/15'
                    }`}>
                      <span>{pct === 0 ? 'Start Program' : pct === 100 ? 'Review Program' : 'Continue Learning'}</span>
                      <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium bg-muted/50 text-muted-foreground cursor-not-allowed">
                    <span>Coming Soon</span>
                    <Lock className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
