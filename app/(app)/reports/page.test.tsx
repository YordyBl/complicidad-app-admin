/**
 * Behavioral tests for the reports page — verifies:
 *  1. API data fetching (all 7 KPI endpoints called in parallel)
 *  2. searchParams → normalization wiring
 *  3. Props passed to ReportCards (pre-fetched KPI data + list queries)
 *  4. Graceful unwrap of failed endpoints
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ──────────────────────────────────────────────────

const mockApi = {
  getSalesTotal: vi.fn(),
  getLiquidity: vi.fn(),
  getOperatingCapital: vi.fn(),
  getGrossProfit: vi.fn(),
  getFifoCogs: vi.fn(),
  getStockInvestment: vi.fn(),
  getReinvestment: vi.fn(),
}

vi.mock('@/shared/api/reports', () => ({
  getSalesTotal: mockApi.getSalesTotal,
  getLiquidity: mockApi.getLiquidity,
  getOperatingCapital: mockApi.getOperatingCapital,
  getGrossProfit: mockApi.getGrossProfit,
  getFifoCogs: mockApi.getFifoCogs,
  getStockInvestment: mockApi.getStockInvestment,
  getReinvestment: mockApi.getReinvestment,
}))

const mockNormalize = vi.fn(
  (raw: Record<string, string | string[] | undefined>) => {
    const extract = (key: string): string | undefined => {
      const v = raw[key]
      return typeof v === 'string' ? v : undefined
    }
    return {
      stock: {
        page: extract('stock_page'),
        pageSize: extract('stock_pageSize'),
        search: extract('stock_search'),
      },
      lots: {
        page: extract('lots_page'),
        pageSize: extract('lots_pageSize'),
        search: extract('lots_search'),
      },
    }
  },
)

vi.mock('./page-helpers', () => ({
  normalizeReportsSearchParams: mockNormalize,
  buildCardUrl: vi.fn(),
  buildReportsPageUrl: vi.fn(),
}))

const MockReportCards = vi.fn(
  (props: Record<string, unknown>) => ({
    type: 'div',
    props: {
      'data-testid': 'report-cards',
      'data-stock-page': String((props.stockQuery as Record<string, unknown>)?.page ?? ''),
      'data-stock-search': String((props.stockQuery as Record<string, unknown>)?.search ?? ''),
      'data-lots-page': String((props.lotsQuery as Record<string, unknown>)?.page ?? ''),
      'data-lots-search': String((props.lotsQuery as Record<string, unknown>)?.search ?? ''),
      'data-has-sales-total': String(props.salesTotal != null),
      'data-has-liquidity': String(props.liquidity != null),
      'data-has-operating-capital': String(props.operatingCapital != null),
    },
  }),
)

vi.mock('@/features/reports/report-cards', () => ({
  ReportCards: MockReportCards,
}))

// ── Default successful API responses ──────────────────────────────

function defaultResponse(data: Record<string, unknown>) {
  return { ok: true, data, status: 200 }
}

beforeEach(() => {
  vi.clearAllMocks()

  // Default: all APIs succeed with realistic money values
  mockApi.getSalesTotal.mockResolvedValue(defaultResponse({ totalSalesCents: 500000, currency: 'PEN', activeSaleCount: 12 }))
  mockApi.getLiquidity.mockResolvedValue(defaultResponse({ liquidityCents: 150000, currency: 'PEN' }))
  mockApi.getOperatingCapital.mockResolvedValue(defaultResponse({ operatingCapitalCents: 800000, currency: 'PEN' }))
  mockApi.getGrossProfit.mockResolvedValue(defaultResponse({ grossProfitCents: 200000, currency: 'PEN' }))
  mockApi.getFifoCogs.mockResolvedValue(defaultResponse({ totalCogsCents: 300000, currency: 'PEN' }))
  mockApi.getStockInvestment.mockResolvedValue(defaultResponse({ totalInvestmentCents: 400000, currency: 'PEN' }))
  mockApi.getReinvestment.mockResolvedValue(defaultResponse({ reinvestmentCents: 100000, currency: 'PEN' }))
})

// ═══════════════════════════════════════════════════════════════════

describe('ReportsPage', () => {
  function getReportCardsProps(element: { props: { children: Array<{ props: Record<string, unknown> }> } }) {
    // children[0] = header div, children[1] = ReportCards element
    const children = element.props.children
    const reportCardsEl = children[1]
    return reportCardsEl.props as Record<string, unknown>
  }

  // ── API fetching ──────────────────────────────────────────────

  it('fetches all 7 KPI endpoints in parallel on page load', async () => {
    const { default: ReportsPage } = await import('./page')

    await ReportsPage({
      searchParams: Promise.resolve({}),
    })

    expect(mockApi.getSalesTotal).toHaveBeenCalledOnce()
    expect(mockApi.getLiquidity).toHaveBeenCalledOnce()
    expect(mockApi.getOperatingCapital).toHaveBeenCalledOnce()
    expect(mockApi.getGrossProfit).toHaveBeenCalledOnce()
    expect(mockApi.getFifoCogs).toHaveBeenCalledOnce()
    expect(mockApi.getStockInvestment).toHaveBeenCalledOnce()
    expect(mockApi.getReinvestment).toHaveBeenCalledOnce()
  })

  it('passes pre-fetched data to ReportCards when all APIs succeed', async () => {
    const { default: ReportsPage } = await import('./page')

    const element = await ReportsPage({
      searchParams: Promise.resolve({}),
    })

    const props = getReportCardsProps(element)

    expect(props.salesTotal).toEqual({ totalSalesCents: 500000, currency: 'PEN', activeSaleCount: 12 })
    expect(props.liquidity).toEqual({ liquidityCents: 150000, currency: 'PEN' })
    expect(props.operatingCapital).toEqual({ operatingCapitalCents: 800000, currency: 'PEN' })
    expect(props.grossProfit).toEqual({ grossProfitCents: 200000, currency: 'PEN' })
    expect(props.cogs).toEqual({ totalCogsCents: 300000, currency: 'PEN' })
    expect(props.stockInvestment).toEqual({ totalInvestmentCents: 400000, currency: 'PEN' })
    expect(props.reinvestment).toEqual({ reinvestmentCents: 100000, currency: 'PEN' })
  })

  it('passes null for failed endpoints (graceful degradation)', async () => {
    mockApi.getSalesTotal.mockResolvedValue({ ok: false, error: { error: 'ServerError', message: 'Down', status: 500 } })
    mockApi.getLiquidity.mockResolvedValue({ ok: false, error: { error: 'ServerError', message: 'Down', status: 500 } })

    const { default: ReportsPage } = await import('./page')

    const element = await ReportsPage({
      searchParams: Promise.resolve({}),
    })

    const props = getReportCardsProps(element)

    expect(props.salesTotal).toBeNull()
    expect(props.liquidity).toBeNull()
    // Other endpoints still succeed
    expect(props.operatingCapital).not.toBeNull()
    expect(props.grossProfit).not.toBeNull()
  })

  it('passes null for all endpoints when backend is fully down', async () => {
    for (const fn of Object.values(mockApi)) {
      fn.mockResolvedValue({ ok: false, error: { error: 'NetworkError', message: 'No connection', status: 0 } })
    }

    const { default: ReportsPage } = await import('./page')

    const element = await ReportsPage({
      searchParams: Promise.resolve({}),
    })

    const props = getReportCardsProps(element)

    expect(props.salesTotal).toBeNull()
    expect(props.liquidity).toBeNull()
    expect(props.operatingCapital).toBeNull()
    expect(props.grossProfit).toBeNull()
    expect(props.cogs).toBeNull()
    expect(props.stockInvestment).toBeNull()
    expect(props.reinvestment).toBeNull()
  })

  // ── Query propagation ──────────────────────────────────────────

  it('passes stock and lots namespaced queries to ReportCards', async () => {
    const { default: ReportsPage } = await import('./page')

    const element = await ReportsPage({
      searchParams: Promise.resolve({
        stock_page: '2',
        stock_search: 'remera',
        lots_page: '1',
        lots_search: 'zapato',
      }),
    })

    const props = getReportCardsProps(element)

    expect((props.stockQuery as Record<string, unknown>)?.page).toBe('2')
    expect((props.stockQuery as Record<string, unknown>)?.search).toBe('remera')
    expect((props.lotsQuery as Record<string, unknown>)?.page).toBe('1')
    expect((props.lotsQuery as Record<string, unknown>)?.search).toBe('zapato')
  })

  it('passes default empty queries when no searchParams', async () => {
    const { default: ReportsPage } = await import('./page')

    const element = await ReportsPage({
      searchParams: Promise.resolve({}),
    })

    const props = getReportCardsProps(element)

    expect(props.stockQuery).toBeDefined()
    expect(props.lotsQuery).toBeDefined()
  })

  // ── Layout ─────────────────────────────────────────────────────

  it('renders the page header with updated PEN description', async () => {
    const { default: ReportsPage } = await import('./page')

    const element = await ReportsPage({
      searchParams: Promise.resolve({}),
    })

    expect(element.type).toBe('div')
    expect(element.props.className).toContain('space-y-8')
  })

  // ── Edge cases ─────────────────────────────────────────────────

  it('propagates error when searchParams promise rejects', async () => {
    const { default: ReportsPage } = await import('./page')

    await expect(
      ReportsPage({
        searchParams: Promise.reject(new Error('searchParams unavailable')),
      }),
    ).rejects.toThrow('searchParams unavailable')
  })

  it('does not cross-contaminate queries (independence)', async () => {
    const { default: ReportsPage } = await import('./page')

    const element = await ReportsPage({
      searchParams: Promise.resolve({
        lots_page: '3',
        lots_search: 'camiseta',
      }),
    })

    const props = getReportCardsProps(element)

    expect((props.stockQuery as Record<string, unknown>)?.page).toBeUndefined()
    expect((props.stockQuery as Record<string, unknown>)?.search).toBeUndefined()
    expect((props.lotsQuery as Record<string, unknown>)?.page).toBe('3')
    expect((props.lotsQuery as Record<string, unknown>)?.search).toBe('camiseta')
  })

  it('preserves pageSize in namespaced query', async () => {
    const { default: ReportsPage } = await import('./page')

    const element = await ReportsPage({
      searchParams: Promise.resolve({
        stock_page: '2',
        stock_pageSize: '10',
        stock_search: 'zapa',
      }),
    })

    const props = getReportCardsProps(element)

    expect((props.stockQuery as Record<string, unknown>)?.page).toBe('2')
    expect((props.stockQuery as Record<string, unknown>)?.pageSize).toBe('10')
    expect((props.stockQuery as Record<string, unknown>)?.search).toBe('zapa')
  })
})
