/**
 * RTL tests for SaleListContent — garment display in Ventas list.
 *
 * Tests: single-item inline display, multi-item accordion, variant attributes,
 * displayLabel fallback, and empty items array.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Hoisted mock state ─────────────────────────────────────────────

const { mockListSales } = vi.hoisted(() => ({
  mockListSales: vi.fn(),
}))

// ── Mock shared/api/sales ──────────────────────────────────────────

vi.mock('@/shared/api/sales', () => ({
  listSales: mockListSales,
  saleChannelLabels: {
    tiktok: 'TikTok',
    facebook: 'Facebook',
    whatsapp: 'WhatsApp',
    web: 'Web',
    instagram: 'Instagram',
  },
  saleFormSchema: { safeParse: () => ({ success: true, data: {} }) },
  saleIdFormSchema: { safeParse: () => ({ success: true, data: {} }) },
  saleListSchema: { safeParse: (d: unknown) => ({ success: true, data: d }) },
  saleDetailSchema: { safeParse: () => ({ success: true, data: {} }) },
  createSale: vi.fn(),
  cancelSale: vi.fn(),
  returnSale: vi.fn(),
  getSale: vi.fn(),
}))

// ── Mock shared/api/formatters ─────────────────────────────────────

vi.mock('@/shared/api/formatters', () => ({
  formatCurrency: (cents: number) => `S/ ${(cents / 100).toFixed(2)}`,
  formatDateTime: (iso: string) => {
    const d = new Date(iso)
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  },
  formatDate: (iso: string) => iso.split('T')[0],
  formatPrice: (p: number) => `S/ ${p.toFixed(2)}`,
}))

// ── Mock next/link ─────────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: Record<string, unknown>) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').createElement('a', { href, ...props }, children),
}))

// ── Mock UI components ─────────────────────────────────────────────

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: Record<string, unknown>) => (
    <span data-testid="badge" data-variant={String(variant ?? '')}>{children as React.ReactNode}</span>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: Record<string, unknown>) => (
    <div data-testid="card" {...props}>{children as React.ReactNode}</div>
  ),
  CardContent: ({ children, ...props }: Record<string, unknown>) => (
    <div data-testid="card-content" {...props}>{children as React.ReactNode}</div>
  ),
  CardHeader: ({ children, ...props }: Record<string, unknown>) => (
    <div data-testid="card-header" {...props}>{children as React.ReactNode}</div>
  ),
  CardTitle: ({ children }: Record<string, unknown>) => (
    <div data-testid="card-title">{children as React.ReactNode}</div>
  ),
}))

vi.mock('@/components/ui/loading-state', () => ({
  LoadingState: () => <div data-testid="loading-state">Loading...</div>,
}))

vi.mock('@/components/ui/empty-state', () => ({
  EmptyState: ({ title, description }: { title?: string; description?: string }) => (
    <div data-testid="empty-state">
      <span>{title}</span>
      <span>{description}</span>
    </div>
  ),
}))

vi.mock('@/components/ui/error-state', () => ({
  ErrorState: ({ title, message }: { title?: string; message?: string }) => (
    <div data-testid="error-state">
      <span>{title}</span>
      <span>{message}</span>
    </div>
  ),
}))

// ── Mock lucide-react ────────────────────────────────────────────

vi.mock('lucide-react', async () => {
  return {
    ShoppingCart: () => <span data-testid="shopping-cart-icon" />,
    ArrowUpDown: () => <span data-testid="arrow-up-down-icon" />,
    ChevronDown: ({ className }: { className?: string }) => (
      <span data-testid="chevron-down-icon" className={className} />
    ),
  }
})

// ── Import component under test ────────────────────────────────────

import { SaleListContent } from './sale-list'

// ── Helpers ────────────────────────────────────────────────────────

function makeItem(overrides: Partial<{
  lineId: string
  variantId: string
  productName: string | null
  sku: string | null
  displayLabel: string
  attributes: Record<string, string>
  quantity: number
  unitPriceCents: number
  priceType: 'regular' | 'presale'
}> = {}) {
  return {
    lineId: overrides.lineId ?? 'line-uuid-1',
    variantId: overrides.variantId ?? 'var-uuid-1',
    productName: overrides.productName ?? 'Camiseta Clásica',
    sku: overrides.sku ?? 'CAM-CLA-M',
    displayLabel: overrides.displayLabel ?? 'Camiseta Clásica',
    attributes: overrides.attributes ?? { color: 'Blanco', size: 'M' },
    quantity: overrides.quantity ?? 2,
    unitPriceCents: overrides.unitPriceCents ?? 75000,
    priceType: overrides.priceType ?? 'regular',
  }
}

function makeSale(overrides: Record<string, unknown> = {}) {
  return {
    saleId: overrides.saleId ?? '550e8400-e29b-41d4-a716-446655440000',
    customerId: overrides.customerId ?? 'cust-uuid-1',
    channelReference: (overrides.channelReference ?? 'ML-123456') as string | null,
    channel: overrides.channel ?? 'web',
    status: overrides.status ?? 'ACTIVE',
    totalRevenueCents: overrides.totalRevenueCents ?? 150000,
    totalCostCents: overrides.totalCostCents ?? 120000,
    grossProfitCents: overrides.grossProfitCents ?? 30000,
    lineCount: overrides.lineCount ?? 1,
    createdAt: overrides.createdAt ?? '2025-03-15T12:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2025-03-15T12:30:00.000Z',
    items: (overrides.items ?? [makeItem()]) as ReturnType<typeof makeItem>[],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ═══════════════════════════════════════════════════════════════════

describe('SaleListContent — garment display', () => {
  // ── RED 3.3.1: Single item shows displayLabel directly in row ──────

  it('shows displayLabel for a sale with a single item', async () => {
    mockListSales.mockResolvedValueOnce({
      ok: true,
      data: [
        makeSale({
          items: [makeItem({ displayLabel: 'Camiseta Blanca M', productName: 'Camiseta Blanca M' })],
          lineCount: 1,
        }),
      ],
    })

    render(await SaleListContent({}))

    // The displayLabel should appear in the table
    expect(screen.getByText('Camiseta Blanca M')).toBeInTheDocument()
  })

  // ── RED 3.3.2: Multiple items show expandable accordion ────────────

  it('shows expandable dropdown for a sale with multiple items', async () => {
    mockListSales.mockResolvedValueOnce({
      ok: true,
      data: [
        makeSale({
          items: [
            makeItem({ lineId: 'line-1', displayLabel: 'Camiseta', quantity: 1 }),
            makeItem({ lineId: 'line-2', displayLabel: 'Pantalón', quantity: 1 }),
          ],
          lineCount: 2,
        }),
      ],
    })

    render(await SaleListContent({}))

    // Should show indicator that there are 2 items (instead of inline label)
    expect(screen.getByText(/2\s+prendas/i)).toBeInTheDocument()
  })

  // ── RED 3.3.3: Expanded accordion shows all item details ───────────

  it('expanding accordion reveals product names and variant attributes', async () => {
    mockListSales.mockResolvedValueOnce({
      ok: true,
      data: [
        makeSale({
          items: [
            makeItem({ lineId: 'line-1', displayLabel: 'Camiseta', attributes: { size: 'M', color: 'Rojo' } }),
            makeItem({ lineId: 'line-2', displayLabel: 'Pantalón', attributes: { size: 'L' } }),
          ],
          lineCount: 2,
        }),
      ],
    })

    render(await SaleListContent({}))

    // Click to expand the accordion
    const expandButton = screen.getByRole('button', { name: /2\s+prendas/i })
    await userEvent.click(expandButton)

    // After expanding, all item details should be visible
    expect(screen.getByText('Camiseta')).toBeInTheDocument()
    expect(screen.getByText('Pantalón')).toBeInTheDocument()
    // Variant attributes should appear
    expect(screen.getByText(/Rojo/)).toBeInTheDocument()
    expect(screen.getByText(/M/)).toBeInTheDocument()
  })

  // ── RED 3.3.3a: Accordion exposes aria-expanded state ──────────────

  it('accordion button exposes aria-expanded tracking toggle state', async () => {
    mockListSales.mockResolvedValueOnce({
      ok: true,
      data: [
        makeSale({
          items: [
            makeItem({ lineId: 'a', displayLabel: 'A' }),
            makeItem({ lineId: 'b', displayLabel: 'B' }),
          ],
          lineCount: 2,
        }),
      ],
    })

    render(await SaleListContent({}))

    const expandButton = screen.getByRole('button', { name: /2\s+prendas/i })

    // Before click — collapsed
    expect(expandButton.getAttribute('aria-expanded')).toBe('false')

    // Expand
    await userEvent.click(expandButton)
    expect(expandButton.getAttribute('aria-expanded')).toBe('true')

    // Collapse again
    await userEvent.click(expandButton)
    expect(expandButton.getAttribute('aria-expanded')).toBe('false')
  })

  // ── RED 3.3.3b: Accordion panel has id matching aria-controls ──────

  it('expanded panel id matches the button aria-controls', async () => {
    mockListSales.mockResolvedValueOnce({
      ok: true,
      data: [
        makeSale({
          items: [
            makeItem({ lineId: 'a', displayLabel: 'A' }),
            makeItem({ lineId: 'b', displayLabel: 'B' }),
          ],
          lineCount: 2,
        }),
      ],
    })

    render(await SaleListContent({}))

    const expandButton = screen.getByRole('button', { name: /2\s+prendas/i })

    // Before expanding, aria-controls exists but panel is not in DOM
    const controls = expandButton.getAttribute('aria-controls')
    expect(controls).toBeTruthy()
    expect(screen.queryByRole('region', { name: /detalle de prendas/i })).toBeNull()

    // Expand
    await userEvent.click(expandButton)

    // Panel is now in DOM with id matching aria-controls
    const panel = screen.getByRole('region', { name: /detalle de prendas/i })
    expect(panel).toBeInTheDocument()
    expect(panel.id).toBe(controls)
  })

  // ── RED 3.3.4: Fallback displayLabel when productName is null ──────

  it('shows fallback label when product metadata is missing', async () => {
    mockListSales.mockResolvedValueOnce({
      ok: true,
      data: [
        makeSale({
          items: [makeItem({
            productName: null,
            sku: 'OLD-SKU-001',
            displayLabel: 'OLD-SKU-001',
          })],
          lineCount: 1,
        }),
      ],
    })

    render(await SaleListContent({}))

    // Should show the SKU as fallback displayLabel
    expect(screen.getByText('OLD-SKU-001')).toBeInTheDocument()
  })

  // ── RED 3.3.5: "Variante sin datos" ultimate fallback ─────────────

  it('shows "Variante sin datos" when no product metadata exists', async () => {
    mockListSales.mockResolvedValueOnce({
      ok: true,
      data: [
        makeSale({
          items: [makeItem({
            productName: null,
            sku: null,
            displayLabel: 'Variante sin datos',
          })],
          lineCount: 1,
        }),
      ],
    })

    render(await SaleListContent({}))

    expect(screen.getByText('Variante sin datos')).toBeInTheDocument()
  })

  // ── RED 3.3.6: Empty items array still renders sale row ────────────

  it('renders sale row even when items array is empty', async () => {
    mockListSales.mockResolvedValueOnce({
      ok: true,
      data: [
        makeSale({
          items: [],
          lineCount: 0,
        }),
      ],
    })

    render(await SaleListContent({}))

    // Sale ID link should still appear
    const saleIdLink = screen.getByText(/550e8400/)
    expect(saleIdLink).toBeInTheDocument()

    // Should show a "sin detalles" or "—" indicator
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  // ── RED 3.3.7: Variant attributes displayed with label ─────────────

  it('displays variant attributes as key: value badges', async () => {
    mockListSales.mockResolvedValueOnce({
      ok: true,
      data: [
        makeSale({
          items: [makeItem({
            attributes: { talle: 'XL', color: 'Negro' },
            displayLabel: 'Remera',
          })],
          lineCount: 1,
        }),
      ],
    })

    render(await SaleListContent({}))

    // Inline display: variant details should appear with the item
    expect(screen.getByText('Remera')).toBeInTheDocument()
    expect(screen.getByText(/XL/)).toBeInTheDocument()
  })

  // ── RED 3.3.8: Preserves existing table columns ────────────────────

  it('preserves existing table columns: ID, Canal, Estado, Ingreso, Costo, Ganancia, Líneas, Fecha', async () => {
    mockListSales.mockResolvedValueOnce({
      ok: true,
      data: [
        makeSale({
          saleId: '11111111-2222-3333-4444-555555555555',
          channel: 'tiktok',
          status: 'ACTIVE',
          totalRevenueCents: 200000,
          totalCostCents: 150000,
          grossProfitCents: 50000,
          lineCount: 1,
          createdAt: '2025-03-15T12:00:00.000Z',
          items: [makeItem({ displayLabel: 'Test Product' })],
        }),
      ],
    })

    render(await SaleListContent({}))

    // Check table headers exist
    expect(screen.getByText('ID')).toBeInTheDocument()
    expect(screen.getByText('Canal')).toBeInTheDocument()
    expect(screen.getByText('Estado')).toBeInTheDocument()
    expect(screen.getByText('Ingreso')).toBeInTheDocument()
    expect(screen.getByText('Costo')).toBeInTheDocument()
    expect(screen.getByText('Ganancia')).toBeInTheDocument()
    expect(screen.getByText('Líneas')).toBeInTheDocument()
    expect(screen.getByText('Fecha')).toBeInTheDocument()

    // Check content: channel label
    expect(screen.getByText('TikTok')).toBeInTheDocument()
    // Check formatted currency
    expect(screen.getByText('S/ 2000.00')).toBeInTheDocument()
    expect(screen.getByText('S/ 1500.00')).toBeInTheDocument()
    expect(screen.getByText('S/ 500.00')).toBeInTheDocument()
    // Status badge
    expect(screen.getByText('Activa')).toBeInTheDocument()
    // Item
    expect(screen.getByText('Test Product')).toBeInTheDocument()
  })
})
