'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BackButton } from '@/components/back-button'
import { Download, BookOpen, Video, FileText, ExternalLink, Lock } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const resources = [
  {
    id: 1,
    title: 'CBC Implementation Guide 2024',
    type: 'PDF',
    size: '2.4 MB',
    icon: FileText,
    description: 'Comprehensive guide on CBC curriculum implementation strategies.',
    tags: ['CBC', 'Implementation', 'Guidelines'],
    url: 'https://kicd.ac.ke/curriculum-designs/',
    free: true,
  },
  {
    id: 2,
    title: 'Formative Assessment Toolkit',
    type: 'PDF',
    size: '1.8 MB',
    icon: BookOpen,
    description: 'Ready-to-use templates and tools for formative assessments.',
    tags: ['Assessment', 'Templates', 'Tools'],
    url: null,
    free: false,
  },
  {
    id: 3,
    title: 'Video: Competency-Based Grading',
    type: 'Video',
    size: '45 min',
    icon: Video,
    description: 'Expert video on implementing competency-based grading systems.',
    tags: ['Grading', 'Video', 'Assessment'],
    url: 'https://www.youtube.com/@KICDKenya',
    free: true,
  },
  {
    id: 4,
    title: 'Inclusive Classroom Strategies',
    type: 'PDF',
    size: '2.1 MB',
    icon: FileText,
    description: 'Practical strategies for supporting diverse learners in CBC.',
    tags: ['Inclusion', 'Diversity', 'Strategies'],
    url: null,
    free: false,
  },
  {
    id: 5,
    title: 'Digital Tools for CBC',
    type: 'Video',
    size: '30 min',
    icon: Video,
    description: 'Overview of digital tools that support CBC implementation.',
    tags: ['Technology', 'Tools', 'Video'],
    url: null,
    free: false,
  },
  {
    id: 6,
    title: 'Parent Communication Templates',
    type: 'PDF',
    size: '0.9 MB',
    icon: FileText,
    description: 'Templates for communicating CBC changes to parents.',
    tags: ['Communication', 'Templates', 'Parents'],
    url: null,
    free: false,
  },
]

export default function ResourcesPage() {
  return (
    <div className="space-y-8">
      <BackButton fallbackHref="/dashboard" label="Back to Dashboard" />
      <div>
        <h1 className="text-3xl font-bold mb-2">Resources & Materials</h1>
        <p className="text-muted-foreground">
          Download and access curated resources to support your CBC implementation journey.
        </p>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {resources.map((resource) => {
          const Icon = resource.icon
          return (
            <Card key={resource.id} className="p-6 hover:shadow-lg transition-shadow flex flex-col">
              <div className="flex gap-4 mb-4">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-snug">{resource.title}</h3>
                    {!resource.free && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-full px-2 py-0.5 shrink-0">
                        <Lock className="w-2.5 h-2.5" />
                        Pro
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {resource.type} · {resource.size}
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4 flex-1">{resource.description}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {resource.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              {resource.url ? (
                <Button className="w-full gap-2" asChild>
                  <a href={resource.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    {resource.type === 'Video' ? 'Watch Resource' : 'Open Resource'}
                  </a>
                </Button>
              ) : (
                <Button
                  className="w-full gap-2"
                  variant={resource.free ? 'default' : 'outline'}
                  onClick={() =>
                    toast.info('Professional plan required', {
                      description: 'Upgrade to Professional to download all resources.',
                      action: { label: 'View plans', onClick: () => window.location.href = '/pricing' },
                    })
                  }
                >
                  {resource.free ? (
                    <><Download className="w-4 h-4" /> Download Resource</>
                  ) : (
                    <><Lock className="w-4 h-4" /> Unlock on Professional</>
                  )}
                </Button>
              )}
            </Card>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Free resources open on the KICD website.{' '}
        <Link href="/pricing" className="underline underline-offset-2 hover:text-foreground">
          Upgrade to Professional
        </Link>{' '}
        to download all materials directly.
      </p>
    </div>
  )
}
