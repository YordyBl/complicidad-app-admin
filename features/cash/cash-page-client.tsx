'use client'

import { useState, useCallback, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import {
  Banknote,
  TrendingUp,
  ShoppingCart,
  Wallet,
  AlertTriangle,
  Plus,
  Lock,
} from 'lucide-react'

import type { CashBox, CashBoxSummary, CashMovementList } from '@/shared/api/cash'
import { formatCurrency, formatDate, formatDateTime } from '@/shared/api/formatters'
import {
  closeCashBoxAction,
  addMovementAction,
  getSummaryAction,
  getMovementsAction,
  openCashBoxAction,
} from './cash-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

// ── Movement type display ───────────────────────────────────────────

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  SALE_INCOME: 'Venta',
  SALE_SETTLEMENT_INCOME: 'Liquidación de venta',
  PURCHASE_OUTFLOW: 'Compra',
  RETURN_OUTFLOW: 'Devolución',
  MANUAL_ADJUSTMENT: 'Ajuste manual',
  WITHDRAWAL: 'Retiro',
}

function movementTypeLabel(type: string): string {
  return MOVEMENT_TYPE_LABELS[type] ?? type
}

function movementTypeColor(type: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (type) {
    case 'SALE_INCOME':
    case 'SALE_SETTLEMENT_INCOME':
      return 'default'
    case 'PURCHASE_OUTFLOW':
    case 'RETURN_OUTFLOW':
      return 'destructive'
    case 'MANUAL_ADJUSTMENT':
      return 'secondary'
    case 'WITHDRAWAL':
      return 'outline'
    default:
      return 'secondary'
  }
}

function parseSolesAmountToCents(value: string): number | null {
  const normalized = value.trim().replace(',', '.')

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null
  }

  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount <= 0) {
    return null
  }

  return Math.round(amount * 100)
}

// ── Props ───────────────────────────────────────────────────────────

export interface CashPageClientProps {
  currentBox: CashBox | null
  boxes: CashBox[]
  initialSelectedBoxId: string | null
  initialSummary: CashBoxSummary | null
  initialMovements: CashMovementList | null
  initialSummaryError?: string | null
  initialMovementsError?: string | null
  /** True when /cash-boxes/current returned 404 (valid: no caja today) */
  noCurrentBox: boolean
}

// ── Component ───────────────────────────────────────────────────────

