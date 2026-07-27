import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Reusable KPI display card for the operational dashboard.
 *
 * Designed for monetary/data emphasis — larger value, subtle label.
 * PEN values should be pre-formatted by the caller.
 */
export function KpiCard({
  label,
  value,
  subtitle,
  icon,
  emphasis = 'default',
}: {
  label: string
  value: string
  subtitle?: string
  icon?: ReactNode
  emphasis?: 'default' | 'positive' | 'negative' | 'neutral'
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p
              className={cn(
                'text-xl sm:text-2xl font-bold tracking-tight truncate tabular-nums',
                emphasis === 'positive' && 'text-green-600 dark:text-green-400',
                emphasis === 'negative' && 'text-red-600 dark:text-red-400',
                emphasis === 'neutral' && 'text-foreground',
                emphasis === 'default' && 'text-foreground',
              )}
            >
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className="shrink-0 text-muted-foreground/60">{icon}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
