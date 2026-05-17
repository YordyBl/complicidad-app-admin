import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'

import { CashPageClient } from './cash-page-client'
import type { CashBox, CashBoxSummary, CashMovementList } from '@/shared/api/cash'

// ── Mock server actions ─────────────────────────────────────────────

const mockServerActions = vi.hoisted(() => ({
  getSummaryAction: vi.fn(),
  getMovementsAction: vi.fn(),
  closeCashBoxAction: vi.fn(),
  addMovementAction: vi.fn(),
  openCashBoxAction: vi.fn(),
}))

vi.mock('./cash-actions', () => ({
  getSummaryAction: mockServerActions.getSummaryAction,
  getMovementsAction: mockServerActions.getMovementsAction,
  closeCashBoxAction: mockServerActions.closeCashBoxAction,
  addMovementAction: mockServerActions.addMovementAction,
  openCashBoxAction: mockServerActions.openCashBoxAction,
}))

// ── Mock next/link ──────────────────────────────────────────────────
vi.mock('next/link', () => ({
  default: ({ children, ...props }: Record<string, unknown>) =>
    require('react').createElement('a', props, children),
}))

// ── Mock next/navigation (for router.refresh spy) ──────────────────
const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}))

// ── Helpers ─────────────────────────────────────────────────────────

function cashBox(overrides: Partial<CashBox> = {}): CashBox {
  return {
    id: 'box-1',
    businessDate: '2026-05-15',
    status: 'OPEN',
    openingBalanceCents: 10000,
    currentBalanceCents: 15000,
    finalBalanceCents: null,
    closedAt: null,
    legacy: false,
    isCurrent: true,
    createdAt: '2026-05-15T10:00:00Z',
    ...overrides,
  }
}

function cashBoxSummary(overrides: Partial<CashBoxSummary> = {}): CashBoxSummary {
  return {
    cashBoxId: 'box-1',
    businessDate: '2026-05-15',
    status: 'OPEN',
    openingBalanceCents: 10000,
    currentBalanceCents: 150000,
    netMovementCents: 85000,
    grossSalesCents: 120000,
    purchaseOutflowCents: -20000,
    returnOutflowCents: -5000,
    manualAdjustmentsCents: 0,
    withdrawalsCents: -10000,
    ...overrides,
  }
}

function cashMovementList(overrides: Partial<CashMovementList> = {}): CashMovementList {
  return {
    cashBoxId: 'box-1',
    businessDate: '2026-05-15',
    status: 'OPEN',
    entries: [
      {
        id: 'mov-1',
        type: 'SALE_INCOME',
        amountCents: 50000,
        sourceId: 's1',
        concept: 'Venta #1',
        createdAt: '2026-05-15T10:00:00Z',
        profitCents: 20000,
      },
      {
        id: 'mov-2',
        type: 'PURCHASE_OUTFLOW',
        amountCents: -20000,
        sourceId: 'p1',
        concept: 'Compra insumos',
        createdAt: '2026-05-15T11:00:00Z',
        profitCents: null,
      },
      {
        id: 'mov-3',
        type: 'WITHDRAWAL',
        amountCents: -10000,
        sourceId: '',
        concept: 'Retiro efectivo',
        createdAt: '2026-05-15T12:00:00Z',
        profitCents: null,
      },
    ],
    total: 3,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockServerActions.getSummaryAction.mockResolvedValue({
    success: true,
    data: cashBoxSummary(),
  })
  mockServerActions.getMovementsAction.mockResolvedValue({
    success: true,
    data: cashMovementList(),
  })
  mockServerActions.closeCashBoxAction.mockResolvedValue({
    success: false,
    error: 'mock not set up',
  })
  mockServerActions.addMovementAction.mockResolvedValue({
    success: false,
    error: 'mock not set up',
  })
  mockServerActions.openCashBoxAction.mockResolvedValue({
    success: false,
    error: 'mock not set up',
  })
})

// ── Tests ───────────────────────────────────────────────────────────

