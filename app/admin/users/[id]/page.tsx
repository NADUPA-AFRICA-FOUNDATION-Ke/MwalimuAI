'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { ChevronLeft } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fmtTime, Loading, PageHeader, ReasonDialog, StatusPill, useRun, useStaff } from '@/components/admin/common'
import { HistoryTab } from '@/components/admin/user/history-tab'
import { LearningTab } from '@/components/admin/user/learning-tab'
import { ProfileTab } from '@/components/admin/user/profile-tab'
import { SecurityTab } from '@/components/admin/user/security-tab'
import { StreakTab } from '@/components/admin/user/streak-tab'

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const profileId = id as Id<'profiles'>
  const data = useQuery(api.admin.users.get, { profileId })
  const { can } = useStaff()
  const setStatus = useMutation(api.admin.users.setStatus)
  const { run } = useRun()
  const [statusDialog, setStatusDialog] = useState<null | 'suspended' | 'active'>(null)

  if (data === undefined) return <Loading />
  const { profile } = data
  const suspended = profile.status !== 'active'

  return (
    <>
      <Link
        href="/admin/users"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        All users
      </Link>
      <PageHeader
        title={profile.name || 'Unnamed user'}
        description={`${profile.email ?? 'No email'} · joined ${fmtTime(profile.createdAt)}${profile.migrated ? ' · migrated account' : ''}`}
        actions={
          <>
            <StatusPill status={profile.status} />
            {can('accounts.suspend') &&
              (suspended ? (
                <Button size="sm" variant="outline" onClick={() => setStatusDialog('active')}>
                  Reactivate
                </Button>
              ) : (
                <Button size="sm" variant="destructive" onClick={() => setStatusDialog('suspended')}>
                  Suspend
                </Button>
              ))}
          </>
        }
      />
      {suspended && profile.statusReason && (
        <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Suspended on {fmtTime(profile.statusChangedAt)}: {profile.statusReason}
        </p>
      )}

      <Tabs defaultValue="streak">
        <TabsList className="mb-4 flex w-full flex-wrap justify-start gap-1 h-auto">
          <TabsTrigger value="streak">Streak</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="streak">
          <StreakTab profileId={profileId} />
        </TabsContent>
        <TabsContent value="profile">
          <ProfileTab profileId={profileId} profile={profile} />
        </TabsContent>
        <TabsContent value="learning">
          <LearningTab data={data} />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab profileId={profileId} email={profile.email} />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab profileId={profileId} />
        </TabsContent>
      </Tabs>

      <ReasonDialog
        open={statusDialog !== null}
        onOpenChange={(o) => !o && setStatusDialog(null)}
        title={statusDialog === 'suspended' ? 'Suspend this account?' : 'Reactivate this account?'}
        description={
          statusDialog === 'suspended'
            ? 'They will be signed out everywhere and blocked from the app until reactivated. Nothing is deleted.'
            : 'They will be able to sign in again.'
        }
        confirmLabel={statusDialog === 'suspended' ? 'Suspend account' : 'Reactivate'}
        destructive={statusDialog === 'suspended'}
        onConfirm={async (reason) => {
          const r = await run(
            () => setStatus({ profileId, status: statusDialog!, reason }),
            statusDialog === 'suspended' ? 'Account suspended' : 'Account reactivated',
          )
          return r !== undefined
        }}
      />
    </>
  )
}
