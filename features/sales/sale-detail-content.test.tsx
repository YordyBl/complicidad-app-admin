/**
 * UI tests for SaleDetailContent — constancia history, customer data,
 * and line item display labels.
 *
 * Covers task 3.2 and 4.1 acceptance criteria.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// ── Hoisted mock for clipboard ──────────────────────────────────────
const mockClipboardWriteText = vi.fn()
Object.assign(navigator, {
  clipboard: { writeText: mockClipboardWriteText },
})

// ── Import component under test ─────────────────────────────────────
import { SaleDetailContent } from './sale-detail-content'
import type { SaleDetail, SaleConstanciaEmissionSummary } from '@/shared/api/schemas'

// ── Helpers ─────────────────────────────────────────────────────────

function makeSaleDetail(overrides: Partial<SaleDetail> = {}): SaleDetail {
  return {
    id: 'sale-uuid-0001',
    customerId: 'cust-uuid-0001',
    channelReference: null,
    channel: 'web',
    status: 'ACTIVE',
    totalRevenueCents: 150000,
    totalCostCents: 120000,
    grossProfitCents: 30000,
    createdAt: '2025-03-15T12:00:00.000Z',
    updatedAt: '2025-03-15T12:30:00.000Z',
    customerName: 'Juan Pérez',
    customerPhone: '+549112345678',
    customerAddress: 'Av. Corrientes 1234',
    customerDistrict: 'CABA',
    googleMapsUrl: 'https://maps.google.com/?q=Av.+Corrientes+1234',
    lines: [
      {
        id: 'line-uuid-1',
        variantId: 'var-uuid-1',
        quantity: 2,
        unitPriceCents: 75000,
        priceType: 'regular',
        totalPriceCents: 150000,
        totalCostCents: 100000,
        displayLabel: 'Camiseta Blanca',
        productName: 'Camiseta',
        sku: 'CAM-BLA-M',
        attributes: { color: 'Blanco', size: 'M' },
        consumptions: [],
      },
    ],
    ...overrides,
  }
}

function makeEmissionSummary(overrides: Partial<SaleConstanciaEmissionSummary> = {}): SaleConstanciaEmissionSummary {
  return {
    id: 'emission-uuid-0001',
    emissionNumber: 1,
    issuedAt: '2025-05-15T12:00:00.000Z',
    templateVersion: 'v1',
    ...overrides,
  }
}

// ── Tests ───────────────────────────────────────────────────────────

// Pre-existing test guard: sale-detail-content.test.tsx is new — no safety net needed

describe('SaleDetailContent — customer data', () => {
  it('renders customer name from enriched sale detail', () => {
    render(<SaleDetailContent sale={makeSaleDetail()} />)
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
  })

  it('renders customer address with district when both present', () => {
    render(<SaleDetailContent sale={makeSaleDetail()} />)
    expect(screen.getByText(/Av\. Corrientes 1234/)).toBeInTheDocument()
    expect(screen.getByText(/CABA/)).toBeInTheDocument()
  })

  it('handles missing customer data gracefully', () => {
    render(
      <SaleDetailContent
        sale={makeSaleDetail({
          customerName: null,
          customerAddress: null,
          customerDistrict: null,
          customerPhone: null,
          googleMapsUrl: null,
        })}
      />,
    )
    // Should render without crashing — no customer data section
    expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument()
  })

  it('renders Google Maps URL when present', () => {
    render(<SaleDetailContent sale={makeSaleDetail()} />)
    expect(screen.getByText(/google\.com\/\?q=/)).toBeInTheDocument()
  })
})

describe('SaleDetailContent — line display labels', () => {
  it('renders garment display label in line items table', () => {
    render(<SaleDetailContent sale={makeSaleDetail()} />)
    expect(screen.getByText('Camiseta Blanca')).toBeInTheDocument()
  })

  it('renders variantId fallback when displayLabel is null', () => {
    const { container } = render(
      <SaleDetailContent
        sale={makeSaleDetail({
          lines: [
            {
              id: 'line-uuid-2',
              variantId: 'var-uuid-2',
              quantity: 1,
              unitPriceCents: 50000,
              priceType: 'presale',
              totalPriceCents: 50000,
              totalCostCents: 30000,
              displayLabel: null,
              productName: null,
              sku: null,
              attributes: {},
              consumptions: [],
            },
          ],
        })}
      />,
    )
    // Should NOT show the displayLabel from other test
    expect(screen.queryByText('Camiseta Blanca')).not.toBeInTheDocument()
    // Should show the variantId fragment in monospace (td content)
    expect(container.textContent).toContain('var-uuid')
  })
})

describe('SaleDetailContent — emission history', () => {
  it('renders emission history when emissions are provided', () => {
    const emissions: SaleConstanciaEmissionSummary[] = [
      makeEmissionSummary({ id: 'em-1', emissionNumber: 1 }),
    ]
    render(<SaleDetailContent sale={makeSaleDetail()} emissions={emissions} />)
    expect(screen.getByText(/Constancia #1/)).toBeInTheDocument()
  })

  it('renders multiple emissions with newest first', () => {
    const emissions: SaleConstanciaEmissionSummary[] = [
      makeEmissionSummary({ id: 'em-2', emissionNumber: 2, issuedAt: '2025-06-01T12:00:00.000Z' }),
      makeEmissionSummary({ id: 'em-1', emissionNumber: 1, issuedAt: '2025-05-15T12:00:00.000Z' }),
    ]
    render(<SaleDetailContent sale={makeSaleDetail()} emissions={emissions} />)
    expect(screen.getByText(/Constancia #2/)).toBeInTheDocument()
    expect(screen.getByText(/Constancia #1/)).toBeInTheDocument()
  })

  it('does not render emission history section when emissions is undefined', () => {
    render(<SaleDetailContent sale={makeSaleDetail()} />)
    expect(screen.queryByText(/Constancia/)).not.toBeInTheDocument()
  })

  it('does not render emission history section when emissions is empty', () => {
    render(<SaleDetailContent sale={makeSaleDetail()} emissions={[]} />)
    expect(screen.queryByText(/Constancia/)).not.toBeInTheDocument()
  })
})
