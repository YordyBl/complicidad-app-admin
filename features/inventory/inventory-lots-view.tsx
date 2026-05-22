'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

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

// ── Helpers ────────────────────────────────────────────────────

function lotStateBadge(state: string) {
  const colors: Record<string, string> = {
    INTACT: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    HISTORICAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    EXHAUSTED: 'bg-muted text-muted-foreground',
  }
  return (
    <Badge className={cn('text-xs', colors[state] ?? 'bg-muted text-muted-foreground')}>
      {state}
    </Badge>
  )
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
      {data.variants.map((variant) => (
        <Card key={variant.variantId}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{variant.sku}</CardTitle>
                <CardDescription>
                  {Object.entries(variant.attributes).length > 0
                    ? Object.entries(variant.attributes)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' · ')
                    : 'Sin atributos'}{' '}
                  · Stock total: {variant.stock}
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
              {variant.lots.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No hay lotes registrados para esta variante.
                </p>
              ) : (
                variant.lots.map((lot) => (
                  <div
                    key={lot.lotId}
                    data-lot-row={lot.lotId}
                    className="flex items-center justify-between rounded-lg border p-3"
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
                          Comprado: {lot.purchasedQuantity} · Restante:{' '}
                          {lot.remainingQuantity} · Costo unit.:{' '}
                          {formatPrice(lot.unitCost)}
                        </p>
                        {lot.reasonHint && (
                          <p className="text-amber-600 dark:text-amber-400 italic">
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
                ))
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
