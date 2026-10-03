import { Skeleton } from '@/components/ui/skeleton'

export default function CommunityLoading() {
  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-44 rounded" />
          <Skeleton className="h-3.5 w-32 rounded" />
        </div>
      </div>

      {/* Search + new post */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>

      {/* Post cards */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/40 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-3.5 w-full rounded" />
          <Skeleton className="h-3.5 w-2/3 rounded" />
          <div className="flex gap-4 pt-1">
            <Skeleton className="h-3.5 w-16 rounded" />
            <Skeleton className="h-3.5 w-16 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
