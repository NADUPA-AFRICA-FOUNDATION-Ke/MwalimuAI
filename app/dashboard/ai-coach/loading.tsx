import { Skeleton } from '@/components/ui/skeleton'

export default function AICoachLoading() {
  return (
    <div className="flex flex-col -mx-4 -mt-4 md:-mx-6 md:-mt-6 app-fill">
      {/* Nav bar */}
      <div className="px-4 md:px-8 pt-4 pb-2 shrink-0 flex items-center justify-between">
        <Skeleton className="h-8 w-28 rounded-xl" />
        <Skeleton className="h-5 w-24 rounded" />
      </div>

      {/* Empty state placeholder */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-4">
        <Skeleton className="w-16 h-16 rounded-2xl" />
        <Skeleton className="h-7 w-36 rounded" />
        <Skeleton className="h-4 w-72 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl mt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-border/50 px-4 md:px-8 py-4 pb-20 md:pb-4">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Skeleton className="flex-1 h-10 rounded-xl" />
          <Skeleton className="w-20 h-10 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
