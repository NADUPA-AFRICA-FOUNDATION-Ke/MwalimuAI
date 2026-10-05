'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BackButton } from '@/components/back-button'
import { Download, BookOpen, Video, FileText, ExternalLink, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { RESOURCES } from '@/lib/resources-data'
import Link from 'next/link'

type Row = { id: string; title: string; description: string; type: string; size: string; tags: string[]; free: boolean; url: string | null; locked: boolean }

const ICONS: Record<string, typeof FileText> = { PDF: FileText, Video, Link: ExternalLink, Template: FileText, Audio: Video }

/** Staff manage the library in the admin console; until they publish a copy, the built-in list is shown. */
const BUILT_IN: Row[] = RESOURCES.map((r) => ({ ...r, id: String(r.id), locked: !r.free }))


export default function ResourcesPage() {
  const managed = useQuery(api.content.resources, {})
  const resources: Row[] = managed ?? BUILT_IN
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
          const Icon = ICONS[resource.type] ?? FileText
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
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-full px-2 py-0.5 shrink-0">
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
                <Button className="w-full gap-2 min-h-11" asChild>
                  <a href={resource.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    {resource.type === 'Video' ? 'Watch Resource' : 'Open Resource'}
                  </a>
                </Button>
              ) : resource.locked ? (
                <Button
                  className="w-full gap-2 min-h-11"
                  variant="outline"
                  onClick={() =>
                    toast.info('Professional plan required', {
                      description: 'Upgrade to Professional to download all resources.',
                      action: { label: 'View plans', onClick: () => window.location.href = '/pricing' },
                    })
                  }
                >
                  <Lock className="w-4 h-4" /> Unlock on Professional
                </Button>
              ) : (
                <Button className="w-full gap-2 min-h-11" variant="outline" disabled>
                  <Download className="w-4 h-4" /> Coming soon
                </Button>
              )}
            </Card>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Free resources open on the KICD website.{' '}
        <Link href="/pricing" className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-foreground">
          Upgrade to Professional
        </Link>{' '}
        to download all materials directly.
      </p>
    </div>
  )
}
