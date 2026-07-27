'use client'

import { useState, useMemo } from 'react'
import { Plus, Package, Clock, Archive } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/shared/api/formatters'

import type { InventoryLotsResponse, InventoryLotRow } from '@/shared/api/schemas'
import { LotAdjustmentForm, type LotFormMode } from './lot-adjustment-form'

// ── Types ──────────────────────────────────────────────────────

export interface InventoryLotsViewProps {
  productId: string | undefined
  variantId: string | undefined
  data: InventoryLotsResponse
  canAdjust: boolean
}

interface ActiveForm {
  mode: LotFormMode
  lot: InventoryLotRow
}

// ── Domain vocabulary — Spanish operational terms ──────────────

const LOT_STATE = {
  INTACT: { label: 'Activo', icon: Package, bg: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', border: 'border-l-green-500' },
  HISTORICAL: { label: 'Histórico', icon: Clock, bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', border: 'border-l-amber-500' },
  EXHAUSTED: { label: 'Agotado', icon: Archive, bg: 'bg-muted text-muted-foreground', border: 'border-l-muted-foreground/30' },
} as const

/** Sort lots: INTACT first, then HISTORICAL, then EXHAUSTED */
const LOT_ORDER: Record<string, number> = { INTACT: 0, HISTORICAL: 1, EXHAUSTED: 2 }

// ── Helpers ────────────────────────────────────────────────────

function lotStateBadge(state: string) {
  const def = LOT_STATE[state as keyof typeof LOT_STATE] ?? { label: state, bg: 'bg-muted text-muted-foreground' }
  return (
    <Badge className={cn('text-xs', def.bg)}>
      {def.label}
    </Badge>
  )
}

function utilizationPercent(purchased: number, remaining: number): number {
  if (purchased === 0) return 0
  return Math.round((remaining / purchased) * 100)
}

function actionLabel(action: string): string {
  switch (action) {
    case 'edit':
      return 'Editar'
    case 'compensate':
      return 'Compensar'
    default:
      return ''
  }
}

// ── Component ──────────────────────────────────────────────────

export function InventoryLotsView({
  productId,
  data,
  canAdjust,
}: InventoryLotsViewProps) {
  const [activeForm, setActiveForm] = useState<ActiveForm | null>(null)

  function openForm(mode: LotFormMode, lot: InventoryLotRow) {
    setActiveForm({ mode, lot })
  }

  function closeForm() {
    setActiveForm(null)
  }

  if (data.variants.length === 0) {
    return null
  }

  return (
    <div className="space-y-6" data-testid="inventory-lots-view">
      {data.variants.map((variant) => {
        // Sort lots: intact first
        const sortedLots = useMemo(
          () => [...variant.lots].sort((a, b) => (LOT_ORDER[a.state] ?? 99) - (LOT_ORDER[b.state] ?? 99)),
          [variant.lots],
        )

        return (
          <Card key={variant.variantId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-mono">{variant.sku}</CardTitle>
                  <CardDescription>
                    {Object.entries(variant.attributes).length > 0
                      ? Object.entries(variant.attributes)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')
                      : 'Sin atributos'}{' '}
                    · Stock total:{' '}
                    <span className="font-medium tabular-nums text-foreground">
                      {variant.stock}
                    </span>
                  </CardDescription>
                </div>

                {canAdjust && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      openForm('increase', {
                        lotId: '',
                        variantId: variant.variantId,
                        productId: productId ?? '',
                        productName: '',
                        sku: variant.sku,
                        attributes: variant.attributes,
                        purchasedQuantity: 0,
                        remainingQuantity: 0,
                        unitCost: 0,
                        purchaseDate: '',
                        state: 'INTACT',
                        allowedAction: 'edit',
                      })
                    }
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Nuevo ingreso
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {/* Active form for this variant */}
              {activeForm &&
                activeForm.lot.variantId === variant.variantId && (
                  <div className="mb-4">
                    <LotAdjustmentForm
                      mode={activeForm.mode}
                      lot={activeForm.lot}
                      variantId={variant.variantId}
                      productId={productId ?? ''}
                      onClose={closeForm}
                    />
                  </div>
                )}

              {/* Lot rows */}
              <div className="space-y-2">
                {sortedLots.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    No hay lotes registrados para esta variante.
                  </p>
                ) : (
                  sortedLots.map((lot) => {
                    const stateDef = LOT_STATE[lot.state] ?? { border: '' }
                    const util = utilizationPercent(lot.purchasedQuantity, lot.remainingQuantity)

                    return (
                      <div
                        key={lot.lotId}
                        data-lot-row={lot.lotId}
                        className={cn(
                          'flex items-center justify-between rounded-lg border p-3 border-l-4',
                          stateDef.border,
                        )}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">
                              Lote {lot.lotId.slice(0, 8)}
                            </span>
                            {lotStateBadge(lot.state)}
                          </div>

                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <p>
                              Restante:{' '}
                              <span className="font-medium tabular-nums text-foreground">
                                {lot.remainingQuantity}
                              </span>
                              {' · '}
                              Comprado: {lot.purchasedQuantity}
                              {' · '}
                              Costo unit.: {formatPrice(lot.unitCost)}
                            </p>
                            {/* Stock utilization bar */}
                            {lot.purchasedQuantity > 0 && (
                              <div className="flex items-center gap-2 mt-1">
                                <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      'h-full rounded-full transition-all',
                                      util > 50 ? 'bg-green-500' : util > 0 ? 'bg-amber-500' : 'bg-red-500',
                                    )}
                                    style={{ width: `${Math.max(util, 2)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] tabular-nums shrink-0">{util}%</span>
                              </div>
                            )}
                            {lot.reasonHint && (
                              <p className="text-amber-600 dark:text-amber-400 italic text-[11px]">
                                {lot.reasonHint}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action button */}
                        {canAdjust && lot.allowedAction !== 'none' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0 ml-3"
                            onClick={() =>
                              openForm(
                                lot.allowedAction as LotFormMode,
                                lot,
                              )
                            }
                          >
                            {actionLabel(lot.allowedAction)}
                          </Button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