export function CashPageClient({
  currentBox,
  boxes,
  initialSelectedBoxId,
  initialSummary,
  initialMovements,
  initialSummaryError,
  initialMovementsError,
  noCurrentBox,
}: CashPageClientProps) {
  const router = useRouter()
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(initialSelectedBoxId)
  const [summary, setSummary] = useState<CashBoxSummary | null>(initialSummary)
  const [movements, setMovements] = useState<CashMovementList | null>(initialMovements)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(initialSummaryError ?? null)
  const [movementsError, setMovementsError] = useState<string | null>(initialMovementsError ?? null)
  const [movementTypeFilter, setMovementTypeFilter] = useState('')

  // ── Mutation state ───────────────────────────────────────────────
  const [closingBox, setClosingBox] = useState(false)
  const [closeActionError, setCloseActionError] = useState<string | null>(null)
  const [closeSuccess, setCloseSuccess] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const [movementForm, setMovementForm] = useState<{ concept: string; amount: string; type: 'MANUAL_ADJUSTMENT' | 'WITHDRAWAL' }>({ concept: '', amount: '', type: 'MANUAL_ADJUSTMENT' })
  const [addingMovement, setAddingMovement] = useState(false)
  const [movementError, setMovementError] = useState<string | null>(null)
  const [movementSuccess, setMovementSuccess] = useState(false)

  const [openingBox, setOpeningBox] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)

  // ── Derived state ────────────────────────────────────────────────

  const selectedBox = boxes.find((b) => b.id === selectedBoxId) ?? null
  const selectedBoxData = summary
    ? { id: summary.cashBoxId, status: summary.status }
    : selectedBox
      ? { id: selectedBox.id, status: selectedBox.status }
      : null

  // canMutateCashBox: ID-based defensive guard — does NOT rely on isCurrent field alone
  const canMutateCashBox =
    selectedBoxData?.status === 'OPEN' &&
    selectedBoxData?.id === currentBox?.id &&
    (currentBox?.isCurrent !== false)

  // ── Selector handler ─────────────────────────────────────────────

  const handleSelectBox = useCallback(async (boxId: string) => {
    if (boxId === selectedBoxId) return
    setSelectedBoxId(boxId)
    setMovementTypeFilter('')
    setSummaryLoading(true)
    setSummaryError(null)
    setMovementsError(null)

    const [summaryResult, movementsResult] = await Promise.all([
      getSummaryAction(boxId),
      getMovementsAction(boxId),
    ])

    if (summaryResult.success && summaryResult.data) {
      setSummary(summaryResult.data)
    } else {
      setSummary(null)
      setSummaryError(summaryResult.error ?? 'Error al cargar resumen')
    }

    if (movementsResult.success && movementsResult.data) {
      setMovements(movementsResult.data)
    } else {
      setMovements(null)
      setMovementsError(movementsResult.error ?? 'Error al cargar movimientos')
    }

    setSummaryLoading(false)
    setCloseActionError(null)
    setMovementError(null)
    setShowCloseConfirm(false)
  }, [selectedBoxId])

  // ── Close caja handler ──────────────────────────────────────────

  const handleCloseCashBox = useCallback(async () => {
    setClosingBox(true)
    setCloseActionError(null)

    const fd = new FormData()
    const result = await closeCashBoxAction(null, fd)

    setClosingBox(false)
    if (result.success) {
      setShowCloseConfirm(false)
      // Full page refresh: closeCashBoxAction already calls revalidatePath('/cash'),
      // so router.refresh() re-fetches server props (boxes, currentBox, status).
      router.refresh()
    } else {
      setCloseActionError(result.error ?? 'Error al cerrar caja')
    }
  }, [router])

  // ── Add movement handler ────────────────────────────────────────

  const handleAddMovement = useCallback(async () => {
    const amountCents = parseSolesAmountToCents(movementForm.amount)
    if (amountCents === null) {
      setMovementError('Ingresá un monto mayor a 0 en soles.')
      return
    }

    setAddingMovement(true)
    setMovementError(null)

    const fd = new FormData()
    fd.set('concept', movementForm.concept)
    fd.set('amountCents', String(amountCents))
    fd.set('type', movementForm.type)
    const result = await addMovementAction(null, fd)

    setAddingMovement(false)
    if (result.success) {
      setMovementSuccess(true)
      setMovementForm({ concept: '', amount: '', type: 'MANUAL_ADJUSTMENT' })
      // Refresh movements and summary so cards update immediately
      if (selectedBoxId) {
        const [sResult, mResult] = await Promise.all([
          getSummaryAction(selectedBoxId),
          getMovementsAction(selectedBoxId, movementTypeFilter ? { type: movementTypeFilter } : undefined),
        ])
        if (sResult.success && sResult.data) {
          setSummary(sResult.data)
        }
        if (mResult.success && mResult.data) {
          setMovements(mResult.data)
        }
      }
      setTimeout(() => setMovementSuccess(false), 3000)
    } else {
      setMovementError(result.error ?? 'Error al agregar movimiento')
    }
  }, [movementForm, movementTypeFilter, selectedBoxId])

  // ── Open caja handler ───────────────────────────────────────────

  const handleOpenCashBox = useCallback(async () => {
    setOpeningBox(true)
    setOpenError(null)
    const result = await openCashBoxAction()
    setOpeningBox(false)
    if (!result.success) {
      setOpenError(result.error ?? 'Error al abrir caja')
      return
    }
    router.refresh()
  }, [])

  // ── Movements pagination ────────────────────────────────────────

  const handleMovementPage = useCallback(async (page: number) => {
    if (!selectedBoxId) return
    const mResult = await getMovementsAction(selectedBoxId, {
      page,
      pageSize: movements?.pageSize ?? 20,
      ...(movementTypeFilter ? { type: movementTypeFilter } : {}),
    })
    if (mResult.success && mResult.data) {
      setMovements(mResult.data)
    }
  }, [selectedBoxId, movements?.pageSize, movementTypeFilter])

  const handleMovementTypeFilter = useCallback(async (type: string) => {
    setMovementTypeFilter(type)
    if (!selectedBoxId) return

    setMovementsError(null)
    const mResult = await getMovementsAction(selectedBoxId, {
      page: 1,
      pageSize: movements?.pageSize ?? 20,
      ...(type ? { type } : {}),
    })

    if (mResult.success && mResult.data) {
      setMovements(mResult.data)
    } else {
      setMovements(null)
      setMovementsError(mResult.error ?? 'Error al cargar movimientos')
    }
  }, [selectedBoxId, movements?.pageSize])

  // ── Render: No boxes at all ──────────────────────────────────────

  if (boxes.length === 0 && noCurrentBox) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Caja Diaria</h1>
          <p className="text-muted-foreground">Gestión diaria de caja.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sin cajas registradas</CardTitle>
            <CardDescription>
              No hay cajas registradas todavía. Abrí una caja para comenzar el día.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {openError && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm mb-4" role="alert">
                {openError}
              </div>
            )}
            <Button onClick={handleOpenCashBox} disabled={openingBox} className="gap-2">
              <Plus className="w-4 h-4" />
              {openingBox ? 'Abriendo caja...' : 'Abrir caja hoy'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const detailContent = renderSelectedBoxDetail({
    selectedBoxId,
    selectedBox,
    selectedBoxData,
    canMutateCashBox,
    summary,
    movements,
    summaryLoading,
    summaryError,
    movementsError,
    closingBox,
    closeActionError,
    closeSuccess,
    showCloseConfirm,
    setShowCloseConfirm,
    setCloseActionError,
    handleCloseCashBox,
    movementForm,
    setMovementForm,
    addingMovement,
    movementError,
    movementSuccess,
    movementTypeFilter,
    handleAddMovement,
    handleMovementPage,
    handleMovementTypeFilter,
  })

  // ── Render: No current box, but historical boxes exist ───────────

  if (noCurrentBox && boxes.length > 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Caja Diaria</h1>
            <p className="text-muted-foreground">No hay caja abierta hoy.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleOpenCashBox} disabled={openingBox} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              {openingBox ? 'Abriendo...' : 'Abrir caja hoy'}
            </Button>
          </div>
        </div>

        {openError && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm" role="alert">
            {openError}
          </div>
        )}

        {renderSelectedBoxDetail({
          selectedBoxId,
          selectedBox,
          selectedBoxData,
          canMutateCashBox: false,
          summary,
          movements,
          summaryLoading,
          summaryError,
          movementsError,
          closingBox,
          closeActionError,
          closeSuccess,
          showCloseConfirm,
    setShowCloseConfirm,
    setCloseActionError,
    handleCloseCashBox,
          movementForm,
          setMovementForm,
          addingMovement,
          movementError,
            movementSuccess,
            movementTypeFilter,
            handleAddMovement,
            handleMovementPage,
            handleMovementTypeFilter,
          })}

        <CashBoxSelector
          boxes={boxes}
          selectedBoxId={selectedBoxId}
          onSelect={handleSelectBox}
        />
      </div>
    )
  }

  // ── Render: Current box exists ───────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Caja Diaria</h1>
          <p className="text-muted-foreground">
            {currentBox
              ? `Caja del ${formatDate(currentBox.businessDate)}`
              : 'Gestión diaria de caja.'}
          </p>
        </div>
      </div>

      {detailContent}

      <CashBoxSelector
        boxes={boxes}
        selectedBoxId={selectedBoxId}
        onSelect={handleSelectBox}
      />
    </div>
  )
}

