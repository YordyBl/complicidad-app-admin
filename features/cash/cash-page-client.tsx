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

// ── Movement type display ───────────────────────────────────────────

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  SALE_INCOME: 'Venta',
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
  const [closeBalance, setCloseBalance] = useState('')

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
    fd.set('finalBalanceCents', closeBalance)
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
  }, [closeBalance, router])

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
    closeBalance,
    setCloseBalance,
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
          closeBalance,
          setCloseBalance,
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
  closeBalance: string
  setCloseBalance: (v: string) => void
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
    closeBalance,
    setCloseBalance,
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
    <div className="space-y-6">
      {/* ── Caja status info ──────────────────────────────────────── */}
      {selectedBox && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Caja del {formatDate(selectedBox.businessDate)}
            </CardTitle>
            <CardDescription>
              <Badge variant={selectedBox.status === 'OPEN' ? 'default' : 'secondary'}>
                {selectedBox.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
              </Badge>
              {selectedBox.isCurrent && (
                <span className="ml-2 text-xs text-muted-foreground">Caja actual</span>
              )}
              {selectedBox.status === 'CLOSED' && selectedBox.closedAt && (
                <span className="ml-2 text-xs text-muted-foreground">
                  Cerrada el {formatDateTime(selectedBox.closedAt)}
                </span>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* ── Summary Cards ─────────────────────────────────────────── */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Cargando...</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-6 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : summaryError ? (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm" role="alert">
          {summaryError}
        </div>
      ) : summary ? (
        <SummaryMetricsPanel summary={summary} />
      ) : null}

      {/* ── Mutable Actions (only for current open caja) ──────────── */}
      {canMutateCashBox && (
        <div className="space-y-4">
          {/* Close caja */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cerrar caja</CardTitle>
              <CardDescription>
                Registrá el cierre de la caja actual con el balance final. Esta acción no se puede
                deshacer y la caja no podrá reabrirse hasta el día siguiente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {closeActionError && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm mb-4" role="alert">
                  {closeActionError}
                </div>
              )}
              {closeSuccess ? (
                <div className="p-3 rounded-md bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 text-sm">
                  Caja cerrada exitosamente.
                </div>
              ) : showCloseConfirm ? (
                <div className="space-y-4">
                  <div className="border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          ¿Confirmar cierre de caja?
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                          Esta acción es irreversible. La caja quedará cerrada y no podrá reabrirse
                          hasta mañana. Verificá que el balance final sea correcto.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="close-balance">Balance final (centavos)</Label>
                    <Input
                      id="close-balance"
                      type="number"
                      placeholder="Ej: 150000"
                      value={closeBalance}
                      onChange={(e) => setCloseBalance(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      onClick={handleCloseCashBox}
                      disabled={closingBox || !closeBalance}
                      className="gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      {closingBox ? 'Cerrando...' : 'Sí, cerrar caja'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCloseConfirm(false)
                        setCloseActionError(null)
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="default"
                  onClick={() => {
                    setShowCloseConfirm(true)
                    setCloseActionError(null)
                  }}
                  disabled={closingBox}
                  className="gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Cerrar caja
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Manual movement */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Movimiento manual</CardTitle>
              <CardDescription>
                Registrá un ajuste manual o retiro en la caja actual.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {movementError && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm mb-4" role="alert">
                  {movementError}
                </div>
              )}
              {movementSuccess && (
                <div className="p-3 rounded-md bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 text-sm mb-4">
                  Movimiento registrado exitosamente.
                </div>
              )}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="movement-concept">Concepto</Label>
                  <Input
                    id="movement-concept"
                    placeholder="Ej: Pago de servicios"
                    value={movementForm.concept}
                    onChange={(e) => setMovementForm({ ...movementForm, concept: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="movement-amount">Monto (soles)</Label>
                  <Input
                    id="movement-amount"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    placeholder="Ej: 500.00"
                    value={movementForm.amount}
                    onChange={(e) => setMovementForm({ ...movementForm, amount: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ingresá siempre un monto positivo. El tipo de movimiento define si suma o resta.
                  </p>
                  {movementAmountInvalid && (
                    <p className="text-xs text-destructive">Ingresá un monto mayor a 0 en soles.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="movement-type">Tipo</Label>
                  <select
                    id="movement-type"
                    value={movementForm.type}
                    onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value as 'MANUAL_ADJUSTMENT' | 'WITHDRAWAL' })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="MANUAL_ADJUSTMENT">Ajuste manual</option>
                    <option value="WITHDRAWAL">Retiro</option>
                  </select>
                </div>
                <Button
                  onClick={handleAddMovement}
                  disabled={!canSubmitMovement}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {addingMovement ? 'Registrando...' : 'Registrar movimiento'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Read-only indicator for closed/historical */}
      {selectedBoxData && !canMutateCashBox && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="w-4 h-4" />
              {selectedBoxData.status === 'CLOSED'
                ? 'Esta caja está cerrada. Solo lectura.'
                : 'Acciones disponibles solo para la caja actual abierta.'}
            </div>
          </CardContent>
        </Card>
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

function SummaryMetricsPanel({ summary }: { summary: CashBoxSummary }) {
  const metrics: Array<{
    label: string
    value: number
    tone: 'positive' | 'negative' | 'neutral' | 'strong'
    icon: ReactNode
  }> = [
    { label: 'Saldo inicial', value: summary.openingBalanceCents, tone: 'neutral', icon: <Wallet className="w-3 h-3" /> },
    { label: 'Ventas brutas', value: summary.grossSalesCents, tone: 'positive', icon: <TrendingUp className="w-3 h-3" /> },
    { label: 'Compras', value: summary.purchaseOutflowCents, tone: 'negative', icon: <ShoppingCart className="w-3 h-3" /> },
    { label: 'Devoluciones', value: summary.returnOutflowCents, tone: 'negative', icon: <ShoppingCart className="w-3 h-3" /> },
    { label: 'Ingresos', value: summary.manualAdjustmentsCents, tone: summary.manualAdjustmentsCents >= 0 ? 'positive' : 'negative', icon: <Banknote className="w-3 h-3" /> },
    { label: 'Retiros', value: summary.withdrawalsCents, tone: 'negative', icon: <Banknote className="w-3 h-3" /> },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Resumen de caja</CardTitle>
            <CardDescription>Movimientos acumulados de la caja seleccionada.</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Saldo actual</p>
            <p className="text-2xl font-bold">{formatCurrency(summary.currentBalanceCents)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-md border bg-muted/20 px-3 py-2">
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                {metric.icon}
                {metric.label}
              </dt>
              <dd className={`mt-1 text-sm font-semibold ${summaryMetricToneClass(metric.tone)}`}>
                {formatCurrency(metric.value)}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

function summaryMetricToneClass(tone: 'positive' | 'negative' | 'neutral' | 'strong') {
  return {
    positive: 'text-green-600 dark:text-green-400',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-muted-foreground',
    strong: 'text-foreground',
  }[tone]
}
