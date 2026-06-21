/**
 * Behavioral tests for the reports page — verifies searchParams→normalization
 * wiring and that the page renders a meaningful layout.
 *
 * The actual normalization logic is covered by page-helpers.test.ts.
 * ReportCards component has its own tests in features/reports/.
 * This test proves the page correctly wires namespaced queries together.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mock for page-helpers ──────────────────────────────────

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

// ── Mock ReportCards ───────────────────────────────────────────────

const MockReportCards = vi.fn(
  ({
    stockQuery,
    lotsQuery,
  }: {
    stockQuery?: Record<string, unknown>
    lotsQuery?: Record<string, unknown>
  }) => ({
    type: 'div',
    props: {
      'data-testid': 'report-cards',
      'data-stock-page': String(stockQuery?.page ?? ''),
      'data-stock-search': String(stockQuery?.search ?? ''),
      'data-lots-page': String(lotsQuery?.page ?? ''),
      'data-lots-search': String(lotsQuery?.search ?? ''),
    },
  }),
)

vi.mock('@/features/reports/report-cards', () => ({
  ReportCards: MockReportCards,
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// ═══════════════════════════════════════════════════════════════════

describe('ReportsPage', () => {
  // ── Helper: extract ReportCards props from the rendered page element ──

  function getReportCardsProps(element: { props: { children: Array<{ props: Record<string, unknown> }> } }) {
    const children = element.props.children
    // children[0] = header div, children[1] = ReportCards element
    const reportCardsEl = children[1]
    // React.createElement stores component props directly, not the component's return value.
    // So reportCardsEl.props = { stockQuery: ..., lotsQuery: ... }
    return reportCardsEl.props as {
      stockQuery?: Record<string, unknown>
      lotsQuery?: Record<string, unknown>
    }
  }

  // ── Behavioral: query propagation ──────────────────────────────────

  it('calls normalizeReportsSearchParams with raw searchParams', async () => {
    const { default: ReportsPage } = await import('./page')

    await ReportsPage({
      searchParams: Promise.resolve({
        stock_page: '3',
        stock_search: 'camiseta',
      }),
    })

    expect(mockNormalize).toHaveBeenCalledWith({
      stock_page: '3',
      stock_search: 'camiseta',
    })
  })

  it('calls normalizeReportsSearchParams with empty searchParams', async () => {
    const { default: ReportsPage } = await import('./page')

    await ReportsPage({
      searchParams: Promise.resolve({}),
    })

    expect(mockNormalize).toHaveBeenCalledWith({})
  })

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

    const rcp = getReportCardsProps(element)

    // stock query is passed as stockQuery prop
    expect(rcp.stockQuery?.page).toBe('2')
    expect(rcp.stockQuery?.search).toBe('remera')

    // lots query is passed as lotsQuery prop — INDEPENDENT from stock
    expect(rcp.lotsQuery?.page).toBe('1')
    expect(rcp.lotsQuery?.search).toBe('zapato')
  })

  // ── Layout: general structure ──────────────────────────────────────

  it('renders page without error for empty searchParams', async () => {
    const { default: ReportsPage } = await import('./page')

    const element = await ReportsPage({
      searchParams: Promise.resolve({}),
    })

    expect(element).toBeDefined()

    // The page root is a div with the layout className
    expect(element.type).toBe('div')
    expect(element.props.className).toContain('space-y-6')
  })

  it('renders without error for search params', async () => {
    const { default: ReportsPage } = await import('./page')

    const element = await ReportsPage({
      searchParams: Promise.resolve({
        stock_page: '2',
        stock_search: 'zapatilla',
      }),
    })

    expect(element).toBeDefined()
  })

  // ── Edge case: rejected searchParams ───────────────────────────────

  it('propagates error when searchParams promise rejects', async () => {
    const { default: ReportsPage } = await import('./page')

    await expect(
      ReportsPage({
        searchParams: Promise.reject(new Error('searchParams unavailable')),
      }),
    ).rejects.toThrow('searchParams unavailable')
  })

  // ── Default queries when no searchParams ───────────────────────────

  it('passes default empty queries when no params', async () => {
    const { default: ReportsPage } = await import('./page')

    const element = await ReportsPage({
      searchParams: Promise.resolve({}),
    })

    const rcp = getReportCardsProps(element)

    // Both queries should be empty when no params
    expect(rcp.stockQuery).toBeDefined()
    expect(rcp.lotsQuery).toBeDefined()
    expect(rcp.stockQuery?.page).toBeUndefined()
    expect(rcp.lotsQuery?.page).toBeUndefined()
  })

  // ── Independence: only lots params set ─────────────────────────────

  it('does not cross-contaminate stock query when only lots params are set', async () => {
    const { default: ReportsPage } = await import('./page')

    const element = await ReportsPage({
      searchParams: Promise.resolve({
        lots_page: '3',
        lots_search: 'camiseta',
      }),
    })

    const rcp = getReportCardsProps(element)

    // stock should be empty since only lots params were in the URL
    expect(rcp.stockQuery?.page).toBeUndefined()
    expect(rcp.stockQuery?.search).toBeUndefined()
    // lots should have the values
    expect(rcp.lotsQuery?.page).toBe('3')
    expect(rcp.lotsQuery?.search).toBe('camiseta')
  })

  // ── Independence: only stock params set ─────────────────────────────

  it('does not cross-contaminate lots query when only stock params are set', async () => {
    const { default: ReportsPage } = await import('./page')

    const element = await ReportsPage({
      searchParams: Promise.resolve({
        stock_page: '2',
        stock_search: 'pantalón',
      }),
    })

    const rcp = getReportCardsProps(element)

    expect(rcp.stockQuery?.page).toBe('2')
    expect(rcp.stockQuery?.search).toBe('pantalón')
    expect(rcp.lotsQuery?.page).toBeUndefined()
    expect(rcp.lotsQuery?.search).toBeUndefined()
  })

  // ── pageSize preservation ──────────────────────────────────────────

  it('preserves pageSize in namespaced query passed to ReportCards', async () => {
    const { default: ReportsPage } = await import('./page')

    const element = await ReportsPage({
      searchParams: Promise.resolve({
        stock_page: '2',
        stock_pageSize: '10',
        stock_search: 'zapa',
      }),
    })

    const rcp = getReportCardsProps(element)

    expect(rcp.stockQuery?.page).toBe('2')
    expect(rcp.stockQuery?.pageSize).toBe('10')
    expect(rcp.stockQuery?.search).toBe('zapa')
  })
})
