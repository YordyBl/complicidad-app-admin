'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import {
  increaseInventoryLotAction,
  editInventoryLotAction,
  compensateInventoryLotAction,
  type InventoryActionState,
} from '@/features/inventory/inventory-actions'

import type { InventoryLotRow } from '@/shared/api/schemas'

// ── Types ──────────────────────────────────────────────────────

export type LotFormMode = 'increase' | 'edit' | 'compensate'

export interface LotAdjustmentFormProps {
  mode: LotFormMode
  lot: InventoryLotRow
  variantId: string
  productId: string
  onClose: () => void
}

// ── Mode-specific copy ─────────────────────────────────────────

const STATE_LABELS: Record<string, string> = {
  INTACT: 'Activo',
  HISTORICAL: 'Histórico',
  EXHAUSTED: 'Agotado',
}

const MODE_LABELS: Record<LotFormMode, { title: string; intent: string; stockEffect: string }> = {
  increase: {
    title: 'Nuevo ingreso de stock',
    intent: 'Estás por agregar stock a un nuevo lote',
    stockEffect: 'El stock será incrementado en la cantidad especificada.',
  },
  edit: {
    title: 'Editar lote existente',
    intent: 'Estás editando los datos de un lote intacto.',
    stockEffect: 'Los cambios se aplican directamente al lote seleccionado.',
  },
  compensate: {
    title: 'Compensación histórica',
    intent: 'Estás creando una corrección compensatoria sobre un lote histórico.',
    stockEffect: 'Se registrará un ajuste compensatorio que corrige el stock sin modificar el lote original.',
  },
}

// ── Component ──────────────────────────────────────────────────

export function LotAdjustmentForm({
  mode,
  lot,
  variantId,
  productId,
  onClose,
}: LotAdjustmentFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [state, setState] = useState<InventoryActionState | null>(null)

  // Controlled form values — preserved across submissions
  const [quantity, setQuantity] = useState(
    mode === 'edit' ? String(lot.purchasedQuantity) : '',
  )
  const [unitCost, setUnitCost] = useState(
    mode === 'edit' ? String(lot.unitCost) : '',
  )
  const [reason, setReason] = useState('')

  const { title, intent, stockEffect } = MODE_LABELS[mode]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState(null)

    const formData = new FormData()
    formData.set('variantId', variantId)
    formData.set('productId', productId)

    if (mode === 'compensate') {
      formData.set('quantityDelta', quantity)
    } else {
      formData.set('quantity', quantity)
    }
    if (unitCost) formData.set('unitCost', unitCost)
    if (reason) formData.set('reason', reason)

    let result: InventoryActionState

    startTransition(async () => {
      if (mode === 'increase') {
        result = await increaseInventoryLotAction(null, formData)
      } else if (mode === 'edit') {
        result = await editInventoryLotAction(null, formData, lot.lotId)
      } else {
        result = await compensateInventoryLotAction(null, formData, lot.lotId)
      }

      setState(result)

      if (result.success) {
        // Refresh server data so the parent view re-fetches lots
        router.refresh()
        // Close after brief success display
        setTimeout(onClose, 0)
      }
    })
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} type="button">
            ✕
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Intent description */}
        <p className="text-sm text-muted-foreground mb-4">{intent}</p>

        {/* Lot identity context */}
        <div className="flex items-center gap-2 mb-4 text-xs">
          <span className="font-mono font-medium">{lot.sku}</span>
          {Object.entries(lot.attributes).map(([k, v]) => (
            <Badge key={k} variant="secondary" className="text-[10px]">
              {k}: {v}
            </Badge>
          ))}
          <Badge
            className={cn(
              'text-[10px]',
              lot.state === 'INTACT' && 'bg-green-100 text-green-700',
              lot.state === 'HISTORICAL' && 'bg-amber-100 text-amber-700',
              lot.state === 'EXHAUSTED' && 'bg-muted text-muted-foreground',
            )}
          >
            {STATE_LABELS[lot.state] ?? lot.state}
          </Badge>
        </div>

        {/* Reason hint from backend */}
        {lot.reasonHint && (
          <p className="text-xs text-amber-600 dark:text-amber-400 italic mb-3">
            {lot.reasonHint}
          </p>
        )}

        {/* Stock effect summary */}
        <p className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-3 mb-4">
          {stockEffect}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'compensate' ? (
            <div className="space-y-1.5">
              <Label htmlFor={`qty-${lot.lotId}`}>
                Diferencia de cantidad <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`qty-${lot.lotId}`}
                type="number"
                step="1"
                placeholder="Ej: -5 o +10"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor={`qty-${lot.lotId}`}>
                Cantidad
                {mode === 'edit' ? '' : <span className="text-destructive"> *</span>}
              </Label>
              <Input
                id={`qty-${lot.lotId}`}
                type="number"
                step="1"
                min={mode === 'edit' ? '0' : '1'}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={mode === 'edit' ? undefined : 'Cantidad'}
                required={mode !== 'edit'}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor={`cost-${lot.lotId}`}>Costo unitario</Label>
            <Input
              id={`cost-${lot.lotId}`}
              type="number"
              step="0.01"
              min="0"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`reason-${lot.lotId}`}>
              Motivo
              {mode === 'compensate' && <span className="text-destructive"> *</span>}
            </Label>
            <Input
              id={`reason-${lot.lotId}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={mode === 'compensate' ? 'Motivo de la compensación' : 'Opcional'}
              required={mode === 'compensate'}
            />
          </div>

          {/* Backend error */}
          {state && !state.success && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <span className="text-destructive">{state.error}</span>
            </div>
          )}

          {/* Success */}
          {state && state.success && (
            <div className="rounded-md bg-green-50 dark:bg-green-950/30 p-3 text-sm text-green-700 dark:text-green-400">
              ✓ Ajuste registrado correctamente.
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" disabled={isPending} size="sm">
              {isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {mode === 'increase' && 'Confirmar ingreso'}
              {mode === 'edit' && 'Guardar cambios'}
              {mode === 'compensate' && 'Registrar compensación'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
