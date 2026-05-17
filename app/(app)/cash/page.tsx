import type { Metadata } from 'next'

import { getCurrentCashBox, listCashBoxes, getCashBoxSummary, getCashBoxMovements } from '@/shared/api/cash'
import type { CashBox, CashBoxSummary, CashMovementList } from '@/shared/api/cash'
import { CashPageClient } from '@/features/cash/cash-page-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/error-state'

export const metadata: Metadata = {
  title: 'Caja Diaria — Complicidad',
}

interface PageData {
  currentBox: CashBox | null
  boxes: CashBox[]
  noCurrentBox: boolean
  fatalError: string | null
  initialSelectedBoxId: string | null
  initialSummary: CashBoxSummary | null
  initialSummaryError: string | null
  initialMovements: CashMovementList | null
  initialMovementsError: string | null
}

async function loadPageData(): Promise<PageData> {
  // Fetch current caja + list in parallel
  const [currentResult, listResult] = await Promise.all([
    getCurrentCashBox(),
    listCashBoxes(),
  ])

  // Resolve current box — 404 means valid "no current caja"
  let currentBox: CashBox | null = null
  let noCurrentBox = false
  let fatalError: string | null = null

  if (currentResult.ok) {
    currentBox = currentResult.data
  } else if (currentResult.error.status === 404) {
    noCurrentBox = true
  } else {
    fatalError = currentResult.error.message || 'Error al obtener la caja actual.'
  }

  // Resolve list
  let boxes: CashBox[] = []
  if (!fatalError) {
    if (listResult.ok) {
      boxes = listResult.data
    } else {
      fatalError = listResult.error.message || 'Error al obtener el listado de cajas.'
    }
  }

  // Fatal error — return early
  if (fatalError) {
    return {
      currentBox: null,
      boxes: [],
      noCurrentBox: false,
      fatalError,
      initialSelectedBoxId: null,
      initialSummary: null,
      initialSummaryError: null,
      initialMovements: null,
      initialMovementsError: null,
    }
  }

  // Determine initial selected box: current open, then first in list
  let initialSelectedBoxId: string | null = null
  if (currentBox) {
    initialSelectedBoxId = currentBox.id
  } else if (boxes.length > 0) {
    initialSelectedBoxId = boxes[0].id
  }

  // Fetch summary + movements for selected box
  let initialSummary: CashBoxSummary | null = null
  let initialSummaryError: string | null = null
  let initialMovements: CashMovementList | null = null
  let initialMovementsError: string | null = null

  if (initialSelectedBoxId) {
    const [summaryResult, movementsResult] = await Promise.all([
      getCashBoxSummary(initialSelectedBoxId),
      getCashBoxMovements(initialSelectedBoxId),
    ])

    if (summaryResult.ok) {
      initialSummary = summaryResult.data
    } else {
      initialSummaryError = summaryResult.error.message || 'Error al cargar el resumen.'
    }

    if (movementsResult.ok) {
      initialMovements = movementsResult.data
    } else {
      initialMovementsError = movementsResult.error.message || 'Error al cargar los movimientos.'
    }
  }

  return {
    currentBox,
    boxes,
    noCurrentBox,
    fatalError: null,
    initialSelectedBoxId,
    initialSummary,
    initialSummaryError,
    initialMovements,
    initialMovementsError,
  }
}

export default async function CashPage() {
  const data = await loadPageData()

  // Fatal error state
  if (data.fatalError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Caja Diaria</h1>
          <p className="text-muted-foreground">Gestión diaria de caja.</p>
        </div>
        <ErrorState
          title="Error al cargar caja"
          message={data.fatalError}
        />
      </div>
    )
  }

  return (
    <CashPageClient
      currentBox={data.currentBox}
      boxes={data.boxes}
      initialSelectedBoxId={data.initialSelectedBoxId}
      initialSummary={data.initialSummary}
      initialMovements={data.initialMovements}
      initialSummaryError={data.initialSummaryError}
      initialMovementsError={data.initialMovementsError}
      noCurrentBox={data.noCurrentBox}
    />
  )
}
