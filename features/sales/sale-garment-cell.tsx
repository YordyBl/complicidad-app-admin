'use client'

import { useState, useId } from 'react'
import { ChevronDown } from 'lucide-react'

import type { SaleListItemDisplay } from '@/shared/api/schemas'
import { cn } from '@/lib/utils'

interface GarmentCellProps {
  items: SaleListItemDisplay[]
}

/**
 * Renders garment item details in the Ventas list.
 *
 * - 0 items → "—"
 * - 1 item  → displayLabel + variant attributes inline
 * - 2+ items → clickable toggle showing count, expands to full detail table
 */
export function GarmentCell({ items }: GarmentCellProps) {
  const [expanded, setExpanded] = useState(false)
  const panelId = useId()

  if (items.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>
  }

  if (items.length === 1) {
    return <SingleItem item={items[0]} />
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        aria-label={`${items.length} prendas`}
        aria-expanded={expanded}
        aria-controls={panelId}
      >
        <span>{items.length} prendas</span>
        <ChevronDown
          className={cn(
            'h-3 w-3 transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {expanded && (
        <div
          id={panelId}
          role="region"
          aria-label="Detalle de prendas"
          className="mt-2 border rounded-md bg-muted/30 p-2"
        >
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-1 font-medium">Prenda</th>
                <th className="pb-1 font-medium hidden sm:table-cell">Detalles</th>
                <th className="pb-1 font-medium text-right">Cant.</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.lineId} className="border-b last:border-0">
                  <td className="py-1 pr-2 font-medium">
                    {item.displayLabel}
                  </td>
                  <td className="py-1 hidden sm:table-cell">
                    {renderAttributes(item.attributes)}
                  </td>
                  <td className="py-1 text-right tabular-nums">
                    {item.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────

function SingleItem({ item }: { item: SaleListItemDisplay }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-medium">{item.displayLabel}</span>
      {Object.keys(item.attributes).length > 0 && (
        <span className="text-xs text-muted-foreground">
          {renderAttributes(item.attributes)}
        </span>
      )}
      <span className="text-xs text-muted-foreground">
        Cant: {item.quantity}
      </span>
    </div>
  )
}

function renderAttributes(attrs: Record<string, string>): string {
  const entries = Object.entries(attrs)
  if (entries.length === 0) return '—'
  return entries.map(([k, v]) => `${k}: ${v}`).join(' · ')
}