describe('CashPageClient', () => {
  describe('summary cards', () => {
    it('renders the four summary cards with exact values', () => {
      const summary = cashBoxSummary()
      render(
        <CashPageClient
          currentBox={cashBox()}
          boxes={[cashBox()]}
          initialSelectedBoxId="box-1"
          initialSummary={summary}
          initialMovements={cashMovementList()}
          noCurrentBox={false}
        />,
      )

      // Ventas brutas = grossSalesCents = 120000 → S/ 1,200.00
      expect(screen.getByText('Ventas brutas')).toBeInTheDocument()
      expect(screen.getByText('S/ 1,200.00')).toBeInTheDocument()

      // Costos / Compras = |purchaseOutflowCents| = 20000 → S/ 200.00
      expect(screen.getByText('Costos / Compras')).toBeInTheDocument()
      expect(screen.getByText('S/ 200.00')).toBeInTheDocument()
      expect(screen.queryByText('S/ 250.00')).not.toBeInTheDocument()

      // Movimiento neto = netMovementCents = 85000 → S/ 850.00
      expect(screen.getByText('Movimiento neto')).toBeInTheDocument()
      expect(screen.getByText('S/ 850.00')).toBeInTheDocument()

      // Saldo actual = currentBalanceCents = 150000 → S/ 1,500.00
      expect(screen.getByText('Saldo actual')).toBeInTheDocument()
      expect(screen.getByText('S/ 1,500.00')).toBeInTheDocument()
    })

    it('triangulates summary values with different amounts', () => {
      const summary = cashBoxSummary({
        grossSalesCents: 75000,
        purchaseOutflowCents: -15000,
        netMovementCents: 47000,
        currentBalanceCents: 200000,
        returnOutflowCents: -8000,
      })

      render(
        <CashPageClient
          currentBox={cashBox()}
          boxes={[cashBox()]}
          initialSelectedBoxId="box-1"
          initialSummary={summary}
          initialMovements={cashMovementList()}
          noCurrentBox={false}
        />,
      )

      expect(screen.getByText('S/ 750.00')).toBeInTheDocument()
      expect(screen.getByText('S/ 150.00')).toBeInTheDocument()
      expect(screen.queryByText('S/ 230.00')).not.toBeInTheDocument()
      expect(screen.getByText('S/ 470.00')).toBeInTheDocument()
      expect(screen.getByText('S/ 2,000.00')).toBeInTheDocument()
    })
  })

  describe('mutable actions — current open caja', () => {
    it('shows close and manual movement UI when the selected box is the current open caja', () => {
      render(
        <CashPageClient
          currentBox={cashBox({ id: 'box-1' })}
          boxes={[cashBox({ id: 'box-1' })]}
          initialSelectedBoxId="box-1"
          initialSummary={cashBoxSummary({ cashBoxId: 'box-1' })}
          initialMovements={cashMovementList()}
          noCurrentBox={false}
        />,
      )

      // "Cerrar caja" appears as card title and button — use getAllByText
      const closeElements = screen.getAllByText('Cerrar caja')
      expect(closeElements.length).toBeGreaterThanOrEqual(1)

      // Close button should exist
      const closeButton = screen.getByRole('button', { name: /cerrar caja/i })
      expect(closeButton).toBeInTheDocument()

      // Manual movement card should exist
      expect(screen.getByText('Movimiento manual')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /registrar movimiento/i })).toBeInTheDocument()
    })

    it('shows close button even when currentBox lacks explicit isCurrent field (defensive guard)', () => {
      const box = cashBox({ id: 'box-1', isCurrent: undefined as unknown as boolean })

      render(
        <CashPageClient
          currentBox={box}
          boxes={[box]}
          initialSelectedBoxId="box-1"
          initialSummary={cashBoxSummary({ cashBoxId: 'box-1' })}
          initialMovements={cashMovementList()}
          noCurrentBox={false}
        />,
      )

      // When isCurrent is undefined (not false), AND ID matches AND status is OPEN → allow
      const closeButton = screen.getByRole('button', { name: /cerrar caja/i })
      expect(closeButton).toBeInTheDocument()
      expect(screen.getByText('Movimiento manual')).toBeInTheDocument()
    })

    it('blocks actions when isCurrent is explicitly false (defensive)', () => {
      const box = cashBox({ id: 'box-1', isCurrent: false })

      render(
        <CashPageClient
          currentBox={box}
          boxes={[box]}
          initialSelectedBoxId="box-1"
          initialSummary={cashBoxSummary({ cashBoxId: 'box-1' })}
          initialMovements={cashMovementList()}
          noCurrentBox={false}
        />,
      )

      // isCurrent: false should block per the guard (isCurrent !== false check)
      expect(screen.getByText(/Acciones disponibles solo para la caja actual abierta/)).toBeInTheDocument()
    })
  })

  describe('read-only — closed/historical caja', () => {
    it('does not show close or manual movement for a closed caja', () => {
      const closedBox = cashBox({
        id: 'box-2',
        status: 'CLOSED',
        isCurrent: false,
        finalBalanceCents: 50000,
        closedAt: '2026-05-14T20:00:00Z',
      })

      render(
        <CashPageClient
          currentBox={cashBox({ id: 'box-1' })}
          boxes={[cashBox({ id: 'box-1' }), closedBox]}
          initialSelectedBoxId="box-2"
          initialSummary={cashBoxSummary({
            cashBoxId: 'box-2',
            status: 'CLOSED',
            currentBalanceCents: 50000,
            netMovementCents: 40000,
          })}
          initialMovements={cashMovementList({ cashBoxId: 'box-2', status: 'CLOSED' })}
          noCurrentBox={false}
        />,
      )

      // Should NOT have close/movement actions
      expect(screen.queryByRole('button', { name: /cerrar caja/i })).not.toBeInTheDocument()
      expect(screen.queryByText('Movimiento manual')).not.toBeInTheDocument()

      // Should show read-only indicator
      expect(screen.getByText(/Esta caja está cerrada/)).toBeInTheDocument()

      // Should still show movement history
      expect(screen.getByText('Historial de movimientos')).toBeInTheDocument()
    })

    it('historical caja not matching current open ID shows read-only', () => {
      const historicalBox = cashBox({
        id: 'box-hist',
        status: 'OPEN',
        isCurrent: false,
        businessDate: '2026-05-10',
      })

      render(
        <CashPageClient
          currentBox={cashBox({ id: 'box-1', status: 'OPEN' })}
          boxes={[cashBox({ id: 'box-1', status: 'OPEN' }), historicalBox]}
          initialSelectedBoxId="box-hist"
          initialSummary={cashBoxSummary({ cashBoxId: 'box-hist', status: 'OPEN' })}
          initialMovements={cashMovementList({ cashBoxId: 'box-hist' })}
          noCurrentBox={false}
        />,
      )

      expect(screen.queryByRole('button', { name: /cerrar caja/i })).not.toBeInTheDocument()
      expect(screen.getByText(/Acciones disponibles solo para la caja actual abierta/)).toBeInTheDocument()
    })
  })

  describe('movement history', () => {
    it('renders movement entries in a table', () => {
      render(
        <CashPageClient
          currentBox={cashBox()}
          boxes={[cashBox()]}
          initialSelectedBoxId="box-1"
          initialSummary={cashBoxSummary()}
          initialMovements={cashMovementList()}
          noCurrentBox={false}
        />,
      )

      expect(screen.getByText('Historial de movimientos')).toBeInTheDocument()
      expect(screen.getByText('Venta #1')).toBeInTheDocument()
      expect(screen.getByText('Compra insumos')).toBeInTheDocument()
      expect(screen.getByText('Retiro efectivo')).toBeInTheDocument()
    })

    it('shows movement type badges in the table', () => {
      render(
        <CashPageClient
          currentBox={cashBox()}
          boxes={[cashBox()]}
          initialSelectedBoxId="box-1"
          initialSummary={cashBoxSummary()}
          initialMovements={cashMovementList()}
          noCurrentBox={false}
        />,
      )

      // Find the table and check for badges within it
      const table = screen.getByRole('table')
      const withinTable = within(table)

      // Venta badge should be in the table
      expect(withinTable.getByText('Venta')).toBeInTheDocument()
      expect(withinTable.getByText('Compra')).toBeInTheDocument()
      // Retiro badge in table (not the select option outside the table)
      const retiroBadges = withinTable.getAllByText('Retiro')
      expect(retiroBadges.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('selector', () => {
    it('renders all boxes in the selector', () => {
      const boxes = [
        cashBox({ id: 'box-1', businessDate: '2026-05-15' }),
        cashBox({ id: 'box-2', businessDate: '2026-05-14', status: 'CLOSED', isCurrent: false }),
      ]

      render(
        <CashPageClient
          currentBox={boxes[0]}
          boxes={boxes}
          initialSelectedBoxId="box-1"
          initialSummary={cashBoxSummary()}
          initialMovements={cashMovementList()}
          noCurrentBox={false}
        />,
      )

      expect(screen.getByText('Seleccionar caja')).toBeInTheDocument()

      // Both boxes appear in the selector — check by button labels
      const selectorButtons = screen.getAllByRole('button').filter((btn) =>
        btn.textContent?.includes('/5/2026'),
      )
      expect(selectorButtons.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('no current box state', () => {
    it('shows "open caja today" when no boxes exist', () => {
      render(
        <CashPageClient
          currentBox={null}
          boxes={[]}
          initialSelectedBoxId={null}
          initialSummary={null}
          initialMovements={null}
          noCurrentBox={true}
        />,
      )

      expect(screen.getByText('Sin cajas registradas')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /abrir caja hoy/i })).toBeInTheDocument()
    })

    it('shows selector for historical boxes when current does not exist', () => {
      const boxes = [
        cashBox({ id: 'box-hist', businessDate: '2026-05-14', status: 'CLOSED', isCurrent: false }),
      ]

      render(
        <CashPageClient
          currentBox={null}
          boxes={boxes}
          initialSelectedBoxId="box-hist"
          initialSummary={cashBoxSummary({ cashBoxId: 'box-hist', status: 'CLOSED' })}
          initialMovements={cashMovementList({ cashBoxId: 'box-hist', status: 'CLOSED' })}
          noCurrentBox={true}
        />,
      )

      expect(screen.getByText('No hay caja abierta hoy.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /abrir caja hoy/i })).toBeInTheDocument()
      expect(screen.getByText('Seleccionar caja')).toBeInTheDocument()
    })
  })

  describe('manual movement — summary refresh', () => {
    it('refreshes summary cards and movement list after successful manual movement', async () => {
      mockServerActions.addMovementAction.mockResolvedValue({ success: true })
      // Return updated summary with different values to verify refresh
      mockServerActions.getSummaryAction.mockResolvedValue({
        success: true,
        data: cashBoxSummary({
          currentBalanceCents: 160000,
          netMovementCents: 95000,
          grossSalesCents: 130000,
        }),
      })
      mockServerActions.getMovementsAction.mockResolvedValue({
        success: true,
        data: cashMovementList({ total: 4, entries: [...cashMovementList().entries, {
          id: 'mov-4',
          type: 'MANUAL_ADJUSTMENT' as const,
          amountCents: 10000,
          sourceId: '',
          concept: 'Test movement',
          createdAt: '2026-05-15T13:00:00Z',
          profitCents: null,
        }] }),
      })

      const user = userEvent.setup()
      render(
        <CashPageClient
          currentBox={cashBox({ id: 'box-1' })}
          boxes={[cashBox({ id: 'box-1' })]}
          initialSelectedBoxId="box-1"
          initialSummary={cashBoxSummary({ cashBoxId: 'box-1' })}
          initialMovements={cashMovementList()}
          noCurrentBox={false}
        />,
      )

      // Fill in the movement form
      await user.type(screen.getByLabelText('Concepto'), 'Test movement')
      await user.type(screen.getByLabelText(/Monto/), '10000')

      // Click register
      await user.click(screen.getByRole('button', { name: /registrar movimiento/i }))

      // Both summary and movements actions should be called
      await waitFor(() => {
        expect(mockServerActions.getSummaryAction).toHaveBeenCalledWith('box-1')
        expect(mockServerActions.getMovementsAction).toHaveBeenCalledWith('box-1')
      })

      // Updated summary values should appear
      await waitFor(() => {
        expect(screen.getByText('S/ 1,600.00')).toBeInTheDocument()
      })
    })

    it('shows error and does NOT refresh summary when addMovementAction fails', async () => {
      mockServerActions.addMovementAction.mockResolvedValue({
        success: false,
        error: 'No se puede agregar el movimiento.',
      })
      // Reset refresh spies (getSummary/getMovements should not be called on failure)
      mockServerActions.getSummaryAction.mockClear()
      mockServerActions.getMovementsAction.mockClear()

      const user = userEvent.setup()
      render(
        <CashPageClient
          currentBox={cashBox({ id: 'box-1' })}
          boxes={[cashBox({ id: 'box-1' })]}
          initialSelectedBoxId="box-1"
          initialSummary={cashBoxSummary({ cashBoxId: 'box-1' })}
          initialMovements={cashMovementList()}
          noCurrentBox={false}
        />,
      )

      await user.type(screen.getByLabelText('Concepto'), 'Bad movement')
      await user.type(screen.getByLabelText(/Monto/), '99999')
      await user.click(screen.getByRole('button', { name: /registrar movimiento/i }))

      await waitFor(() => {
        expect(screen.getByText('No se puede agregar el movimiento.')).toBeInTheDocument()
      })

      // Summary and movements should NOT be re-fetched on failure
      expect(mockServerActions.getSummaryAction).not.toHaveBeenCalled()
      expect(mockServerActions.getMovementsAction).not.toHaveBeenCalled()
    })
  })

  describe('open caja — error and refresh', () => {
    it('shows error and does NOT call router.refresh when openCashBoxAction fails', async () => {
      mockServerActions.openCashBoxAction.mockResolvedValue({
        success: false,
        error: 'No se puede abrir una caja en este momento.',
      })
      mockRouter.refresh.mockClear()

      const user = userEvent.setup()
      render(
        <CashPageClient
          currentBox={null}
          boxes={[]}
          initialSelectedBoxId={null}
          initialSummary={null}
          initialMovements={null}
          noCurrentBox={true}
        />,
      )

      await user.click(screen.getByRole('button', { name: /abrir caja hoy/i }))

      // Error message should be visible
      await waitFor(() => {
        expect(screen.getByText('No se puede abrir una caja en este momento.')).toBeInTheDocument()
      })

      // router.refresh must NOT be called on failure
      expect(mockRouter.refresh).not.toHaveBeenCalled()
    })

    it('calls router.refresh when openCashBoxAction succeeds', async () => {
      mockServerActions.openCashBoxAction.mockResolvedValue({ success: true })
      mockRouter.refresh.mockClear()

      const user = userEvent.setup()
      render(
        <CashPageClient
          currentBox={null}
          boxes={[
            cashBox({ id: 'box-hist', businessDate: '2026-05-14', status: 'CLOSED', isCurrent: false }),
          ]}
          initialSelectedBoxId="box-hist"
          initialSummary={cashBoxSummary({ cashBoxId: 'box-hist', status: 'CLOSED' })}
          initialMovements={cashMovementList({ cashBoxId: 'box-hist', status: 'CLOSED' })}
          noCurrentBox={true}
        />,
      )

      await user.click(screen.getByRole('button', { name: /abrir caja hoy/i }))

      await waitFor(() => {
        expect(mockRouter.refresh).toHaveBeenCalled()
      })
    })
  })

  describe('close caja — refresh and error', () => {
    it('calls router.refresh when closeCashBoxAction succeeds', async () => {
      mockServerActions.closeCashBoxAction.mockResolvedValue({ success: true })
      mockRouter.refresh.mockClear()

      const user = userEvent.setup()
      render(
        <CashPageClient
          currentBox={cashBox({ id: 'box-1' })}
          boxes={[cashBox({ id: 'box-1' })]}
          initialSelectedBoxId="box-1"
          initialSummary={cashBoxSummary({ cashBoxId: 'box-1' })}
          initialMovements={cashMovementList()}
          noCurrentBox={false}
        />,
      )

      // Click "Cerrar caja" button to show the confirmation form
      await user.click(screen.getByRole('button', { name: /cerrar caja/i }))

      // Fill in the balance field
      await user.type(screen.getByLabelText(/Balance final/), '150000')

      // Click "Sí, cerrar caja" to confirm
      await user.click(screen.getByRole('button', { name: /sí, cerrar caja/i }))

      await waitFor(() => {
        expect(mockRouter.refresh).toHaveBeenCalled()
      })
    })

    it('shows error and does NOT call router.refresh when closeCashBoxAction fails', async () => {
      mockServerActions.closeCashBoxAction.mockResolvedValue({
        success: false,
        error: 'No se puede cerrar la caja en este momento.',
      })
      mockRouter.refresh.mockClear()

      const user = userEvent.setup()
      render(
        <CashPageClient
          currentBox={cashBox({ id: 'box-1' })}
          boxes={[cashBox({ id: 'box-1' })]}
          initialSelectedBoxId="box-1"
          initialSummary={cashBoxSummary({ cashBoxId: 'box-1' })}
          initialMovements={cashMovementList()}
          noCurrentBox={false}
        />,
      )

      // Click "Cerrar caja" button to show the confirmation form
      await user.click(screen.getByRole('button', { name: /cerrar caja/i }))

      // Fill in the balance field
      await user.type(screen.getByLabelText(/Balance final/), '150000')

      // Click "Sí, cerrar caja" to confirm
      await user.click(screen.getByRole('button', { name: /sí, cerrar caja/i }))

      // Error message should be visible
      await waitFor(() => {
        expect(screen.getByText('No se puede cerrar la caja en este momento.')).toBeInTheDocument()
      })

      // router.refresh must NOT be called on failure
      expect(mockRouter.refresh).not.toHaveBeenCalled()
    })
  })
})
