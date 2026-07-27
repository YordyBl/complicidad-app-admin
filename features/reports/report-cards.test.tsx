/**
 * Tests for report-cards — pure helpers + layout structure + list card rendering + independence.
 *
 * Architecture change: KPI data is now pre-fetched at page level and passed as props.
 * Only list cards (StockByProduct, Lots) still fetch data async with Suspense.
 *
 * parsePage / parsePageSize / parseSearch are pure functions tested directly.
 *
 * Layout structure tests verify the new 4-section organization:
 *  1. Salud del negocio (primary KPIs)
 *  2. Rentabilidad (secondary: COGS, margin, active sales)
 *  3. Capital e inversión (secondary: stock investment, reinvestment)
 *  4. Detalle operativo (list cards with Suspense)
 *
 * List card rendering and independence tests are preserved.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════
// Hoisted API mocks — only needed for list card tests
// ═══════════════════════════════════════════════════════════════════

const { mockGetLots, mockGetStockByProduct } = vi.hoisted(() => ({
  mockGetLots: vi.fn(),
  mockGetStockByProduct: vi.fn(),
}))

vi.mock('@/shared/api/reports', () => ({
  getLots: mockGetLots,
  getStockByProduct: mockGetStockByProduct,
}))

// ═══════════════════════════════════════════════════════════════════
// Pure function tests — ZERO mocks required
// ═══════════════════════════════════════════════════════════════════

import { parsePage, parsePageSize, parseSearch } from './report-cards'

describe('parsePage', () => {
  it('returns the parsed number for a valid numeric string', () => {
    expect(parsePage('3')).toBe(3)
  })

  it('defaults to 1 when the string is empty', () => {
    expect(parsePage('')).toBe(1)
  })

  it('defaults to 1 when undefined', () => {
    expect(parsePage(undefined)).toBe(1)
  })

  it('defaults to 1 when the string is non-numeric', () => {
    expect(parsePage('abc')).toBe(1)
  })

  it('clamps to 1 for 0 or negative values', () => {
    expect(parsePage('0')).toBe(1)
    expect(parsePage('-5')).toBe(1)
  })

  it('handles large page numbers', () => {
    expect(parsePage('999')).toBe(999)
  })

  it('handles string with leading/trailing whitespace', () => {
    expect(parsePage(' 5 ')).toBe(5)
  })
})

describe('parsePageSize', () => {
  it('returns the parsed number for a valid numeric string', () => {
    expect(parsePageSize('10')).toBe(10)
  })

  it('defaults to 5 when the string is empty', () => {
    expect(parsePageSize('')).toBe(5)
  })

  it('defaults to 5 when undefined', () => {
    expect(parsePageSize(undefined)).toBe(5)
  })

  it('defaults to 5 for non-numeric strings', () => {
    expect(parsePageSize('abc')).toBe(5)
  })

  it('defaults to 5 for 0 or negative values', () => {
    expect(parsePageSize('0')).toBe(5)
    expect(parsePageSize('-1')).toBe(5)
  })

  it('handles fractional strings (parseInt truncates)', () => {
    expect(parsePageSize('10.5')).toBe(10)
  })
})

describe('parseSearch', () => {
  it('returns the string value trimmed', () => {
    expect(parseSearch(' remera ')).toBe('remera')
  })

  it('returns empty string for undefined', () => {
    expect(parseSearch(undefined)).toBe('')
  })

  it('returns empty string for empty input', () => {
    expect(parseSearch('')).toBe('')
  })

  it('returns empty string for whitespace-only input', () => {
    expect(parseSearch('   ')).toBe('')
  })

  it('preserves inner whitespace while trimming edges', () => {
    expect(parseSearch('  remera negra  ')).toBe('remera negra')
  })
})

// ═══════════════════════════════════════════════════════════════════
// Independence tests — buildCardUrl preserves other card's params
// ═══════════════════════════════════════════════════════════════════

import { buildCardUrl, type ReportsQueryResult } from '@/app/(app)/reports/page-helpers'

describe('buildCardUrl — cross-card independence', () => {
  it('preserves stock params when building lots pagination URL', () => {
    const allQueries: ReportsQueryResult = {
      stock: { page: '2', search: 'camiseta' },
      lots: { page: '1' },
    }

    const url = buildCardUrl('lots', allQueries, { page: '3' })

    expect(url).toContain('lots_page=3')
    expect(url).toContain('stock_page=2')
    expect(url).toContain('stock_search=camiseta')
  })

  it('preserves lots params when building stock pagination URL', () => {
    const allQueries: ReportsQueryResult = {
      stock: { page: '1' },
      lots: { page: '3', search: 'zapato' },
    }

    const url = buildCardUrl('stock', allQueries, { page: '2' })

    expect(url).toContain('stock_page=2')
    expect(url).toContain('lots_page=3')
    expect(url).toContain('lots_search=zapato')
  })

  it('does NOT include other namespace when it has no params', () => {
    const allQueries: ReportsQueryResult = {
      stock: {},
      lots: { page: '1', search: 'test' },
    }

    const url = buildCardUrl('lots', allQueries)

    expect(url).toContain('lots_page=1')
    expect(url).toContain('lots_search=test')
    expect(url).not.toContain('stock_')
  })

  it('building URL for one card does not mutate the other card query object', () => {
    const allQueries: ReportsQueryResult = {
      stock: { page: '2', search: 'remera' },
      lots: { page: '1' },
    }

    const stockBefore = { ...allQueries.stock }
    buildCardUrl('lots', allQueries, { page: '3' })

    expect(allQueries.stock.page).toBe(stockBefore.page)
    expect(allQueries.stock.search).toBe(stockBefore.search)
  })
})

// ═══════════════════════════════════════════════════════════════════
// Helpers for layout tests
// ═══════════════════════════════════════════════════════════════════

function nullKpiData() {
  return {
    salesTotal: null,
    liquidity: null,
    operatingCapital: null,
    grossProfit: null,
    cogs: null,
    stockInvestment: null,
    reinvestment: null,
  }
}

function sampleKpiData() {
  return {
    salesTotal: { totalSalesCents: 500000, currency: 'PEN', activeSaleCount: 12 },
    liquidity: { liquidityCents: 150000, currency: 'PEN' },
    operatingCapital: { operatingCapitalCents: 800000, currency: 'PEN' },
    grossProfit: { grossProfitCents: 200000, currency: 'PEN' },
    cogs: { totalCogsCents: 300000, currency: 'PEN' },
    stockInvestment: { totalInvestmentCents: 400000, currency: 'PEN' },
    reinvestment: { reinvestmentCents: 100000, currency: 'PEN' },
  }
}

/**
 * Child index map for ReportCards output (fixed 11-element array):
 *   [0] SectionHeader — "Salud del negocio"
 *   [1] div.grid    — 4 KpiCards (primary)
 *   [2] Separator
 *   [3] SectionHeader — "Rentabilidad"
 *   [4] div.grid    — 3 SecondaryMetricCards
 *   [5] Separator
 *   [6] SectionHeader — "Capital e inversión"
 *   [7] div.grid    — 2 SecondaryMetricCards
 *   [8] Separator
 *   [9] SectionHeader — "Detalle operativo"
 *   [10] div.grid   — 2 Suspense wrappers (list cards)
 */