// ── Selector ────────────────────────────────────────────────────────

function CashBoxSelector({
  boxes,
  selectedBoxId,
  onSelect,
}: {
  boxes: CashBox[]
  selectedBoxId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Seleccionar caja</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {boxes.map((box) => {
            const isSelected = box.id === selectedBoxId
            const isOpen = box.status === 'OPEN'
            return (
              <Button
                key={box.id}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSelect(box.id)}
                className="gap-2"
              >
                <span className="text-xs">
                  {formatDate(box.businessDate)}
                </span>
                <Badge variant={isOpen ? 'default' : 'secondary'} className="text-[10px] h-4 px-1">
                  {isOpen ? 'Abierta' : 'Cerrada'}
                </Badge>
                {box.isCurrent && (
                  <span className="text-[10px] text-muted-foreground">• actual</span>
                )}
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Detail renderer ─────────────────────────────────────────────────

interface DetailRenderParams {
  selectedBoxId: string | null
  selectedBox: CashBox | null
  selectedBoxData: { id: string; status: string } | null
  canMutateCashBox: boolean
  summary: CashBoxSummary | null
  movements: CashMovementList | null
  summaryLoading: boolean
  summaryError: string | null
  movementsError: string | null
  closingBox: boolean
  closeActionError: string | null
  closeSuccess: boolean
  showCloseConfirm: boolean
  setShowCloseConfirm: (v: boolean) => void
  setCloseActionError: (v: string | null) => void
  handleCloseCashBox: () => void
  movementForm: { concept: string; amount: string; type: 'MANUAL_ADJUSTMENT' | 'WITHDRAWAL' }
  setMovementForm: Dispatch<SetStateAction<{ concept: string; amount: string; type: 'MANUAL_ADJUSTMENT' | 'WITHDRAWAL' }>>
  addingMovement: boolean
  movementError: string | null
  movementSuccess: boolean
  movementTypeFilter: string
  handleAddMovement: () => void
  handleMovementPage: (page: number) => void
  handleMovementTypeFilter: (type: string) => void
}

function renderSelectedBoxDetail(params: DetailRenderParams) {
  const {
    selectedBoxId,
    selectedBox,
    selectedBoxData,
    canMutateCashBox,
    summary,
    movements,
    summaryLoading,
    summaryError,
    movementsError,
    closingBox,
    closeActionError,
    closeSuccess,
          showCloseConfirm,
          setShowCloseConfirm,
          setCloseActionError,
          handleCloseCashBox,
    movementForm,
    setMovementForm,
    addingMovement,
    movementError,
    movementSuccess,
    movementTypeFilter,
    handleAddMovement,
    handleMovementPage,
    handleMovementTypeFilter,
  } = params

  if (!selectedBoxId) {
    return (
      <EmptyState
        title="Seleccioná una caja"
        description="Elegí una caja del selector para ver su detalle."
      />
    )
  }

  const movementAmountCents = parseSolesAmountToCents(movementForm.amount)
  const movementAmountInvalid = movementForm.amount.length > 0 && movementAmountCents === null
  const canSubmitMovement = movementForm.concept.trim().length > 0 && movementAmountCents !== null && !addingMovement

  return (
    <div className="space-y-5">
      {/* ── Hero Balance + Summary ──────────────────────────────── */}
      {summaryLoading ? (
        <div className="space-y-4">
          {/* Balance skeleton */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex flex-col lg:flex-row">
              <div className="flex-1 p-6 space-y-3">
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                <div className="h-10 w-48 bg-muted animate-pulse rounded" />
                <div className="h-3 w-32 bg-muted animate-pulse rounded" />
              </div>
              <div className="px-6 pb-6 lg:p-5 lg:w-64 space-y-3">
                <div className="h-5 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
          {/* KPI skeletons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-card p-3.5 space-y-2">
                <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                <div className="h-5 w-20 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : summaryError ? (
        <div className="space-y-4">
          {/* Show box context from selectedBox even on summary error */}
          {selectedBox && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="flex flex-col lg:flex-row">
                <div className="flex-1 p-5 sm:p-6">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Saldo actual
                  </p>
                  <p className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums mt-1 text-muted-foreground">
                    —
                  </p>
                </div>
                <div className="px-5 pb-5 sm:px-6 sm:pb-6 lg:p-5 lg:w-64 lg:shrink-0 flex flex-col justify-center gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedBox.status === 'OPEN' ? 'default' : 'secondary'} className="text-xs">
                      {selectedBox.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
                    </Badge>
                    {selectedBox.isCurrent && (
                      <span className="text-xs text-muted-foreground">Actual</span>
                    )}
                  </div>
                  <p className="text-sm font-medium">
                    Caja del {formatDate(selectedBox.businessDate)}
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm" role="alert">
            {summaryError}
          </div>
        </div>
      ) : summary ? (
        <div className="space-y-4">
          <BalanceHero
            balanceCents={summary.currentBalanceCents}
            openingBalanceCents={summary.openingBalanceCents}
            status={selectedBox?.status ?? summary.status}
            businessDate={selectedBox?.businessDate ?? summary.businessDate}
            isCurrent={selectedBox?.isCurrent ?? false}
            closedAt={selectedBox?.closedAt}
          />
          <SummaryKpiRow summary={summary} />
        </div>
      ) : selectedBox ? (
        /* Box selected but summary not yet loaded — show context without balance */
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            <div className="flex-1 p-5 sm:p-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Saldo actual
              </p>
              <p className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums mt-1 text-muted-foreground">
                —
              </p>
            </div>
            <div className="px-5 pb-5 sm:px-6 sm:pb-6 lg:p-5 lg:w-64 lg:shrink-0 flex flex-col justify-center gap-2">
              <div className="flex items-center gap-2">
                <Badge variant={selectedBox.status === 'OPEN' ? 'default' : 'secondary'} className="text-xs">
                  {selectedBox.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
                </Badge>
                {selectedBox.isCurrent && (
                  <span className="text-xs text-muted-foreground">Actual</span>
                )}
              </div>
              <p className="text-sm font-medium">
                Caja del {formatDate(selectedBox.businessDate)}
              </p>
              {selectedBox.status === 'CLOSED' && selectedBox.closedAt && (
                <p className="text-xs text-muted-foreground">
                  Cerrada el {formatDateTime(selectedBox.closedAt)}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Mutable Actions (only for current open caja) ──────────── */}
      {canMutateCashBox && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ── Close caja ─────────────────────────────────────── */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium">Cerrar caja</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  El balance se calcula automáticamente. Irreversible.
                </p>
              </div>
              {!showCloseConfirm && !closeSuccess && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setShowCloseConfirm(true)
                    setCloseActionError(null)
                  }}
                  disabled={closingBox}
                  className="gap-1.5 shrink-0"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Cerrar caja
                </Button>
              )}
            </div>

            {closeActionError && (
              <div className="mt-3 p-2.5 rounded-md bg-destructive/10 text-destructive text-xs" role="alert">
                {closeActionError}
              </div>
            )}

            {closeSuccess && (
              <div className="mt-3 p-2.5 rounded-md bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 text-xs">
                Caja cerrada exitosamente.
              </div>
            )}

            {showCloseConfirm && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                        ¿Confirmar cierre de caja?
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                        El servidor calculará el balance final con los movimientos
                        del día. Esta acción no se puede deshacer.
                      </p>
                    </div>
                  </div>
                </div>
                {summary && (
                  <div className="rounded-md border bg-muted/20 px-3 py-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Saldo actual a cerrar
                    </p>
                    <p className="text-base font-semibold tabular-nums">
                      {formatCurrency(summary.currentBalanceCents)}
                    </p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleCloseCashBox}
                    disabled={closingBox}
                    className="gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {closingBox ? 'Cerrando...' : 'Sí, cerrar caja'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCloseConfirm(false)
                      setCloseActionError(null)
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Manual movement ─────────────────────────────────── */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-medium">Movimiento manual</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ajuste manual o retiro en la caja actual.
            </p>

            {movementError && (
              <div className="mt-3 p-2.5 rounded-md bg-destructive/10 text-destructive text-xs" role="alert">
                {movementError}
              </div>
            )}

            {movementSuccess && (
              <div className="mt-3 p-2.5 rounded-md bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 text-xs">
                Movimiento registrado exitosamente.
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="movement-concept" className="text-xs">
                  Concepto
                </Label>
                <Input
                  id="movement-concept"
                  placeholder="Ej: Pago de servicios"
                  value={movementForm.concept}
                  onChange={(e) =>
                    setMovementForm({ ...movementForm, concept: e.target.value })
                  }
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="movement-amount" className="text-xs">
                  Monto (soles)
                </Label>
                <Input
                  id="movement-amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  placeholder="Ej: 500.00"
                  value={movementForm.amount}
                  onChange={(e) =>
                    setMovementForm({ ...movementForm, amount: e.target.value })
                  }
                  className="h-9 text-sm"
                />
                {movementAmountInvalid && (
                  <p className="text-xs text-destructive">
                    Ingresá un monto mayor a 0 en soles.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="movement-type" className="text-xs">
                  Tipo
                </Label>
                <select
                  id="movement-type"
                  value={movementForm.type}
                  onChange={(e) =>
                    setMovementForm({
                      ...movementForm,
                      type: e.target.value as 'MANUAL_ADJUSTMENT' | 'WITHDRAWAL',
                    })
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="MANUAL_ADJUSTMENT">Ajuste manual</option>
                  <option value="WITHDRAWAL">Retiro</option>
                </select>
                <p className="text-[10px] text-muted-foreground">
                  El tipo define si suma o resta. Ingresá siempre un monto positivo.
                </p>
              </div>
              <Button
                onClick={handleAddMovement}
                disabled={!canSubmitMovement}
                size="sm"
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                {addingMovement ? 'Registrando...' : 'Registrar movimiento'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Read-only indicator for closed/historical */}
      {selectedBoxData && !canMutateCashBox && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="w-4 h-4 shrink-0" />
          {selectedBoxData.status === 'CLOSED'
            ? 'Esta caja está cerrada. Solo lectura.'
            : 'Acciones disponibles solo para la caja actual abierta.'}
        </div>
      )}

      {/* ── Movement History ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Banknote className="w-5 h-5" />
              Historial de movimientos
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="movement-type-filter" className="text-xs text-muted-foreground">
                Filtrar por tipo
              </Label>
              <select
                id="movement-type-filter"
                value={movementTypeFilter}
                onChange={(event) => handleMovementTypeFilter(event.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Todos</option>
                <option value="SALE_INCOME">Venta</option>
                <option value="SALE_SETTLEMENT_INCOME">Liquidación de venta</option>
                <option value="PURCHASE_OUTFLOW">Compra</option>
                <option value="RETURN_OUTFLOW">Devolución</option>
                <option value="MANUAL_ADJUSTMENT">Ajuste manual</option>
                <option value="WITHDRAWAL">Retiro</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {movementsError ? (
            <div className="p-4">
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm" role="alert">
                {movementsError}
              </div>
            </div>
          ) : !movements ? (
            <div className="p-4">
              <LoadingState rows={3} title="Cargando movimientos..." />
            </div>
          ) : movements.entries.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Sin movimientos"
                description="No se encontraron movimientos para esta caja."
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-3 px-4 font-medium">Concepto</th>
                      <th className="text-left py-3 px-4 font-medium">Tipo</th>
                      <th className="text-right py-3 px-4 font-medium">Monto</th>
                      <th className="text-right py-3 px-4 font-medium">Ganancia</th>
                      <th className="text-right py-3 px-4 font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.entries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm">
                          {entry.concept ?? '—'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={movementTypeColor(entry.type)} className="text-xs">
                            {movementTypeLabel(entry.type)}
                          </Badge>
                        </td>
                        <td className={`py-3 px-4 text-sm text-right font-medium ${entry.amountCents >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(entry.amountCents)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium">
                          {entry.type === 'SALE_INCOME' && entry.profitCents !== null
                            ? formatCurrency(entry.profitCents)
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-xs text-right text-muted-foreground">
                          {formatDateTime(entry.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {movements.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Página {movements.page} de {movements.totalPages} ({movements.total} movimientos)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={movements.page <= 1}
                      onClick={() => handleMovementPage(movements.page - 1)}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={movements.page >= movements.totalPages}
                      onClick={() => handleMovementPage(movements.page + 1)}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Balance Hero ────────────────────────────────────────────────────
// Dominant monetary anchor for the cash page. Mirrors the operational
// emphasis pattern established in the dashboard KPI area.

function BalanceHero({
  balanceCents,
  openingBalanceCents,
  status,
  businessDate,
  isCurrent,
  closedAt,
}: {
  balanceCents: number
  openingBalanceCents: number
  status: string
  businessDate: string
  isCurrent?: boolean
  closedAt?: string | null
}) {
  const isOpen = status === 'OPEN'

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex flex-col lg:flex-row">
        {/* Left: Balance dominant — takes most space */}
        <div className="flex-1 p-5 sm:p-6 lg:border-r border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Saldo actual
          </p>
          <p
            className={cn(
              'text-3xl sm:text-4xl font-bold tracking-tight tabular-nums mt-1',
              balanceCents > 0 && 'text-green-700 dark:text-green-400',
              balanceCents < 0 && 'text-red-700 dark:text-red-400',
              balanceCents === 0 && 'text-foreground',
            )}
          >
            {formatCurrency(balanceCents)}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Saldo inicial: {formatCurrency(openingBalanceCents)}
          </p>
        </div>

        {/* Right: Context & status — narrow column */}
        <div className="px-5 pb-5 sm:px-6 sm:pb-6 lg:p-5 lg:w-64 lg:shrink-0 flex flex-col justify-center gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={isOpen ? 'default' : 'secondary'} className="text-xs">
              {isOpen ? 'Abierta' : 'Cerrada'}
            </Badge>
            {isCurrent && (
              <span className="text-xs text-muted-foreground">Actual</span>
            )}
          </div>
          <p className="text-sm font-medium">
            Caja del {formatDate(businessDate)}
          </p>
          {!isOpen && closedAt && (
            <p className="text-xs text-muted-foreground">
              Cerrada el {formatDateTime(closedAt)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Summary KPI Row ──────────────────────────────────────────────────
// Compact metric cards styled after the dashboard KPI pattern.

function SummaryKpiRow({ summary }: { summary: CashBoxSummary }) {
  const kpis: Array<{
    label: string
    value: number
    tone: 'positive' | 'negative' | 'neutral'
    icon: ReactNode
  }> = [
    { label: 'Ventas brutas', value: summary.grossSalesCents, tone: 'positive', icon: <TrendingUp className="w-4 h-4" /> },
    { label: 'Compras', value: summary.purchaseOutflowCents, tone: 'negative', icon: <ShoppingCart className="w-4 h-4" /> },
    { label: 'Devoluciones', value: summary.returnOutflowCents, tone: 'negative', icon: <ShoppingCart className="w-4 h-4" /> },
    { label: 'Ingresos', value: summary.manualAdjustmentsCents, tone: summary.manualAdjustmentsCents >= 0 ? 'positive' : 'negative', icon: <Banknote className="w-4 h-4" /> },
    { label: 'Retiros', value: summary.withdrawalsCents, tone: 'negative', icon: <Wallet className="w-4 h-4" /> },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="rounded-lg border bg-card p-3.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            {kpi.icon}
            <span>{kpi.label}</span>
          </div>
          <p
            className={cn(
              'text-sm font-semibold tabular-nums',
              kpi.tone === 'positive' && 'text-green-600 dark:text-green-400',
              kpi.tone === 'negative' && 'text-red-600 dark:text-red-400',
              kpi.tone === 'neutral' && 'text-foreground',
            )}
          >
            {formatCurrency(kpi.value)}
          </p>
        </div>
      ))}
    </div>
  )
}
