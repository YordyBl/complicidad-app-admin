/**
 * Component tests for the ProductRow.
 *
 * Verifies:
 * 1. Product name rendered as a link to product detail.
 * 2. Variant table with SKU, attributes, stock, price.
 * 3. Per-variant "Ver lotes" links into /inventory/lots with productId and variantId.
 * 4. Edge cases: no variants, empty attributes, inactive variants.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import type { ProductListItem } from '@/shared/api/schemas'

// ── Mock next/link to render plain <a> tags ──────────────────

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react').createElement('a', { href, ...props }, children)
  },
}))

// ── Mock next/formatters (formatPrice called via product-row) ─

vi.mock('@/shared/api/formatters', () => ({
  formatPrice: (value: number) =>
    `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
}))

// ── Accordion wrapper for ProductRow ─────────────────────────

import { Accordion } from '@/components/ui/accordion'

// ── Import under test ────────────────────────────────────────

import { ProductRow } from './product-row'

// ── Render helper — wraps ProductRow in Accordion (required by AccordionItem) ─

function renderProductRow(product: ProductListItem) {
  return render(
    <Accordion type="multiple">
      <ProductRow product={product} />
    </Accordion>,
  )
}

// ── Test data factories ──────────────────────────────────────

function makeProduct(overrides: Partial<ProductListItem> = {}): ProductListItem {
  return {
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
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════
// Product name link
// ═══════════════════════════════════════════════════════════════

describe('ProductRow — product name link', () => {
  it('renders product name as a link to product detail', () => {
    const product = makeProduct()
    renderProductRow(product)

    const nameLink = screen.getByText('Remera Classic')
    expect(nameLink).toBeInTheDocument()
    expect(nameLink.closest('a')).toHaveAttribute(
      'href',
      '/inventory/products/prod-1',
    )
  })

  it('renders product description when present', () => {
    const product = makeProduct()
    renderProductRow(product)

    expect(
      screen.getByText('Remera de algodón premium'),
    ).toBeInTheDocument()
  })

  it('does not render description when null', () => {
    const product = makeProduct({ description: null })
    renderProductRow(product)

    expect(
      screen.queryByText('Remera de algodón premium'),
    ).not.toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════
// Variant table rendering
// ═══════════════════════════════════════════════════════════════

describe('ProductRow — variant table', () => {
  beforeEach(() => {
    const product = makeProduct()
    renderProductRow(product)
    // Expand accordion so variant content is visible
    fireEvent.click(screen.getByRole('button', { name: /remera classic/i }))
  })

  it('renders variant SKUs', () => {
    expect(screen.getByText('REM-CLA-M')).toBeInTheDocument()
    expect(screen.getByText('REM-CLA-L')).toBeInTheDocument()
  })

  it('renders variant stock numbers', () => {
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('renders formatted price for each variant', () => {
    const priceElements = screen.getAllByText(/S\/\s*250[,.]00/)
    expect(priceElements.length).toBeGreaterThanOrEqual(2)
  })

  it('renders variant attributes as badges', () => {
    expect(screen.getByText(/size:\s*M/i)).toBeInTheDocument()
    const colorBadges = screen.getAllByText(/color:\s*Negro/i)
    expect(colorBadges.length).toBe(2)
  })

  it('shows ordered variant attributes', () => {
    cleanup()
    renderProductRow(
      makeProduct({
        variants: [
          {
            id: 'var-3',
            sku: 'SKU-3',
            attributes: { size: 'XL', material: 'Algodón' },
            isActive: true,
            stock: 5,
          },
        ],
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: /remera classic/i }))

    expect(screen.getByText(/size.*XL/i)).toBeInTheDocument()
    expect(screen.getByText(/material.*Algodón/i)).toBeInTheDocument()
  })

  it('marks inactive variant with "(inactivo)" label', () => {
    cleanup()
    renderProductRow(
      makeProduct({
        variants: [
          {
            id: 'var-inactive',
            sku: 'INACTIVE-SKU',
            attributes: {},
            isActive: false,
            stock: 0,
          },
        ],
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: /remera classic/i }))

    expect(screen.getByText('(inactivo)')).toBeInTheDocument()
  })

  it('shows "Sin variantes" when product has no variants', () => {
    cleanup()
    renderProductRow(makeProduct({ variants: [] }))
    fireEvent.click(screen.getByRole('button', { name: /remera classic/i }))

    expect(screen.getByText('Sin variantes')).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════
// Ver lotes per-variant entrypoints
// ═══════════════════════════════════════════════════════════════

describe('ProductRow — Ver lotes per-variant links', () => {
  beforeEach(() => {
    const product = makeProduct()
    renderProductRow(product)
    // Expand accordion so variant content is visible
    fireEvent.click(screen.getByRole('button', { name: /remera classic/i }))
  })

  it('renders "Ver lotes" link for each variant', () => {
    const lotesLinks = screen.getAllByText('Ver lotes')
    expect(lotesLinks.length).toBe(2)
  })

  it('first variant "Ver lotes" link includes productId and variantId', () => {
    const lotesLinks = screen.getAllByText('Ver lotes')
    const firstLink = lotesLinks[0].closest('a')
    expect(firstLink).toHaveAttribute(
      'href',
      expect.stringContaining('productId=prod-1'),
    )
    expect(firstLink).toHaveAttribute(
      'href',
      expect.stringContaining('variantId=var-1'),
    )
  })

  it('second variant "Ver lotes" link uses its own variantId', () => {
    const lotesLinks = screen.getAllByText('Ver lotes')
    const secondLink = lotesLinks[1].closest('a')
    expect(secondLink).toHaveAttribute(
      'href',
      expect.stringContaining('variantId=var-2'),
    )
  })

  it('"Ver lotes" links point to /inventory/lots', () => {
    const lotesLinks = screen.getAllByText('Ver lotes')
    const firstLink = lotesLinks[0].closest('a')
    expect(firstLink).toHaveAttribute(
      'href',
      expect.stringContaining('/inventory/lots'),
    )
  })

  it('does not render "Ver lotes" when no variants', () => {
    cleanup()
    renderProductRow(makeProduct({ variants: [] }))
    fireEvent.click(screen.getByRole('button', { name: /remera classic/i }))

    expect(screen.queryByText('Ver lotes')).not.toBeInTheDocument()
  })

  it('renders correct number of lotes links matching variant count', () => {
    cleanup()
    renderProductRow(
      makeProduct({
        variants: [
          {
            id: 'var-a',
            sku: 'SKU-A',
            attributes: { size: 'S' },
            isActive: true,
            stock: 10,
          },
          {
            id: 'var-b',
            sku: 'SKU-B',
            attributes: { size: 'M' },
            isActive: true,
            stock: 20,
          },
          {
            id: 'var-c',
            sku: 'SKU-C',
            attributes: { size: 'L' },
            isActive: false,
            stock: 0,
          },
        ],
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: /remera classic/i }))

    const lotesLinks = screen.getAllByText('Ver lotes')
    expect(lotesLinks.length).toBe(3)
  })

  it('Ver lotes link for inactive variants still links correctly', () => {
    cleanup()
    renderProductRow(
      makeProduct({
        variants: [
          {
            id: 'var-inact',
            sku: 'INACT-SKU',
            attributes: {},
            isActive: false,
            stock: 0,
          },
        ],
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: /remera classic/i }))

    const lotesLink = screen.getByText('Ver lotes')
    const link = lotesLink.closest('a')
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('variantId=var-inact'),
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// Edge cases
// ═══════════════════════════════════════════════════════════════

describe('ProductRow — edge cases', () => {
  it('handles product with many variants', () => {
    cleanup()
    renderProductRow(
      makeProduct({
        variants: Array.from({ length: 10 }, (_, i) => ({
          id: `var-${i}`,
          sku: `SKU-${i}`,
          attributes: { size: String(i) },
          isActive: true,
          stock: i * 2,
        })),
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: /remera classic/i }))

    const lotesLinks = screen.getAllByText('Ver lotes')
    expect(lotesLinks.length).toBe(10)
  })

  it('handles variant with empty attributes', () => {
    cleanup()
    renderProductRow(
      makeProduct({
        variants: [
          {
            id: 'var-empty',
            sku: 'EMPTY-ATTR',
            attributes: {},
            isActive: true,
            stock: 0,
          },
        ],
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: /remera classic/i }))

    // Empty attributes should not render any attribute badges
    const badgeElements = screen.queryAllByText(/size|color|material/i)
    expect(badgeElements.length).toBe(0)
    // "Ver lotes" should still be present
    expect(screen.getByText('Ver lotes')).toBeInTheDocument()
  })
})
