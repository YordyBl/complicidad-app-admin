/**
 * Unit and integration tests for the inventory page.
 *
 * Verifies:
 * 1. Pure functions (buildPageUrl, normalizeSearchParams) — directly tested.
 * 2. Component states (list, empty, error, pagination) — rendered with
 *    mocked listProducts to prove production InventoryPage behavior.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import type { ProductListQuery, ProductListResponse } from '@/shared/api/schemas'

// ── Hoisted mock for listProducts ────────────────────────────

const { mockListProducts } = vi.hoisted(() => ({
  mockListProducts: vi.fn(),
}))

vi.mock('@/shared/api/inventory', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api/inventory')>()
  return {
    ...actual,
    listProducts: mockListProducts,
  }
})

// ── Imports (after mocks) ────────────────────────────────────

import InventoryPage from './page'
import { buildPageUrl, normalizeSearchParams } from './page-helpers'

// ── Test data factories ──────────────────────────────────────

function successResponse(overrides: Partial<ProductListResponse> = {}): { ok: true; data: ProductListResponse } {
  const overrideData = overrides.data
  const overrideMeta = overrides.meta
  return {
    ok: true,
    data: {
      data: [
        {
          id: 'prod-1',
          name: 'Remera Classic',
          description: 'Remera de algodón premium',
          baseSku: 'remera-classic',
          salePrice: 250,
          presalePrice: null,
          isActive: true,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-06-01T00:00:00.000Z',
          variants: [
            { id: 'var-1', sku: 'REM-CLA-M', attributes: { size: 'M' }, isActive: true, stock: 15 },
            { id: 'var-2', sku: 'REM-CLA-L', attributes: { size: 'L' }, isActive: true, stock: 8 },
          ],
        },
        {
          id: 'prod-2',
          name: 'Pantalón Jean',
          description: null,
          baseSku: 'pantalon-jean',
          salePrice: 450,
          presalePrice: null,
          isActive: false,
          createdAt: '2025-02-01T00:00:00.000Z',
          updatedAt: '2025-05-01T00:00:00.000Z',
          variants: [
            { id: 'var-3', sku: 'PAN-JEA-40', attributes: { size: '40' }, isActive: true, stock: 22 },
          ],
        },
        ...(overrideData ?? []),
      ],
      meta: {
        page: 1,
        pageSize: 20,
        totalItems: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        filters: { status: 'active', search: '' },
        ...overrideMeta,
      },
    },
  } as const
}

function errorResponse(message: string): { ok: false; error: { error: string; message: string; status: number } } {
  return {
    ok: false,
    error: { error: 'ServerError', message, status: 500 },
  }
}

function emptyResponse(): { ok: true; data: ProductListResponse } {
  return {
    ok: true,
    data: {
      data: [],
      meta: {
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        filters: { status: 'active', search: '' },
      },
    },
  }
}

function paginatedResponse(
  page: number,
  totalPages: number,
  totalItems: number,
): { ok: true; data: ProductListResponse } {
  const hasNextPage = page < totalPages
  const hasPreviousPage = page > 1
  return {
    ok: true,
    data: {
      data: Array.from({ length: Math.min(20, totalItems - (page - 1) * 20) }, (_, i) => ({
        id: `prod-page${page}-${i + 1}`,
        name: `Producto ${(page - 1) * 20 + i + 1}`,
        description: null,
        baseSku: `prod-${(page - 1) * 20 + i + 1}`,
        salePrice: 100 + i,
        presalePrice: null,
        isActive: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        variants: [{ id: `var-${i + 1}`, sku: `SKU-${(page - 1) * 20 + i + 1}`, attributes: {}, isActive: true, stock: 10 }],
      })),
      meta: {
        page,
        pageSize: 20,
        totalItems,
        totalPages,
        hasNextPage,
        hasPreviousPage,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        filters: { status: 'active', search: '' },
      },
    },
  }
}

// ── Render helper (async Server Component) ───────────────────

async function renderPage(rawParams: Record<string, string> = {}) {
  mockListProducts.mockResolvedValue(successResponse())
  const jsx = await InventoryPage({ searchParams: Promise.resolve(rawParams) })
  return render(jsx)
}

// ═══════════════════════════════════════════════════════════════
// Pure function tests — PRODUCTION code, not copies
// ═══════════════════════════════════════════════════════════════

describe('buildPageUrl (production)', () => {
  it('returns base /inventory with no params', () => {
    const result = buildPageUrl({}, {})
    expect(result).toBe('/inventory')
  })

  it('preserves existing page param and overrides to new page', () => {
    const current: ProductListQuery = { page: '1', pageSize: '20' }
    const result = buildPageUrl(current, { page: '2' })
    expect(result).toContain('page=2')
    expect(result).toContain('pageSize=20')
  })

  it('preserves search and status filters across page changes', () => {
    const current: ProductListQuery = { search: 'shirt', status: 'all', sortBy: 'name' }
    const result = buildPageUrl(current, { page: '3' })
    expect(result).toContain('page=3')
    expect(result).toContain('search=shirt')
    expect(result).toContain('status=all')
    expect(result).toContain('sortBy=name')
  })

  it('omits empty string and undefined params', () => {
    const current: ProductListQuery = { page: '1', search: '', status: undefined }
    const result = buildPageUrl(current, { page: '2' })
    expect(result).not.toContain('search=')
    expect(result).not.toContain('status=')
    expect(result).toContain('page=2')
  })

  it('adds new params via overrides', () => {
    const current: ProductListQuery = {}
    const result = buildPageUrl(current, { search: 'test', sortOrder: 'asc' })
    expect(result).toContain('search=test')
    expect(result).toContain('sortOrder=asc')
  })

  it('returns clean /inventory when all params are empty', () => {
    const current: ProductListQuery = { page: '', search: '', status: undefined }
    const result = buildPageUrl(current, {})
    expect(result).toBe('/inventory')
  })

  it('supports ellipsis-style navigation across page numbers', () => {
    const current: ProductListQuery = { page: '5', pageSize: '10' }
    const result = buildPageUrl(current, { page: '7' })
    expect(result).toContain('page=7')
    expect(result).toContain('pageSize=10')
  })
})

describe('normalizeSearchParams (production)', () => {
  it('returns empty ProductListQuery for empty raw params', () => {
    const result = normalizeSearchParams({})
    expect(result).toEqual({})
  })

  it('extracts string params as-is', () => {
    const result = normalizeSearchParams({
      page: '2',
      pageSize: '10',
      search: 'shirt',
      status: 'all',
      sortBy: 'name',
      sortOrder: 'asc',
    })
    expect(result).toEqual({
      page: '2',
      pageSize: '10',
      search: 'shirt',
      status: 'all',
      sortBy: 'name',
      sortOrder: 'asc',
    })
  })

  it('filters out string[] params (Next.js edge case)', () => {
    const result = normalizeSearchParams({
      page: ['1', '2'] as unknown as string,
      search: 'jeans',
    })
    expect(result.page).toBeUndefined()
    expect(result.search).toBe('jeans')
  })

  it('returns undefined for non-string values', () => {
    const result = normalizeSearchParams({
      page: 1 as unknown as string,
      search: true as unknown as string,
    })
    expect(result.page).toBeUndefined()
    expect(result.search).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════
// Component integration tests — production InventoryPage
// ═══════════════════════════════════════════════════════════════

describe('InventoryPage — product list rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders product names and descriptions in accordion triggers', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    // Product names in accordion triggers
    expect(screen.getByText('Remera Classic')).toBeInTheDocument()
    expect(screen.getByText('Pantalón Jean')).toBeInTheDocument()

    // Product description (only first product has one)
    expect(screen.getByText('Remera de algodón premium')).toBeInTheDocument()
  })

  it('renders formatted prices in PEN', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    expect(screen.getByText(/S\/\s*250[,.]00/)).toBeInTheDocument()
    expect(screen.getByText(/S\/\s*450[,.]00/)).toBeInTheDocument()
  })

  it('renders status badges (Activo/Inactivo)', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    // Badges inside accordion (not the filter links — both match "Activo")
    const badges = screen.getAllByText('Activo')
    // At least one badge should be the inline <span> (not the <a> filter link)
    const activeBadgeSpan = badges.find((el) => el.tagName === 'SPAN')
    expect(activeBadgeSpan).toBeInTheDocument()
    // Same approach for "Inactivo" — find the <span> badge among duplicates
    const inactiveElements = screen.getAllByText('Inactivo')
    const inactiveBadgeSpan = inactiveElements.find((el) => el.tagName === 'SPAN')
    expect(inactiveBadgeSpan).toBeInTheDocument()
  })

  it('shows total item count in card description', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    expect(screen.getByText('2 productos encontrados.')).toBeInTheDocument()
  })
})

describe('InventoryPage — accordion expand/collapse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows variant SKUs when product is expanded', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    // SKUs are inside accordion content — initially hidden
    expect(screen.queryByText('REM-CLA-M')).not.toBeInTheDocument()

    // Expand first product by clicking the trigger button
    const trigger = screen.getByRole('button', { name: /remera classic/i })
    fireEvent.click(trigger)

    // Now variants should be visible
    expect(screen.getByText('REM-CLA-M')).toBeInTheDocument()
    expect(screen.getByText('REM-CLA-L')).toBeInTheDocument()
  })

  it('shows stock numbers in expanded variant rows', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    // Expand product
    const trigger = screen.getByRole('button', { name: /remera classic/i })
    fireEvent.click(trigger)

    // Stock values should be visible
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('shows variant attributes as badges when expanded', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    // Expand product
    const trigger = screen.getByRole('button', { name: /remera classic/i })
    fireEvent.click(trigger)

    // Attribute badges should appear
    expect(screen.getByText('size: M')).toBeInTheDocument()
    expect(screen.getByText('size: L')).toBeInTheDocument()
  })

  it('supports multiple products expanded simultaneously', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    // Expand both products
    const trigger1 = screen.getByRole('button', { name: /remera classic/i })
    const trigger2 = screen.getByRole('button', { name: /pantalón jean/i })
    fireEvent.click(trigger1)
    fireEvent.click(trigger2)

    // Both should show their variants
    expect(screen.getByText('REM-CLA-M')).toBeInTheDocument()
    expect(screen.getByText('PAN-JEA-40')).toBeInTheDocument()
  })
})

describe('InventoryPage — empty state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows accessible empty state with action link', async () => {
    mockListProducts.mockResolvedValue(emptyResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    // Empty state heading
    expect(screen.getByText('No se encontraron productos')).toBeInTheDocument()

    // Helper text for new user
    expect(screen.getByText('Comenzá registrando tu primer producto.')).toBeInTheDocument()

    // Link to create product
    const registerLink = screen.getByText('Registrar producto')
    expect(registerLink).toBeInTheDocument()
    expect(registerLink.closest('a')).toHaveAttribute('href', '/inventory/products/new')
  })

  it('shows search-specific empty message when search param is set', async () => {
    mockListProducts.mockResolvedValue(emptyResponse())

    const jsx = await InventoryPage({
      searchParams: Promise.resolve({ search: 'xyz' }),
    })
    render(jsx)

    expect(screen.getByText('No hay resultados para "xyz".')).toBeInTheDocument()
  })

  it('shows 0 productos text in card description', async () => {
    mockListProducts.mockResolvedValue(emptyResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    expect(screen.getByText('No se encontraron productos.')).toBeInTheDocument()
  })
})

describe('InventoryPage — error state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows error heading and message', async () => {
    mockListProducts.mockResolvedValue(errorResponse('Database connection timeout'))

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    // Error heading
    expect(screen.getByText('Error al cargar productos')).toBeInTheDocument()

    // Error detail message
    expect(screen.getByText('Database connection timeout')).toBeInTheDocument()
  })

  it('still renders action cards in error state', async () => {
    mockListProducts.mockResolvedValue(errorResponse('Server error'))

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    // Action cards remain accessible even on error
    expect(screen.getByText('Nuevo producto')).toBeInTheDocument()
    expect(screen.getByText('Registrar compra')).toBeInTheDocument()
  })

  it('does not render product table in error state', async () => {
    mockListProducts.mockResolvedValue(errorResponse('Server error'))

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('InventoryPage — search input', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a search input with placeholder', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    const input = screen.getByPlaceholderText('Buscar productos...')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'text')
  })

  it('shows current search term from URL params', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({ search: 'remera' }) })
    render(jsx)

    expect(screen.getByPlaceholderText('Buscar productos...')).toHaveValue('remera')
  })

  it('search input is empty when no search param', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    expect(screen.getByPlaceholderText('Buscar productos...')).toHaveValue('')
  })

  it('search form submits with GET to preserve server rendering', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    const form = screen.getByRole('search')
    expect(form).toHaveAttribute('method', 'GET')
  })

  it('renders a search submit button with Search icon', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    const submitButton = screen.getByRole('button', { name: /buscar/i })
    expect(submitButton).toBeInTheDocument()
  })

  it('search input has name="search" for form submission', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    expect(screen.getByPlaceholderText('Buscar productos...')).toHaveAttribute('name', 'search')
  })

  it('search form action is /inventory', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    const form = screen.getByRole('search')
    expect(form).toHaveAttribute('action', '/inventory')
  })

  it('handles search terms with special characters from URL', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({ search: 'remera+clásica' }) })
    render(jsx)

    expect(screen.getByPlaceholderText('Buscar productos...')).toHaveValue('remera+clásica')
  })
})

describe('InventoryPage — status filter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders status filter links: Todos, Activo, Inactivo', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    expect(screen.getByRole('link', { name: /^todos$/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^activo$/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^inactivo$/i })).toBeInTheDocument()
  })

  it('marks current status link with aria-current="page"', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({ status: 'active' }) })
    render(jsx)

    const activeLink = screen.getByRole('link', { name: /^activo$/i })
    expect(activeLink).toHaveAttribute('aria-current', 'page')
  })

  it('marks Todos as current when no status param', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    const todosLink = screen.getByRole('link', { name: /todos/i })
    expect(todosLink).toHaveAttribute('aria-current', 'page')
  })

  it('status filter links preserve existing search param', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({ search: 'remera' }) })
    render(jsx)

    const activeLink = screen.getByRole('link', { name: /^activo$/i })
    expect(activeLink.getAttribute('href')).toContain('search=remera')
  })

  it('status filter links reset page to 1 when changing filter', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({ page: '2', status: 'active' }) })
    render(jsx)

    // "Todos" clears status and resets page to 1 (filter change resets pagination)
    const todosLink = screen.getByRole('link', { name: /^todos$/i })
    expect(todosLink.getAttribute('href')).not.toContain('page=')
    expect(todosLink.getAttribute('href')).not.toContain('status=')
  })

  it('"Activo" link has aria-current="page" when status=active', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({ status: 'active' }) })
    render(jsx)

    const activeLink = screen.getByRole('link', { name: /^activo$/i })
    expect(activeLink).toHaveAttribute('aria-current', 'page')
    // "Todos" and "Inactivo" should NOT have aria-current
    const todosLink = screen.getByRole('link', { name: /^todos$/i })
    expect(todosLink).not.toHaveAttribute('aria-current')
    const inactiveLink = screen.getByRole('link', { name: /^inactivo$/i })
    expect(inactiveLink).not.toHaveAttribute('aria-current')
  })

  it('"Inactivo" link has aria-current="page" when status=inactive', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({ status: 'inactive' }) })
    render(jsx)

    const inactiveLink = screen.getByRole('link', { name: /^inactivo$/i })
    expect(inactiveLink).toHaveAttribute('aria-current', 'page')
  })

  it('"Activo" link preserves search param and resets page', async () => {
    mockListProducts.mockResolvedValue(successResponse())

    const jsx = await InventoryPage({ searchParams: Promise.resolve({ search: 'jeans', page: '3', status: 'all' }) })
    render(jsx)

    const activeLink = screen.getByRole('link', { name: /^activo$/i })
    const href = activeLink.getAttribute('href') ?? ''
    expect(href).toContain('search=jeans')
    expect(href).toContain('status=active')
    // Page reset to 1
    expect(href).not.toContain('page=')
  })
})

describe('InventoryPage — pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders pagination nav when totalPages > 1', async () => {
    mockListProducts.mockResolvedValue(paginatedResponse(1, 2, 25))

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    // Page info
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()

    // Next link visible
    expect(screen.getByLabelText('Página siguiente')).toBeInTheDocument()

    // Previous should be disabled (first page)
    const prevButton = screen.getByLabelText('Página anterior')
    expect(prevButton).toBeInTheDocument()
    expect(prevButton).toHaveAttribute('aria-disabled', 'true')
  })

  it('shows page numbers for multi-page lists', async () => {
    mockListProducts.mockResolvedValue(paginatedResponse(1, 3, 45))

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    // Page numbers rendered as links (text "1" also appears in Stock column)
    const pageOnes = screen.getAllByText('1')
    expect(pageOnes.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('current page has aria-current="page"', async () => {
    mockListProducts.mockResolvedValue(paginatedResponse(2, 3, 45))

    const jsx = await InventoryPage({
      searchParams: Promise.resolve({ page: '2' }),
    })
    render(jsx)

    // Page 2 should be marked as current
    const currentPageLink = screen.getByText('2')
    expect(currentPageLink).toHaveAttribute('aria-current', 'page')
  })

  it('does not render pagination when totalPages <= 1', async () => {
    mockListProducts.mockResolvedValue(successResponse()) // totalPages = 1

    const jsx = await InventoryPage({ searchParams: Promise.resolve({}) })
    render(jsx)

    expect(screen.queryByLabelText('Paginación de productos')).not.toBeInTheDocument()
  })
})
