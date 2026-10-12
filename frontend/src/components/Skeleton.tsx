export function PaperCardSkeleton() {
  return (
    <div className="h-full animate-pulse rounded-2xl border border-line bg-surface p-5 shadow-soft">
      <div className="h-1.5 w-full rounded bg-surface-2" />
      <div className="mt-4 flex items-start justify-between">
        <div className="h-11 w-11 rounded-xl bg-surface-2" />
        <div className="h-6 w-16 rounded-full bg-surface-2" />
      </div>
      <div className="mt-3 h-5 w-4/5 rounded bg-surface-2" />
      <div className="mt-2 h-4 w-3/5 rounded bg-surface-2" />
      <div className="mt-1.5 h-4 w-2/5 rounded bg-surface-2" />
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <div className="h-4 w-12 rounded bg-surface-2" />
        <div className="h-4 w-12 rounded bg-surface-2" />
        <div className="h-4 w-14 rounded bg-surface-2" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-9 flex-1 rounded-lg bg-surface-2" />
        <div className="h-9 flex-1 rounded-lg bg-surface-2" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <PaperCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-line bg-surface p-5 shadow-soft">
      <div className="h-4 w-24 rounded bg-surface-2" />
      <div className="mt-3 h-8 w-16 rounded bg-surface-2" />
      <div className="mt-2 h-3 w-32 rounded bg-surface-2" />
    </div>
  );
}
