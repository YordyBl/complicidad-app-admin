/**
 * Tests for SaleDocumentsCard — rendering, download links, and action states.
 *
 * Covers verify gaps:
 * - Download action states (emit button, loading text, disabled state)
 * - History items rendering (emission number badge, version, date)
 * - Download link URL format
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import type { SaleDetail, SaleConstanciaEmissionSummary } from '@/shared/api/schemas'

// ── Hoisted mock for createConstanciaEmissionAction ─────────────────────

const { mockCreateConstanciaEmissionAction } = vi.hoisted(() => ({
  mockCreateConstanciaEmissionAction: vi.fn(),
}))

vi.mock('@/features/sales/sales-actions', () => ({
  createConstanciaEmissionAction: mockCreateConstanciaEmissionAction,
}))

// ── Import component under test (after mocks are set up) ──────────────

import { SaleDocumentsCard } from './sale-documents-card'

// ── Helpers ─────────────────────────────────────────────────────────────

function makeSaleForCard(overrides: Partial<SaleDetail> = {}): SaleDetail {
  return {
    id: 'sale-uuid-0001',
    customerId: 'cust-uuid-0001',
    channelReference: null,
    channel: 'web',
    status: 'ACTIVE',
    totalRevenueCents: 150000,
    totalCostCents: 120000,
    grossProfitCents: 30000,
    createdAt: '2025-05-15T12:00:00.000Z',
    updatedAt: '2025-05-15T12:30:00.000Z',
    customerName: 'Juan Pérez',
    customerPhone: null,
    customerAddress: null,
    customerDistrict: null,
    googleMapsUrl: null,
    lines: [
      {
        id: 'line-1',
        variantId: 'var-1',
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

function makeEmission(overrides: Partial<SaleConstanciaEmissionSummary> = {}): SaleConstanciaEmissionSummary {
  return {
    id: 'emission-uuid-0001',
    emissionNumber: 1,
    issuedAt: '2025-05-20T10:00:00.000Z',
    templateVersion: 'v1',
    ...overrides,
  }
}

// ── Tests ───────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  // Default: action resolves successfully
  mockCreateConstanciaEmissionAction.mockResolvedValue({
    success: true,
    data: {
      id: 'new-emission',
      saleId: 'sale-uuid-0001',
      emissionNumber: 1,
      issuedAt: '2025-05-20T10:00:00.000Z',
      templateVersion: 'v1',
      hasSnapshot: true,
      pdfUrl: '/api/sales/sale-uuid-0001/constancia-emissions/new-emission/pdf',
    },
  })
})

describe('SaleDocumentsCard — render', () => {
  it('renders "Emitir constancia" button', () => {
    render(<SaleDocumentsCard sale={makeSaleForCard()} emissions={[]} />)
    expect(screen.getByRole('button', { name: /emitir constancia/i })).toBeInTheDocument()
  })

  it('button is not disabled initially', () => {
    render(<SaleDocumentsCard sale={makeSaleForCard()} emissions={[]} />)
    expect(screen.getByRole('button', { name: /emitir constancia/i })).not.toBeDisabled()
  })

  it('does not render history section when emissions is empty', () => {
    render(<SaleDocumentsCard sale={makeSaleForCard()} emissions={[]} />)
    expect(screen.queryByText('Historial')).not.toBeInTheDocument()
  })
})

describe('SaleDocumentsCard — emission history', () => {
  it('renders history section with emission number badge', () => {
    const emissions = [makeEmission({ id: 'em-1', emissionNumber: 1 })]
    render(<SaleDocumentsCard sale={makeSaleForCard()} emissions={emissions} />)

    expect(screen.getByText('Historial')).toBeInTheDocument()
    expect(screen.getByText('#1')).toBeInTheDocument()
  })

  it('renders multiple emissions with download links', () => {
    const emissions = [
      makeEmission({ id: 'em-2', emissionNumber: 2, issuedAt: '2025-06-01T12:00:00.000Z' }),
      makeEmission({ id: 'em-1', emissionNumber: 1, issuedAt: '2025-05-15T12:00:00.000Z' }),
    ]
    render(<SaleDocumentsCard sale={makeSaleForCard()} emissions={emissions} />)

    expect(screen.getByText('#2')).toBeInTheDocument()
    expect(screen.getByText('#1')).toBeInTheDocument()

    const pdfLinks = screen.getAllByRole('link', { name: /pdf/i })
    expect(pdfLinks).toHaveLength(2)
  })

  it('renders template version label for each emission', () => {
    const emissions = [makeEmission({ templateVersion: 'v1' })]
    render(<SaleDocumentsCard sale={makeSaleForCard()} emissions={emissions} />)

    expect(screen.getByText('v1')).toBeInTheDocument()
  })

  it('renders empty history when emissions array is empty but defined', () => {
    render(<SaleDocumentsCard sale={makeSaleForCard()} emissions={[]} />)
    expect(screen.queryByText('Historial')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /pdf/i })).not.toBeInTheDocument()
  })
})

describe('SaleDocumentsCard — download links', () => {
  it('download link points to correct proxy URL', () => {
    const emissions = [makeEmission({ id: 'emission-uuid-abc' })]
    render(<SaleDocumentsCard sale={makeSaleForCard({ id: 'sale-xyz' })} emissions={emissions} />)

    const pdfLink = screen.getByRole('link', { name: /pdf/i })
    expect(pdfLink).toHaveAttribute(
      'href',
      '/api/sales/sale-xyz/constancia-emissions/emission-uuid-abc/pdf',
    )
    expect(pdfLink).toHaveAttribute('download')
  })

  it('renders different download URLs for different emissions', () => {
    const emissions = [
      makeEmission({ id: 'em-aaa', emissionNumber: 1 }),
      makeEmission({ id: 'em-bbb', emissionNumber: 2 }),
    ]
    render(<SaleDocumentsCard sale={makeSaleForCard({ id: 'multi-sale' })} emissions={emissions} />)

    const links = screen.getAllByRole('link', { name: /pdf/i })
    expect(links).toHaveLength(2)
    const href1 = links[0].getAttribute('href')
    const href2 = links[1].getAttribute('href')
    expect(href1).not.toBeNull()
    expect(href2).not.toBeNull()
    expect(href1).not.toBe(href2)
  })
})

describe('SaleDocumentsCard — loading state', () => {
  it('shows "Emitiendo..." and disables button while emitting', async () => {
    // Override the default mock: return a promise that never resolves
    // to keep the loading state visible for assertion
    let resolveAction: (value: unknown) => void = () => {}
    const deferred = new Promise<unknown>((resolve) => {
      resolveAction = resolve
    })
    mockCreateConstanciaEmissionAction.mockReturnValue(deferred)

    const user = userEvent.setup()
    render(<SaleDocumentsCard sale={makeSaleForCard()} emissions={[]} />)

    // Click the emit button
    await user.click(screen.getByRole('button', { name: /emitir constancia/i }))

    // Button should now show loading state
    expect(screen.getByRole('button', { name: /emitiendo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /emitiendo/i })).toBeDisabled()

    // Clean up by resolving
    resolveAction({ success: true, data: {} })
  })

  it('calls createConstanciaEmissionAction with sale id and data', async () => {
    const user = userEvent.setup()
    render(<SaleDocumentsCard sale={makeSaleForCard()} emissions={[]} />)

    await user.click(screen.getByRole('button', { name: /emitir constancia/i }))

    expect(mockCreateConstanciaEmissionAction).toHaveBeenCalledTimes(1)
    expect(mockCreateConstanciaEmissionAction).toHaveBeenCalledWith(
      'sale-uuid-0001',
      expect.objectContaining({ id: 'sale-uuid-0001' }),
    )
  })
})
