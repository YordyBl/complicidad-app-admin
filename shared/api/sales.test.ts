/**
 * Unit tests for the Sales API client.
 *
 * Tests listSales schema validation — ensures the runtime contract
 * is enforced: missing items[] or invalid shape → SchemaValidationError.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mock state ─────────────────────────────────────────────

const { mockApiGet } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
}))

// ── Mock api-fetch (explicitly mock only what we need) ─────────────

vi.mock('./api-fetch', () => ({
  apiGet: mockApiGet,
  apiPost: vi.fn(),
}))

// ── Import function under test ─────────────────────────────────────

import { listSales } from './sales'
import type { ApiResult } from './api-fetch'
import type { SaleListItem } from './schemas'

// ── Helpers ────────────────────────────────────────────────────────

function makeValidSaleItem() {
  return {
    lineId: 'line-uuid-1',
    variantId: 'var-uuid-1',
    productName: 'Camiseta',
    sku: 'CAM-M',
    displayLabel: 'Camiseta',
    attributes: { size: 'M' },
    quantity: 1,
    unitPriceCents: 75000,
    priceType: 'regular' as const,
  }
}

function makeValidSale(overrides: Record<string, unknown> = {}): Record<string, unknown> {
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
    items: overrides.items ?? [makeValidSaleItem()],
  }
}

function makeApiSuccess<T>(data: T, status = 200): ApiResult<T> {
  return { ok: true, data, status }
}

// ── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('listSales', () => {
  it('returns valid parsed data when response matches schema', async () => {
    const rawData = [makeValidSale(), makeValidSale()] as unknown as SaleListItem[]
    mockApiGet.mockResolvedValueOnce(makeApiSuccess(rawData))

    const result = await listSales()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(2)
      // Schema guarantees shape: parsed data has items array
      expect(result.data[0].items).toHaveLength(1)
      expect(result.data[0].items[0].displayLabel).toBe('Camiseta')
    }
  })

  it('returns validated empty array', async () => {
    mockApiGet.mockResolvedValueOnce(makeApiSuccess([]))

    const result = await listSales()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(0)
    }
  })

  it('rejects response missing items[] with SchemaValidationError', async () => {
    // Backend response missing the items field — old contract
    const entryWithoutItems = makeValidSale()
    delete entryWithoutItems.items

    mockApiGet.mockResolvedValueOnce(
      makeApiSuccess([entryWithoutItems] as unknown as SaleListItem[]),
    )

    const result = await listSales()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.error).toBe('SchemaValidationError')
      expect(result.error.message).toContain('Invalid sales list response')
      expect(result.error.status).toBe(502)
    }
  })

  it('rejects non-array response shape', async () => {
    mockApiGet.mockResolvedValueOnce(
      makeApiSuccess({ not: 'an array' } as unknown as SaleListItem[]),
    )

    const result = await listSales()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.error).toBe('SchemaValidationError')
    }
  })

  it('rejects entries with invalid items shape (missing displayLabel)', async () => {
    const entry = makeValidSale()
    const badItem = { ...makeValidSaleItem() }
    delete (badItem as Record<string, unknown>).displayLabel
    entry.items = [badItem]

    mockApiGet.mockResolvedValueOnce(
      makeApiSuccess([entry] as unknown as SaleListItem[]),
    )

    const result = await listSales()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.error).toBe('SchemaValidationError')
    }
  })

  it('passes through non-ok responses from apiGet without validating', async () => {
    const apiError = {
      ok: false as const,
      error: { error: 'Unauthorized', message: 'Token expired', status: 401 },
    }
    mockApiGet.mockResolvedValueOnce(apiError)

    const result = await listSales()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.status).toBe(401)
      expect(result.error.error).toBe('Unauthorized')
    }
  })

  it('passes query params through to apiGet', async () => {
    mockApiGet.mockResolvedValueOnce(makeApiSuccess([]))

    await listSales({ customerId: 'cust-123', status: 'ACTIVE' })

    expect(mockApiGet).toHaveBeenCalledWith('/sales?customerId=cust-123&status=ACTIVE')
  })

  it('constructs path without query string when no filters', async () => {
    mockApiGet.mockResolvedValueOnce(makeApiSuccess([]))

    await listSales()

    expect(mockApiGet).toHaveBeenCalledWith('/sales')
  })
})
