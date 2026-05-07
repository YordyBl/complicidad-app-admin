'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  title?: string
  message?: string
  /** If provided, show a retry button that calls this function. */
  onRetry?: () => void
}

export function ErrorState({
  title = 'Error',
  message = 'Ocurrió un error inesperado. Intente nuevamente.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[30vh] text-center p-6">
      <AlertCircle className="w-12 h-12 text-destructive mb-4" />
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-6 gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </Button>
      )}
    </div>
  )
}