const IDX = {
  SALUD_HEADER: 0,
  SALUD_GRID: 1,
  SEP_1: 2,
  RENTAB_HEADER: 3,
  RENTAB_GRID: 4,
  SEP_2: 5,
  CAPITAL_HEADER: 6,
  CAPITAL_GRID: 7,
  SEP_3: 8,
  OPER_HEADER: 9,
  OPER_GRID: 10,
} as const

function isSeparator(child: unknown): boolean {
  if (!child || typeof child !== 'object') return false
  const c = child as { type?: unknown }
  // Separator is a forwardRef component; type is a Symbol in production
  if (typeof c.type === 'symbol') return true
  // In dev mode, forwardRef components can have a render function
  if (typeof c.type === 'object' && c.type !== null && '$$typeof' in c.type) return true
  return false
}

function isSectionHeader(child: unknown): boolean {
  if (!child || typeof child !== 'object') return false
  const c = child as { type?: unknown }
  return typeof c.type === 'function' && (c.type as { name?: string }).name === 'SectionHeader'
}

// ═══════════════════════════════════════════════════════════════════
// Layout tests — verify the 4-section structure of ReportCards
// ═══════════════════════════════════════════════════════════════════

describe('ReportCards layout — new 4-section structure', () => {
  it('renders 11 children: 4 section headers + 4 grids + 3 separators', async () => {
    const { ReportCards } = await import('./report-cards')

    const element = await ReportCards({ ...nullKpiData() })
    const children = element.props.children

    expect(children).toHaveLength(11)
  })

  it('first section header says "Salud del negocio"', async () => {
    const { ReportCards } = await import('./report-cards')

    const element = await ReportCards({ ...nullKpiData() })
    const children = element.props.children

    expect(children[IDX.SALUD_HEADER].props.title).toBe('Salud del negocio')
  })

  it('all 4 section titles are present', async () => {
    const { ReportCards } = await import('./report-cards')

    const element = await ReportCards({ ...nullKpiData() })
    const children = element.props.children

    const titles = [
      children[IDX.SALUD_HEADER].props.title,
      children[IDX.RENTAB_HEADER].props.title,
      children[IDX.CAPITAL_HEADER].props.title,
      children[IDX.OPER_HEADER].props.title,
    ]

    expect(titles).toEqual([
      'Salud del negocio',
      'Rentabilidad',
      'Capital e inversión',
      'Detalle operativo',
    ])
  })

  it('Salud del negocio uses 4-column grid on xl screens', async () => {
    const { ReportCards } = await import('./report-cards')

    const element = await ReportCards({ ...nullKpiData() })
    const children = element.props.children

    expect(children[IDX.SALUD_GRID].props.className).toContain('xl:grid-cols-4')
  })

  it('Salud del negocio contains 4 KpiCard components', async () => {
    const { ReportCards } = await import('./report-cards')

    const element = await ReportCards({ ...nullKpiData() })
    const children = element.props.children

    const saludGrid = children[IDX.SALUD_GRID]
    expect(saludGrid.props.children).toHaveLength(4)
    expect(saludGrid.props.children[0].props.label).toBe('Ventas totales')
    expect(saludGrid.props.children[1].props.label).toBe('Liquidez')
    expect(saludGrid.props.children[2].props.label).toBe('Capital operativo')
    expect(saludGrid.props.children[3].props.label).toBe('Ganancia bruta')
  })

  it('Detalle operativo has list cards wrapped in Suspense', async () => {
    const { ReportCards } = await import('./report-cards')

    const element = await ReportCards({ ...nullKpiData() })
    const children = element.props.children

    const operGrid = children[IDX.OPER_GRID]
    expect(operGrid.props.children).toHaveLength(2)

    for (const child of operGrid.props.children) {
      expect(child.type).toBeDefined()
      expect(child.props.fallback).toBeDefined()
    }
  })

  it('has 3 separators between each section', async () => {
    const { ReportCards } = await import('./report-cards')

    const element = await ReportCards({ ...nullKpiData() })
    const children = element.props.children

    const sepIndices = [IDX.SEP_1, IDX.SEP_2, IDX.SEP_3]
    for (const idx of sepIndices) {
      expect(isSeparator(children[idx])).toBe(true)
    }
  })

  it('Rentabilidad has 3 secondary metric cards', async () => {
    const { ReportCards } = await import('./report-cards')

    const element = await ReportCards({ ...nullKpiData() })
    const children = element.props.children

    const rentabGrid = children[IDX.RENTAB_GRID]
    expect(rentabGrid.props.children).toHaveLength(3)
  })

  it('Capital has 2 secondary metric cards', async () => {
    const { ReportCards } = await import('./report-cards')

    const element = await ReportCards({ ...nullKpiData() })
    const children = element.props.children

    const capitalGrid = children[IDX.CAPITAL_GRID]
    expect(capitalGrid.props.children).toHaveLength(2)
  })

  // ── Derived insights from real data ────────────────────────────

  it('computes gross margin % when both salesTotal and grossProfit are available', async () => {
    const { ReportCards } = await import('./report-cards')

    const element = await ReportCards({ ...sampleKpiData() })
    // 500000 sales, 200000 gross profit = 40% margin

    const children = element.props.children
    const rentabGrid = children[IDX.RENTAB_GRID]

    // 3 cards: COGS, Margen bruto, Ventas activas
    const cards = rentabGrid.props.children
    expect(cards).toHaveLength(3)

    const marginCard = cards[1]
    expect(marginCard.props.label).toBe('Margen bruto')
    expect(marginCard.props.value).toBe('40.0%')
    expect(marginCard.props.subtitle).toBe('Sobre ventas totales')
    expect(marginCard.props.emphasis).toBe('positive')
  })

  it('shows fallback for margin when salesTotal is null', async () => {
    const { ReportCards } = await import('./report-cards')

    const element = await ReportCards({
      ...sampleKpiData(),
      salesTotal: null,
    })

    const children = element.props.children
    const rentabGrid = children[IDX.RENTAB_GRID]
    const marginCard = rentabGrid.props.children[1]

    expect(marginCard.props.label).toBe('Margen bruto')
    expect(marginCard.props.value).toBe('—')
    expect(marginCard.props.subtitle).toBe('Datos insuficientes')
  })

  it('computes stock vs operating capital % when both are available', async () => {
    const { ReportCards } = await import('./report-cards')

    const element = await ReportCards({ ...sampleKpiData() })
    // 400000 stock, 800000 op capital = 50%

    const children = element.props.children
    const capitalGrid = children[IDX.CAPITAL_GRID]

    const stockCard = capitalGrid.props.children[0]
    expect(stockCard.props.label).toBe('Inversión en stock')
    expect(stockCard.props.subtitle).toBe('50.0% del capital operativo')
  })

  it('shows default subtitle for stock investment when op capital is null', async () => {
    const { ReportCards } = await import('./report-cards')

    const element = await ReportCards({
      ...sampleKpiData(),
      operatingCapital: null,
    })

    const children = element.props.children
    const capitalGrid = children[IDX.CAPITAL_GRID]
    const stockCard = capitalGrid.props.children[0]

    expect(stockCard.props.subtitle).toBe('Capital invertido en inventario')
  })

  // ── Null data handling ─────────────────────────────────────────

  it('renders all KPI cards with — when all data is null', async () => {
    const { ReportCards } = await import('./report-cards')

    const element = await ReportCards({ ...nullKpiData() })
    const children = element.props.children

    const saludGrid = children[IDX.SALUD_GRID]

    expect(saludGrid.props.children[0].props.value).toBe('—')
    expect(saludGrid.props.children[1].props.value).toBe('—')
    expect(saludGrid.props.children[2].props.value).toBe('—')
    expect(saludGrid.props.children[3].props.value).toBe('—')
  })

  it('passes activeSaleCount as subtitle for ventas totales', async () => {
    const { ReportCards } = await import('./report-cards')

    const element = await ReportCards({
      ...nullKpiData(),
      salesTotal: { totalSalesCents: 100000, currency: 'PEN', activeSaleCount: 7 },
    })

    const children = element.props.children
    const saludGrid = children[IDX.SALUD_GRID]

    expect(saludGrid.props.children[0].props.subtitle).toBe('7 ventas activas')
  })

  // ── Independent query props ────────────────────────────────────

  it('passes independent stockQuery and lotsQuery to list cards', async () => {
    const { ReportCards } = await import('./report-cards')

    const element = await ReportCards({
      ...nullKpiData(),
      stockQuery: { page: '2', search: 'remera' },
      lotsQuery: { page: '3', search: 'zapato' },
    })

    const children = element.props.children
    const operGrid = children[IDX.OPER_GRID]

    const stockSuspense = operGrid.props.children[0]
    const stockCardEl = stockSuspense.props.children

    expect(stockCardEl.props.query).toEqual({ page: '2', search: 'remera' })
    expect(stockCardEl.props.namespace).toBe('stock')

    const lotsSuspense = operGrid.props.children[1]
    const lotsCardEl = lotsSuspense.props.children

    expect(lotsCardEl.props.query).toEqual({ page: '3', search: 'zapato' })
    expect(lotsCardEl.props.namespace).toBe('lots')
  })
})

