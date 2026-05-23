/**
 * Behavioral tests for the sales page — verifies searchParams→normalization
 * wiring and that the page renders a meaningful layout.
 *
 * The actual normalization logic is covered by page-helpers.test.ts.
 * Individual components (SaleList, ReversalForm, etc.) have their own tests.
 * This test proves the page correctly wires them together.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mock for page-helpers ──────────────────────────────────

const mockNormalize = vi.fn((raw: Record<string, string | string[] | undefined>) => raw)

vi.mock('./page-helpers', () => ({
  normalizeSalesSearchParams: mockNormalize,
  buildSalesPageUrl: vi.fn(),
}))

// ── Mock external dependencies ─────────────────────────────────────

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: Record<string, unknown>) => ({
    type: 'a',
    props: { href, ...props },
    children,
  }),
}))

vi.mock('lucide-react', () => ({
  ShoppingCart: () => ({ type: 'span' }),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: Record<string, unknown>) => ({
    type: 'div',
    props: { className: 'card' },
    children,
  }),
  CardContent: ({ children }: Record<string, unknown>) => ({
    type: 'div',
    props: { className: 'card-content' },
    children,
  }),
  CardDescription: ({ children }: Record<string, unknown>) => ({
    type: 'p',
    props: { className: 'card-desc' },
    children,
  }),
  CardHeader: ({ children }: Record<string, unknown>) => ({
    type: 'div',
    props: { className: 'card-header' },
    children,
  }),
  CardTitle: ({ children }: Record<string, unknown>) => ({
    type: 'h3',
    props: { className: 'card-title' },
    children,
  }),
}))

vi.mock('@/features/sales/reversal-form', () => ({
  ReversalForm: ({ action }: { action: string }) => ({
    type: 'div',
    props: { 'data-action': action, 'data-testid': 'reversal-form' },
  }),
}))

vi.mock('@/features/sales/sale-list', () => ({
  SaleList: ({ query }: { query?: Record<string, unknown> }) => ({
    type: 'div',
    props: {
      'data-testid': 'sale-list',
      'data-query-page': String(query?.page ?? ''),
      'data-query-status': String(query?.status ?? ''),
      'data-query-payment-status': String(query?.paymentStatus ?? ''),
      'data-query-sort-order': String(query?.sortOrder ?? ''),
    },
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// ═══════════════════════════════════════════════════════════════════

describe('SalesPage', () => {
  // ── Behavioral: query propagation ──────────────────────────────────

  it('calls normalizeSalesSearchParams with raw searchParams', async () => {
    const { default: SalesPage } = await import('./page')

    await SalesPage({
      searchParams: Promise.resolve({
        page: '3',
        status: 'ACTIVE',
        paymentStatus: 'pending',
      }),
    })

    expect(mockNormalize).toHaveBeenCalledWith({
      page: '3',
      status: 'ACTIVE',
      paymentStatus: 'pending',
    })
  })

  it('calls normalizeSalesSearchParams with empty searchParams', async () => {
    const { default: SalesPage } = await import('./page')

    await SalesPage({
      searchParams: Promise.resolve({}),
    })

    expect(mockNormalize).toHaveBeenCalledWith({})
  })

  it('calls normalizeSalesSearchParams with sort and pagination params', async () => {
    const { default: SalesPage } = await import('./page')

    await SalesPage({
      searchParams: Promise.resolve({
        page: '1',
        pageSize: '10',
        sortBy: 'totalRevenueCents',
        sortOrder: 'desc',
        search: 'camiseta',
      }),
    })

    expect(mockNormalize).toHaveBeenCalledWith({
      page: '1',
      pageSize: '10',
      sortBy: 'totalRevenueCents',
      sortOrder: 'desc',
      search: 'camiseta',
    })
  })

  // ── Layout: general structure ──────────────────────────────────────

  it('renders page without error for empty searchParams', async () => {
    const { default: SalesPage } = await import('./page')

    const element = await SalesPage({
      searchParams: Promise.resolve({}),
    })

    expect(element).toBeDefined()

    // The page root is a div with the layout className
    expect(element.type).toBe('div')
    expect(element.props.className).toContain('space-y-6')
  })

  it('renders without error for complex searchParams', async () => {
    const { default: SalesPage } = await import('./page')

    const element = await SalesPage({
      searchParams: Promise.resolve({
        page: '2',
        status: 'ACTIVE',
        paymentStatus: 'partial',
        sortBy: 'createdAt',
        sortOrder: 'asc',
      }),
    })

    expect(element).toBeDefined()
  })

  // ── Edge case: rejected searchParams ───────────────────────────────

  it('propagates error when searchParams promise rejects', async () => {
    const { default: SalesPage } = await import('./page')

    await expect(
      SalesPage({
        searchParams: Promise.reject(new Error('searchParams unavailable')),
      }),
    ).rejects.toThrow('searchParams unavailable')
  })
})
