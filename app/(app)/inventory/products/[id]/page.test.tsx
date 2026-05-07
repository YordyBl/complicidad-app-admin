/**
 * Integration tests for the product detail page.
 *
 * Verifies rendering of product info, variants table,
 * empty state (no variants), and error states (404, 500).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

import type { ProductListItem } from '@/shared/api/schemas'

// ── Hoisted mocks ────────────────────────────────────────────

const { mockGetProductById } = vi.hoisted(() => ({
  mockGetProductById: vi.fn(),
}))

vi.mock('@/shared/api/inventory', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api/inventory')>()
  return {
    ...actual,
    getProductById: mockGetProductById,
  }
})

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react').createElement('a', { href, ...props }, children)
  },
}))

// ── Import page ──────────────────────────────────────────────

import ProductDetailPage from './page'

// ── Test data factories ──────────────────────────────────────

function successResponse(
  product: Partial<ProductListItem> = {},
): { ok: true; data: ProductListItem | null } {
  return {
    ok: true,
    data: {
      id: 'prod-1',
      name: 'Remera Classic',
      description: 'Remera de algodón premium',
      baseSku: 'remera-classic',
      salePrice: 250,
      presalePrice: 450,
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-06-01T00:00:00.000Z',
      variants: [
        {
          id: 'var-1',
          sku: 'REM-CLA-M',
          attributes: { size: 'M', color: 'Negro' },
          isActive: true,
          stock: 15,
        },
        {
          id: 'var-2',
          sku: 'REM-CLA-L',
          attributes: { size: 'L', color: 'Negro' },
          isActive: true,
          stock: 8,
        },
      ],
      ...product,
    },
  } as const
}

function notFoundResponse(): { ok: false; error: { error: string; message: string; status: number } } {
  return {
    ok: false,
    error: { error: 'NotFound', message: 'Producto no encontrado', status: 404 },
  }
}

function errorResponse(
  message: string,
  status: number = 500,
): { ok: false; error: { error: string; message: string; status: number } } {
  return {
    ok: false,
    error: { error: 'ServerError', message, status },
  }
}

function noVariantsProduct(): { ok: true; data: ProductListItem | null } {
  return successResponse({
    variants: [],
  })
}

// ── Render helper ────────────────────────────────────────────

async function renderPage(id: string = 'prod-1') {
  const jsx = await ProductDetailPage({ params: Promise.resolve({ id }) })
  return render(jsx)
}

// ═══════════════════════════════════════════════════════════════

describe('ProductDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Product info rendering ─────────────────────────────────

  it('renders product name and description', async () => {
    mockGetProductById.mockResolvedValue(successResponse())

    await renderPage()

    expect(screen.getByText('Remera Classic')).toBeInTheDocument()
    expect(screen.getByText('Remera de algodón premium')).toBeInTheDocument()
  })

  it('renders sale price and presale price in PEN', async () => {
    mockGetProductById.mockResolvedValue(successResponse())

    await renderPage()

    expect(screen.getByText(/S\/\s*250[,.]00/)).toBeInTheDocument()
    expect(screen.getByText(/S\/\s*450[,.]00/)).toBeInTheDocument()
  })

  it('renders base SKU and status', async () => {
    mockGetProductById.mockResolvedValue(successResponse())

    await renderPage()

    expect(screen.getByText(/remera-classic/i)).toBeInTheDocument()

    // "Activo" appears for the product badge and per-variant status
    const activeBadges = screen.getAllByText('Activo')
    expect(activeBadges.length).toBeGreaterThanOrEqual(1)
  })

  // ── Variants table ─────────────────────────────────────────

  it('renders variants table with SKU and attributes', async () => {
    mockGetProductById.mockResolvedValue(successResponse())

    await renderPage()

    expect(screen.getByText('REM-CLA-M')).toBeInTheDocument()
    expect(screen.getByText('REM-CLA-L')).toBeInTheDocument()

    // Attributes rendered in the table
    expect(screen.getByText(/size.*M/i)).toBeInTheDocument()

    // Table headers
    expect(screen.getByText('SKU')).toBeInTheDocument()
    expect(screen.getByText('Atributos')).toBeInTheDocument()
  })

  // ── Empty state — no variants ──────────────────────────────

  it('shows empty state message when product has no variants', async () => {
    mockGetProductById.mockResolvedValue(noVariantsProduct())

    await renderPage()

    // Message appears in both CardDescription and the empty state div
    const emptyMessages = screen.getAllByText(/no.*variantes.*registradas/i)
    expect(emptyMessages.length).toBeGreaterThanOrEqual(1)
    // Product name still renders
    expect(screen.getByText('Remera Classic')).toBeInTheDocument()
  })

  // ── 404 — product not found ────────────────────────────────

  it('shows not-found message on 404 from API', async () => {
    mockGetProductById.mockResolvedValue(notFoundResponse())

    await renderPage('999')

    expect(screen.getByText(/producto no encontrado/i)).toBeInTheDocument()
    // Should have a link back to product list
    expect(screen.getByRole('link', { name: /volver a productos/i })).toHaveAttribute(
      'href',
      '/inventory',
    )
  })

  // ── 500 — server error ─────────────────────────────────────

  it('shows server error message on API failure', async () => {
    mockGetProductById.mockResolvedValue(errorResponse('Database connection timeout'))

    await renderPage()

    expect(screen.getByText(/error al cargar el producto/i)).toBeInTheDocument()
    expect(screen.getByText('Database connection timeout')).toBeInTheDocument()
    // Should have a link back to product list
    expect(screen.getByRole('link', { name: /volver a productos/i })).toHaveAttribute(
      'href',
      '/inventory',
    )
  })
})