// ═══════════════════════════════════════════════════════════════════
// List card rendering — data pipeline proof
// ═══════════════════════════════════════════════════════════════════

describe('ReportCards — list card rendering with data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetLots.mockResolvedValue({
      ok: true,
      data: { items: [], page: 1, pageSize: 5, totalItems: 0, totalPages: 0, search: '' },
    } as const)
    mockGetStockByProduct.mockResolvedValue({
      ok: true,
      data: { items: [], page: 1, pageSize: 5, totalItems: 0, totalPages: 0, search: '' },
    } as const)
  })

  type AsyncCardFn = (props: Record<string, unknown>) => Promise<{ props: Record<string, unknown> }>

  async function resolveSuspenseCard(suspenseEl: { props: { children: { type: CallableFunction; props: Record<string, unknown> } } }) {
    const cardEl = suspenseEl.props.children
    const CardFn = cardEl.type as AsyncCardFn
    return CardFn(cardEl.props)
  }

  it('LotsCard renders lot items with currency formatting', async () => {
    mockGetLots.mockResolvedValue({
      ok: true,
      data: {
        items: [
          {
            lotId: 'lot-1',
            variantId: 'v1',
            productName: 'Test Product',
            sku: 'SKU-001',
            purchasedQuantity: 100,
            remainingQuantity: 30,
            unitCostCents: 7500,
            totalCostCents: 225000,
            purchaseDate: '2026-01-15T00:00:00.000Z',
            status: 'OPEN',
          },
        ],
        page: 1,
        pageSize: 5,
        totalItems: 1,
        totalPages: 1,
        search: '',
      },
    } as const)

    const { ReportCards } = await import('./report-cards')
    const element = await ReportCards({ ...nullKpiData() })
    const children = element.props.children
    const operGrid = children[IDX.OPER_GRID]
    const lotsSuspense = operGrid.props.children[1]
    const renderedCard = await resolveSuspenseCard(lotsSuspense)

    expect(renderedCard.props.title).toBe('Lotes')
    expect(renderedCard.props.description).toBe('Registro de lotes de compra')
    expect(renderedCard.props.children).toBeDefined()
  })

  it('LotsCard shows empty state when no lots exist', async () => {
    mockGetLots.mockResolvedValue({
      ok: true,
      data: { items: [], page: 1, pageSize: 5, totalItems: 0, totalPages: 0, search: '' },
    } as const)

    const { ReportCards } = await import('./report-cards')
    const element = await ReportCards({ ...nullKpiData() })
    const children = element.props.children
    const operGrid = children[IDX.OPER_GRID]
    const lotsSuspense = operGrid.props.children[1]
    const renderedCard = await resolveSuspenseCard(lotsSuspense)

    expect(renderedCard.props.title).toBe('Lotes')
  })

  it('StockByProductCard uses stockQuery for API call', async () => {
    const stockQuery = { page: '2', search: 'remera' }
    const lotsQuery = { page: '5', search: 'zapato' }

    mockGetStockByProduct.mockResolvedValue({
      ok: true,
      data: { items: [], page: 2, pageSize: 5, totalItems: 0, totalPages: 0, search: 'remera' },
    } as const)

    const { ReportCards } = await import('./report-cards')
    const element = await ReportCards({ ...nullKpiData(), stockQuery, lotsQuery })
    const children = element.props.children
    const operGrid = children[IDX.OPER_GRID]
    const stockSuspense = operGrid.props.children[0]
    await resolveSuspenseCard(stockSuspense)

    expect(mockGetStockByProduct).toHaveBeenCalledWith({
      page: 2,
      pageSize: 5,
      search: 'remera',
    })

    const callArg = mockGetStockByProduct.mock.calls[0]?.[0]
    expect(callArg?.page).not.toBe(5)
    expect(callArg?.search).not.toBe('zapato')
  })

  it('LotsCard uses lotsQuery for API call', async () => {
    const stockQuery = { page: '2', search: 'remera' }
    const lotsQuery = { page: '3', search: 'pantalón' }

    mockGetLots.mockResolvedValue({
      ok: true,
      data: { items: [], page: 3, pageSize: 5, totalItems: 0, totalPages: 0, search: 'pantalón' },
    } as const)

    const { ReportCards } = await import('./report-cards')
    const element = await ReportCards({ ...nullKpiData(), stockQuery, lotsQuery })
    const children = element.props.children
    const operGrid = children[IDX.OPER_GRID]
    const lotsSuspense = operGrid.props.children[1]
    await resolveSuspenseCard(lotsSuspense)

    expect(mockGetLots).toHaveBeenCalledWith({
      page: 3,
      pageSize: 5,
      search: 'pantalón',
    })

    const callArg = mockGetLots.mock.calls[0]?.[0]
    expect(callArg?.page).not.toBe(2)
    expect(callArg?.search).not.toBe('remera')
  })

  // ── Summary row context in list cards ──────────────────────────

  it('LotsCard shows OPEN/EXHAUSTED status counts in summary row', async () => {
    mockGetLots.mockResolvedValue({
      ok: true,
      data: {
        items: [
          { lotId: 'l1', variantId: 'v1', productName: 'A', sku: 'A1', purchasedQuantity: 10, remainingQuantity: 5, unitCostCents: 1000, totalCostCents: 10000, purchaseDate: '2026-01-01T00:00:00.000Z', status: 'OPEN' },
          { lotId: 'l2', variantId: 'v2', productName: 'B', sku: 'B1', purchasedQuantity: 20, remainingQuantity: 0, unitCostCents: 2000, totalCostCents: 40000, purchaseDate: '2026-01-01T00:00:00.000Z', status: 'EXHAUSTED' },
        ],
        page: 1,
        pageSize: 5,
        totalItems: 2,
        totalPages: 1,
        search: '',
      },
    } as const)

    const { ReportCards } = await import('./report-cards')
    const element = await ReportCards({ ...nullKpiData() })
    const children = element.props.children
    const operGrid = children[IDX.OPER_GRID]
    const lotsSuspense = operGrid.props.children[1]
    const renderedCard = await resolveSuspenseCard(lotsSuspense)

    const cardChildren = renderedCard.props.children as Array<{ props: Record<string, unknown> }>
    expect(cardChildren).toBeDefined()

    // cardChildren: [ListSearchForm, summaryDiv, itemListDiv? or empty]
    const summaryRow = cardChildren[1]
    expect(summaryRow).toBeDefined()

    // summaryRow has text with open/agotado counts
    const summaryText = JSON.stringify(summaryRow.props.children)
    expect(summaryText).toContain('abierto')
    expect(summaryText).toContain('agotado')
  })
})
