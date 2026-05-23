'use client'

import { useState, useCallback } from 'react'
import { Wallet, Loader2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/shared/api/formatters'
import { settleSaleBalanceAction } from './sales-actions'

interface SaleSettlementButtonProps {
  saleId: string
  canSettleBalance: boolean
  pendingBalanceCents: number
}

/**
 * Client component: settlement confirmation button for a sale row.
 *
 * Only renders when canSettleBalance is true AND pendingBalanceCents > 0.
 * Opens an AlertDialog confirmation, calls the server action, and hides
 * after successful settlement.
 */
export function SaleSettlementButton({
  saleId,
  canSettleBalance,
  pendingBalanceCents,
}: SaleSettlementButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settled, setSettled] = useState(false)

  const handleConfirm = useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await settleSaleBalanceAction(saleId)

    setLoading(false)

    if (result.success) {
      setSettled(true)
      setOpen(false)
    } else {
      setError(result.error ?? 'Error al liquidar el saldo.')
    }
  }, [saleId])

  if (settled || !canSettleBalance || pendingBalanceCents <= 0) {
    return null
  }

  return (
    <>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={loading}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Liquidar saldo</span>
            <span className="text-xs ml-1">
              {formatCurrency(pendingBalanceCents)}
            </span>
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Liquidar saldo pendiente</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmás la liquidación de{' '}
              <span className="font-semibold">
                {formatCurrency(pendingBalanceCents)}
              </span>{' '}
              para esta venta? Esto registrará un movimiento de ingreso en la
              caja actual y marcará la venta como totalmente pagada.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {error && (
            <div
              className="p-3 rounded-md bg-destructive/10 text-destructive text-sm"
              role="alert"
            >
              {error}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Liquidando...
                </>
              ) : (
                'Sí, liquidar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
