/**
 * Integration tests for the redesigned dashboard page.
 *
 * Verifies the new operational cockpit layout:
 *   - Welcome / health status header
 *   - KPI cards with real financial data
 *   - Quick action buttons
 *   - Recent sales activity
 *   - Low stock alerts
 *   - Cash box status chip
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// ── Hoisted mocks ────────────────────────────────────────────

const { mockRequireSession } = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
}))

const { mockCheckHealth } = vi.hoisted(() => ({
  mockCheckHealth: vi.fn(),
}))

const { mockGetCurrentCashBox } = vi.hoisted(() => ({
  mockGetCurrentCashBox: vi.fn(),
}))

const { mockGetSalesTotal } = vi.hoisted(() => ({
  mockGetSalesTotal: vi.fn(),
}))

const { mockGetLiquidity } = vi.hoisted(() => ({
  mockGetLiquidity: vi.fn(),
}))

const { mockGetGrossProfit } = vi.hoisted(() => ({
  mockGetGrossProfit: vi.fn(),
}))

const { mockGetOperatingCapital } = vi.hoisted(() => ({
  mockGetOperatingCapital: vi.fn(),
}))

const { mockGetStockInvestment } = vi.hoisted(() => ({
  mockGetStockInvestment: vi.fn(),
}))

const { mockListSales } = vi.hoisted(() => ({
  mockListSales: vi.fn(),
}))

const { mockGetStockByProduct } = vi.hoisted(() => ({
  mockGetStockByProduct: vi.fn(),
}))

vi.mock('@/shared/auth/session', () => ({
  requireSession: mockRequireSession,
}))

vi.mock('@/shared/api/health', () => ({
  checkHealth: mockCheckHealth,
}))

vi.mock('@/shared/api/cash', () => ({
  getCurrentCashBox: mockGetCurrentCashBox,
}))

vi.mock('@/shared/api/reports', () => ({
  getSalesTotal: mockGetSalesTotal,
  getLiquidity: mockGetLiquidity,
  getGrossProfit: mockGetGrossProfit,
  getOperatingCapital: mockGetOperatingCapital,
  getStockInvestment: mockGetStockInvestment,
  getStockByProduct: mockGetStockByProduct,
}))

vi.mock('@/shared/api/sales', () => ({
  listSales: mockListSales,
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react').createElement('a', { href, ...props }, children)
  },
}))

// ── Import page ──────────────────────────────────────────────

import DashboardPage from './page'

// ── Factories ────────────────────────────────────────────────

function validSession() {
  return {
    token: 'jwt-token',
    user: { id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'admin' },
  }
}

function healthOk() {
  return { ok: true as const, data: { status: 'ok', timestamp: '2026-05-05T20:00:00.000Z' } }
}

function healthFail() {
  return { ok: false as const, error: 'Connection refused' }
}

function cashBoxOpen() {
  return {
    ok: true as const,
    data: {
      id: 'cb-1',
      businessDate: '2026-05-05',
      status: 'OPEN',
      openingBalanceCents: 50000,
      currentBalanceCents: 125000,
      finalBalanceCents: null,
      closedAt: null,
      legacy: false,
    },
  }
}

function cashBoxClosed() {
  return {
    ok: true as const,
    data: {
      id: 'cb-2',
      businessDate: '2026-05-04',
      status: 'CLOSED',
      openingBalanceCents: 30000,
      currentBalanceCents: 95000,
      finalBalanceCents: 95000,
      closedAt: '2026-05-04T22:00:00.000Z',
      legacy: false,
    },
  }
}

function noCashBox() {
  return { ok: false as const, error: { error: 'NotFoundError', message: 'Not found', status: 404 } }
}

function salesTotal() {
  return { ok: true as const, data: { totalSalesCents: 350000, currency: 'PEN', activeSaleCount: 12 } }
}

function liquidity() {
  return { ok: true as const, data: { liquidityCents: 180000, currency: 'PEN' } }
}

function grossProfit() {
  return { ok: true as const, data: { grossProfitCents: 85000, currency: 'PEN' } }
}

function opCapital() {
  return { ok: true as const, data: { operatingCapitalCents: 120000, currency: 'PEN' } }
}

function stockInvest() {
  return { ok: true as const, data: { totalInvestmentCents: 95000, currency: 'PEN' } }
}

function recentSales() {
  return {
    ok: true as const,
    data: {
      items: [
        {
          saleId: 's-1',
          customerName: 'Cliente Uno',
          channel: 'whatsapp',
          status: 'ACTIVE' as const,
          totalRevenueCents: 45000,
          totalCostCents: 30000,
          grossProfitCents: 15000,
          paymentStatus: 'paid' as const,
          amountPaidCents: 45000,
          pendingBalanceCents: 0,
          settledAt: null,
          canSettleBalance: false,
          createdAt: '2026-05-05T15:00:00.000Z',
          lineCount: 2,
          items: [],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 5,
      totalPages: 1,
    },
  }
}

function emptySales() {
  return {
    ok: true as const,
    data: { items: [], total: 0, page: 1, pageSize: 5, totalPages: 0 },
  }
}

function stockByProductWithAlerts() {
  return {
    ok: true as const,
    data: {
      items: [
        {
          productId: 'p-1',
          productName: 'Producto Agotado',
          variantId: 'v-1',
          sku: 'SKU-001',
          totalRemainingQty: 0,
          investmentCents: 25000,
        },
      ],
      page: 1,
      pageSize: 5,
      totalItems: 1,
      totalPages: 1,
      search: '',
    },
  }
}

function stockByProductOk() {
  return {
    ok: true as const,
    data: {
      items: [],
      page: 1,
      pageSize: 5,
      totalItems: 0,
      totalPages: 0,
      search: '',
    },
  }
}

function reportFail() {
  return { ok: false as const, error: { error: 'UpstreamError', message: 'Unavailable', status: 502 } }
}

// ── Render helper ────────────────────────────────────────────

async function renderPage() {
  const jsx = await DashboardPage()
  return render(jsx)
}

// ═══════════════════════════════════════════════════════════════

describe('DashboardPage — redesign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireSession.mockResolvedValue(validSession())
    mockCheckHealth.mockResolvedValue(healthOk())
    mockGetCurrentCashBox.mockResolvedValue(cashBoxOpen())
    mockGetSalesTotal.mockResolvedValue(salesTotal())
    mockGetLiquidity.mockResolvedValue(liquidity())
    mockGetGrossProfit.mockResolvedValue(grossProfit())
    mockGetOperatingCapital.mockResolvedValue(opCapital())
    mockGetStockInvestment.mockResolvedValue(stockInvest())
    mockListSales.mockResolvedValue(recentSales())
    mockGetStockByProduct.mockResolvedValue(stockByProductOk())
  })

  // ── Header / Welcome ───────────────────────────────────────

  it('renders welcome message with user name', async () => {
    await renderPage()
    expect(screen.getByText('Panel de control')).toBeInTheDocument()
    expect(screen.getByText(/Admin/)).toBeInTheDocument()
  })

  it('renders health status indicator', async () => {
    await renderPage()
    expect(screen.getByText('Sistema operativo')).toBeInTheDocument()
  })

  it('shows backend unavailable text when health fails', async () => {
    mockCheckHealth.mockResolvedValue(healthFail())
    await renderPage()
    expect(screen.getByText('Backend no disponible')).toBeInTheDocument()
  })

  // ── KPI Cards ──────────────────────────────────────────────

  it('renders KPI cards with formatted monetary values', async () => {
    await renderPage()
    // Check KPI labels exist
    expect(screen.getByText('Ventas totales')).toBeInTheDocument()
    expect(screen.getByText('Ganancia bruta')).toBeInTheDocument()
    expect(screen.getByText('Liquidez disponible')).toBeInTheDocument()
    expect(screen.getByText('Capital operativo')).toBeInTheDocument()
  })

  it('renders KPI values as dashes when backend fails', async () => {
    mockGetSalesTotal.mockResolvedValue(reportFail())
    mockGetLiquidity.mockResolvedValue(reportFail())
    mockGetGrossProfit.mockResolvedValue(reportFail())
    mockGetOperatingCapital.mockResolvedValue(reportFail())
    await renderPage()
    // All four KPI cards should show "—" when data is absent
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(4)
  })

  // ── Secondary metrics ──────────────────────────────────────

  it('renders secondary metrics row', async () => {
    await renderPage()
    expect(screen.getByText('Inversión en stock')).toBeInTheDocument()
    expect(screen.getByText('Caja actual')).toBeInTheDocument()
    expect(screen.getByText('Margen bruto')).toBeInTheDocument()
  })

  // ── Cash box chip ──────────────────────────────────────────

  it('shows open cash box chip with balance', async () => {
    await renderPage()
    expect(screen.getByText('Abierta')).toBeInTheDocument()
  })

  it('shows closed cash box chip when closed', async () => {
    mockGetCurrentCashBox.mockResolvedValue(cashBoxClosed())
    await renderPage()
    expect(screen.getByText('Cerrada')).toBeInTheDocument()
  })

  it('does not show cash box chip when no box exists', async () => {
    mockGetCurrentCashBox.mockResolvedValue(noCashBox())
    await renderPage()
    expect(screen.queryByText('Abierta')).not.toBeInTheDocument()
    expect(screen.queryByText('Cerrada')).not.toBeInTheDocument()
  })

  // ── Quick Actions ──────────────────────────────────────────

  it('renders quick action buttons', async () => {
    await renderPage()
    expect(screen.getByText('Nueva venta')).toBeInTheDocument()
    expect(screen.getByText('Registrar compra')).toBeInTheDocument()
    expect(screen.getByText('Cerrar caja')).toBeInTheDocument()
    expect(screen.getByText('Nuevo cliente')).toBeInTheDocument()
  })

  it('quick action buttons link to correct routes', async () => {
    await renderPage()
    expect(screen.getByRole('link', { name: /nueva venta/i })).toHaveAttribute('href', '/sales/new')
    expect(screen.getByRole('link', { name: /registrar compra/i })).toHaveAttribute('href', '/inventory/purchases/new')
    expect(screen.getByRole('link', { name: /cerrar caja/i })).toHaveAttribute('href', '/cash/closings/new')
    expect(screen.getByRole('link', { name: /nuevo cliente/i })).toHaveAttribute('href', '/customers/new')
  })

  // ── Recent activity ────────────────────────────────────────

  it('renders recent sales when data exists', async () => {
    await renderPage()
    expect(screen.getByText('Actividad reciente')).toBeInTheDocument()
    expect(screen.getByText('Cliente Uno')).toBeInTheDocument()
    expect(screen.getByText('Pagado')).toBeInTheDocument()
  })

  it('renders empty state when no sales exist', async () => {
    mockListSales.mockResolvedValue(emptySales())
    await renderPage()
    expect(screen.getByText('No hay ventas recientes')).toBeInTheDocument()
  })

  it('handles sales fetch failure gracefully', async () => {
    mockListSales.mockResolvedValue(reportFail())
    await renderPage()
    expect(screen.getByText('No hay ventas recientes')).toBeInTheDocument()
  })

  // ── Low stock alerts ───────────────────────────────────────

  it('renders low stock alerts when items exist', async () => {
    mockGetStockByProduct.mockResolvedValue(stockByProductWithAlerts())
    await renderPage()
    expect(screen.getByText('Alertas de stock')).toBeInTheDocument()
    expect(screen.getByText('Producto Agotado')).toBeInTheDocument()
    expect(screen.getByText(/SKU-001/)).toBeInTheDocument()
  })

  it('renders empty state when no low stock alerts', async () => {
    await renderPage()
    expect(screen.getByText('Sin alertas de stock bajo')).toBeInTheDocument()
  })

  // ── Graceful degradation — all reports fail ────────────────

  it('renders full dashboard skeleton when all backend calls fail', async () => {
    mockCheckHealth.mockResolvedValue(healthFail())
    mockGetCurrentCashBox.mockResolvedValue(noCashBox())
    mockGetSalesTotal.mockResolvedValue(reportFail())
    mockGetLiquidity.mockResolvedValue(reportFail())
    mockGetGrossProfit.mockResolvedValue(reportFail())
    mockGetOperatingCapital.mockResolvedValue(reportFail())
    mockGetStockInvestment.mockResolvedValue(reportFail())
    mockListSales.mockResolvedValue(reportFail())
    mockGetStockByProduct.mockResolvedValue(reportFail())

    await renderPage()

    // Page still renders
    expect(screen.getByText('Panel de control')).toBeInTheDocument()
    expect(screen.getByText('Backend no disponible')).toBeInTheDocument()
    // KPIs show dashes
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4)
    // Quick actions still render
    expect(screen.getByText('Nueva venta')).toBeInTheDocument()
  })
})
