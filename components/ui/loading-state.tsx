import { Skeleton } from '@/components/ui/skeleton'

interface LoadingStateProps {
  /** Rows of skeleton blocks to show. Default 3. */
  rows?: number
  /** Optional title above skeletons. */
  title?: string
}

export function LoadingState({ rows = 3, title }: LoadingStateProps) {
  return (
    <div className="space-y-4 p-6">
      {title && (
        <p className="text-sm text-muted-foreground animate-pulse">{title}</p>
      )}
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    </div>
  )
}
