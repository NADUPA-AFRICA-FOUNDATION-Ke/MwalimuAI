'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMutation } from 'convex/react'
import { ArrowLeft, Download } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { RecordView, downloadProfile, type TeacherRecord } from '@/components/school/record-view'
import { errorMessage } from '@/lib/support'

export default function TeacherRecordPage() {
  const { profileId } = useParams<{ profileId: string }>()
  const open = useMutation(api.teacherRecord.openTeacher)
  const [record, setRecord] = useState<TeacherRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Opening is a mutation so the view is logged; the teacher sees it in "Who has viewed your record".
  useEffect(() => { void open({ profileId: profileId as Id<'profiles'> }).then(setRecord).catch((e) => setError(errorMessage(e, 'Could not open this record.'))) }, [open, profileId])
  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/dashboard/school" className="inline-flex min-h-11 items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" />My school</Link>
      {error ? <p role="alert" className="rounded-2xl border border-destructive bg-destructive/5 p-4 text-sm text-destructive">{error}</p>
        : !record ? <p role="status" className="text-sm text-muted-foreground">Loading…</p> : (
          <>
            <header className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-2xl font-bold">{record.name}</h1>
              <Button variant="outline" className="min-h-11 gap-2" onClick={() => downloadProfile(record)}><Download className="h-4 w-4" aria-hidden="true" />PDF</Button></header>
            <p className="text-xs text-muted-foreground">The teacher can see that you opened their record.</p>
            <RecordView record={record} />
          </>
        )}
    </div>
  )
}
