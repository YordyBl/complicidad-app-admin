/**
 * Integration tests for the inventory lots page.
 *
 * Verifies:
 * 1. Data-loaded state with lot rows, variant groupings, and query context.
 * 2. Empty state when no lots exist.
 * 3. API-error state with visible error message.
 * 4. Query-context: productId/variantId extracted and passed to API.
 * 5. Allowed-action rendering: edit, compensate, and none actions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

import type { InventoryLotsResponse } from '@/shared/api/schemas'

// ── Hoisted mocks ──────────────────────────────────────────────

const { mockListInventoryLots } = vi.hoisted(() => ({
  mockListInventoryLots: vi.fn(),
}))

vi.mock('@/shared/api/inventory', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api/inventory')>()
  return {
    ...actual,
    listInventoryLots: mockListInventoryLots,
  }
})

// ── Imports ────────────────────────────────────────────────────

import InventoryLotsPage from './page'

// ── Test data factories ────────────────────────────────────────

function lotsResponse(overrides: Partial<InventoryLotsResponse> = {}): { ok: true; data: InventoryLotsResponse } {
  return {
    ok: true,
    data: {
      product: { id: 'prod-1', name: 'Remera Classic' },
      variants: [
        {
          variantId: 'var-1',
          sku: 'REM-CLA-M',
          attributes: { size: 'M', color: 'Negro' },
          stock: 35,
          lots: [
            {
              lotId: 'lot-1',
              variantId: 'var-1',
              productId: 'prod-1',
              productName: 'Remera Classic',
              sku: 'REM-CLA-M',
              attributes: { size: 'M', color: 'Negro' },
              purchasedQuantity: 20,
              remainingQuantity: 15,
              unitCost: 45.5,
              purchaseDate: '2025-06-01T00:00:00.000Z',
              state: 'INTACT' as const,
              allowedAction: 'edit' as const,
            },
            {
              lotId: 'lot-2',
              variantId: 'var-1',
              productId: 'prod-1',
              productName: 'Remera Classic',
              sku: 'REM-CLA-M',
              attributes: { size: 'M', color: 'Negro' },
              purchasedQuantity: 25,
              remainingQuantity: 20,
              unitCost: 42.0,
              purchaseDate: '2025-05-15T00:00:00.000Z',
              state: 'INTACT' as const,
              allowedAction: 'edit' as const,
            },
          ],
        },
        {
          variantId: 'var-2',
          sku: 'REM-CLA-L',
          attributes: { size: 'L', color: 'Negro' },
          stock: 12,
          lots: [
            {
              lotId: 'lot-3',
              variantId: 'var-2',
              productId: 'prod-1',
              productName: 'Remera Classic',
              sku: 'REM-CLA-L',
              attributes: { size: 'L', color: 'Negro' },
              purchasedQuantity: 15,
              remainingQuantity: 0,
              unitCost: 46.0,
              purchaseDate: '2025-04-10T00:00:00.000Z',
              state: 'EXHAUSTED' as const,
              allowedAction: 'none' as const,
            },
          ],
        },
        {
          variantId: 'var-3',
          sku: 'PAN-JEA-40',
          attributes: { size: '40' },
          stock: 5,
          lots: [
            {
              lotId: 'lot-4',
              variantId: 'var-3',
              productId: 'prod-2',
              productName: 'Pantalón Jean',
              sku: 'PAN-JEA-40',
              attributes: { size: '40' },
              purchasedQuantity: 10,
              remainingQuantity: 5,
              unitCost: 120.0,
              purchaseDate: '2025-03-01T00:00:00.000Z',
              state: 'HISTORICAL' as const,
              allowedAction: 'compensate' as const,
              reasonHint: 'Ajuste histórico por cierre de año',
            },
          ],
        },
      ],
      ...overrides,
    },
  } as const
}

function emptyResponse(): { ok: true; data: InventoryLotsResponse } {
  return {
    ok: true,
    data: {
      product: null,
      variants: [],
    },
  }
}

function errorResponse(message: string): { ok: false; error: { error: string; message: string; status: number } } {
  return {
    ok: false,
    error: { error: 'ServerError', message, status: 500 },
  }
}

// ── Render helper ──────────────────────────────────────────────

interface RenderPageOptions {
  rawParams?: Record<string, string>
}

async function renderPage(opts: RenderPageOptions = {}) {
  const { rawParams = {} } = opts
  const jsx = await InventoryLotsPage({ searchParams: Promise.resolve(rawParams) })
  return render(jsx)
}

// ═══════════════════════════════════════════════════════════════
// Query-context tests
// ═══════════════════════════════════════════════════════════════

describe('InventoryLotsPage — query context', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes productId to listInventoryLots when present', async () => {
    mockListInventoryLots.mockResolvedValue(lotsResponse())

    await InventoryLotsPage({
      searchParams: Promise.resolve({ productId: 'prod-1' }),
    })

    expect(mockListInventoryLots).toHaveBeenCalledWith({ productId: 'prod-1' })
  })

  it('passes variantId to listInventoryLots when present', async () => {
    mockListInventoryLots.mockResolvedValue(lotsResponse())

    await InventoryLotsPage({
      searchParams: Promise.resolve({
        productId: 'prod-1',
        variantId: 'var-1',
      }),
    })

    expect(mockListInventoryLots).toHaveBeenCalledWith({
      productId: 'prod-1',
      variantId: 'var-1',
    })
  })

  it('calls listInventoryLots with empty object when no query params', async () => {
    mockListInventoryLots.mockResolvedValue(lotsResponse())

    await InventoryLotsPage({ searchParams: Promise.resolve({}) })

    expect(mockListInventoryLots).toHaveBeenCalledWith({})
  })
})

// ═══════════════════════════════════════════════════════════════
// Data-loaded state — successful rendering
// ═══════════════════════════════════════════════════════════════

describe('InventoryLotsPage — data loaded', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListInventoryLots.mockResolvedValue(lotsResponse())
  })

  it('renders the InventoryLotsView client component when lots are loaded', async () => {
    await renderPage({ rawParams: { productId: 'prod-1' } })

    // InventoryLotsView renders with this data-testid
    expect(screen.getByTestId('inventory-lots-view')).toBeInTheDocument()
  })

  it('renders product name header when context product exists', async () => {
    await renderPage({ rawParams: { productId: 'prod-1' } })

    expect(screen.getByText(/Remera Classic/)).toBeInTheDocument()
  })

  it('renders the inventory lots page title', async () => {
    await renderPage({ rawParams: { productId: 'prod-1' } })

    expect(screen.getByRole('heading', { name: /stock en lotes/i })).toBeInTheDocument()
  })

  it('renders variant SKU labels in the view', async () => {
    await renderPage({ rawParams: { productId: 'prod-1' } })

    expect(screen.getByText('REM-CLA-M')).toBeInTheDocument()
    expect(screen.getByText('REM-CLA-L')).toBeInTheDocument()
  })

  it('renders lot state badges with correct text', async () => {
    await renderPage({ rawParams: { productId: 'prod-1' } })

    // Multiple INTACT badges (two lots)
    const intactBadges = screen.getAllByText('INTACT')
    expect(intactBadges.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('EXHAUSTED')).toBeInTheDocument()
  })

  it('renders back link to inventory', async () => {
    await renderPage({ rawParams: { productId: 'prod-1' } })

    const backLink = screen.getByText(/volver/i)
    expect(backLink).toBeInTheDocument()
    expect(backLink.closest('a')).toHaveAttribute('href', '/inventory')
  })
})

// ═══════════════════════════════════════════════════════════════
// Empty state
// ═══════════════════════════════════════════════════════════════

describe('InventoryLotsPage — empty state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListInventoryLots.mockResolvedValue(emptyResponse())
  })

  it('shows empty state message when no lots exist', async () => {
    const jsx = await InventoryLotsPage({
      searchParams: Promise.resolve({ productId: 'prod-nonexistent' }),
    })
    render(jsx)

    expect(screen.getByText(/no hay lotes/i)).toBeInTheDocument()
  })

  it('still renders page title in empty state', async () => {
    mockListInventoryLots.mockResolvedValue(emptyResponse())

    const jsx = await InventoryLotsPage({
      searchParams: Promise.resolve({}),
    })
    render(jsx)

    expect(screen.getByRole('heading', { name: /stock en lotes/i })).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════
// API-error state
// ═══════════════════════════════════════════════════════════════

describe('InventoryLotsPage — API error', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows error heading and backend message', async () => {
    mockListInventoryLots.mockResolvedValue(
      errorResponse('El servidor no está disponible'),
    )

    const jsx = await InventoryLotsPage({
      searchParams: Promise.resolve({}),
    })
    render(jsx)

    expect(screen.getByText(/error al cargar lotes/i)).toBeInTheDocument()
    expect(screen.getByText('El servidor no está disponible')).toBeInTheDocument()
  })

  it('does not render lot data in error state', async () => {
    mockListInventoryLots.mockResolvedValue(
      errorResponse('Error de conexión'),
    )

    const jsx = await InventoryLotsPage({
      searchParams: Promise.resolve({ productId: 'prod-1' }),
    })
    render(jsx)

    expect(screen.queryByText('REM-CLA-M')).not.toBeInTheDocument()
  })

  it('still renders back link in error state', async () => {
    mockListInventoryLots.mockResolvedValue(
      errorResponse('Error al cargar'),
    )

    const jsx = await InventoryLotsPage({
      searchParams: Promise.resolve({}),
    })
    render(jsx)

    expect(screen.getByText(/volver/i).closest('a')).toHaveAttribute(
      'href',
      '/inventory',
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// Allowed-action rendering
// ═══════════════════════════════════════════════════════════════

describe('InventoryLotsPage — allowed-action rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows edit action for lots with allowedAction="edit"', async () => {
    mockListInventoryLots.mockResolvedValue(lotsResponse())

    await renderPage({ rawParams: { productId: 'prod-1' } })

    // INTACT lots with edit action should show multiple edit triggers (one per lot)
    const editTriggers = screen.getAllByText(/editar/i)
    expect(editTriggers.length).toBeGreaterThanOrEqual(2)
  })

  it('shows compensate action for lots with allowedAction="compensate"', async () => {
    mockListInventoryLots.mockResolvedValue(lotsResponse())

    await renderPage({ rawParams: { productId: 'prod-1' } })

    // HISTORICAL lot with compensate action should show compensate trigger
    expect(screen.getByText(/compensar/i)).toBeInTheDocument()
  })

  it('shows "Nuevo ingreso" buttons for each variant', async () => {
    mockListInventoryLots.mockResolvedValue(lotsResponse())

    await renderPage({ rawParams: { productId: 'prod-1' } })

    // Each variant with canAdjust=true gets a "Nuevo ingreso" button
    // 3 variants in the test data
    const intakeButtons = screen.getAllByText(/nuevo ingreso/i)
    expect(intakeButtons.length).toBeGreaterThanOrEqual(3)
  })

  it('does not show action triggers for lots with allowedAction="none"', async () => {
    mockListInventoryLots.mockResolvedValue(
      lotsResponse({
        variants: [
          {
            variantId: 'var-exhausted',
            sku: 'EXH-SKU',
            attributes: {},
            stock: 0,
            lots: [
              {
                lotId: 'lot-exh',
                variantId: 'var-exhausted',
                productId: 'prod-1',
                productName: 'Test',
                sku: 'EXH-SKU',
                attributes: {},
                purchasedQuantity: 5,
                remainingQuantity: 0,
                unitCost: 10,
                purchaseDate: '2025-01-01T00:00:00.000Z',
                state: 'EXHAUSTED' as const,
                allowedAction: 'none' as const,
              },
            ],
          },
        ],
      }),
    )

    await renderPage({ rawParams: { productId: 'prod-1' } })

    // EXHAUSTED lots with no action should not show edit or compensate
    const editButtons = screen.queryAllByText(/editar/i)
    const compensateButtons = screen.queryAllByText(/compensar/i)
    expect(editButtons.length).toBe(0)
    expect(compensateButtons.length).toBe(0)
  })

  it('shows reason hint for historical lots', async () => {
    mockListInventoryLots.mockResolvedValue(lotsResponse())

    await renderPage({ rawParams: { productId: 'prod-1' } })

    expect(
      screen.getByText(/ajuste histórico por cierre de año/i),
    ).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════
// Action visibility — no role gating
// ═══════════════════════════════════════════════════════════════

describe('InventoryLotsPage — action visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows action triggers when lots have allowedAction', async () => {
    mockListInventoryLots.mockResolvedValue(lotsResponse())

    await renderPage({ rawParams: { productId: 'prod-1' } })

    // Multiple lots have edit action — action triggers should be visible
    const editTriggers = screen.getAllByText(/editar/i)
    expect(editTriggers.length).toBeGreaterThanOrEqual(2)
  })

  it('shows compensate action for historical lots', async () => {
    mockListInventoryLots.mockResolvedValue(lotsResponse())

    await renderPage({ rawParams: { productId: 'prod-1' } })

    expect(screen.getByText(/compensar/i)).toBeInTheDocument()
  })

  it('shows "Nuevo ingreso" buttons for each variant', async () => {
    mockListInventoryLots.mockResolvedValue(lotsResponse())

    await renderPage({ rawParams: { productId: 'prod-1' } })

    // Each variant gets a "Nuevo ingreso" button
    const intakeButtons = screen.getAllByText(/nuevo ingreso/i)
    expect(intakeButtons.length).toBeGreaterThanOrEqual(3)
  })

  it('does not show action triggers for lots with allowedAction="none"', async () => {
    mockListInventoryLots.mockResolvedValue(
      lotsResponse({
        variants: [
          {
            variantId: 'var-exhausted',
            sku: 'EXH-SKU',
            attributes: {},
            stock: 0,
            lots: [
              {
                lotId: 'lot-exh',
                variantId: 'var-exhausted',
                productId: 'prod-1',
                productName: 'Test',
                sku: 'EXH-SKU',
                attributes: {},
                purchasedQuantity: 5,
                remainingQuantity: 0,
                unitCost: 10,
                purchaseDate: '2025-01-01T00:00:00.000Z',
                state: 'EXHAUSTED' as const,
                allowedAction: 'none' as const,
              },
            ],
          },
        ],
      }),
    )

    await renderPage({ rawParams: { productId: 'prod-1' } })

    // EXHAUSTED lots with no action should not show edit or compensate
    const editButtons = screen.queryAllByText(/editar/i)
    const compensateButtons = screen.queryAllByText(/compensar/i)
    expect(editButtons.length).toBe(0)
    expect(compensateButtons.length).toBe(0)
  })
})
