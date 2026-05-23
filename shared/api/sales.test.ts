/**
 * Unit tests for the Sales API client and sales schemas.
 *
 * Tests:
 * - Schema validation for sales list query, paginated envelope,
 *   payment fields, amountPaidNowCents, and detail snapshot.
 * - listSales query serialization, paginated envelope parsing,
 *   lowercase sortOrder, and schema rejection.
 * - settleSaleBalance API contract.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mock state ─────────────────────────────────────────────

const { mockApiGet, mockApiPost } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockApiPost: vi.fn(),
}))

// ── Mock api-fetch (explicitly mock only what we need) ─────────────

vi.mock('./api-fetch', () => ({
  apiGet: mockApiGet,
  apiPost: mockApiPost,
}))

// ── Schema imports (tested directly, no API call needed) ───────────

import {
  salesListQuerySchema,
  salesListResponseSchema,
  salesListRowSchema,
  saleFormSchema,
  saleDetailSchema,
  type SalesListQuery,
  type SalesListResponse,
  type SalesListRow,
} from './schemas'

// ── Import function under test ─────────────────────────────────────

import { listSales, settleSaleBalance } from './sales'
import type { ApiResult } from './api-fetch'

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

function makeValidSaleRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    saleId: overrides.saleId ?? '550e8400-e29b-41d4-a716-446655440000',
    customerId: overrides.customerId ?? 'cust-uuid-1',
    customerName: overrides.customerName ?? 'Cliente Test',
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
    paymentStatus: overrides.paymentStatus ?? 'pending',
    amountPaidCents: overrides.amountPaidCents ?? 0,
    pendingBalanceCents: overrides.pendingBalanceCents ?? 150000,
    settledAt: (overrides.settledAt ?? null) as string | null,
    canSettleBalance: overrides.canSettleBalance ?? true,
  }
}

function makePaginatedEnvelope(overrides: {
  items?: Record<string, unknown>[]
  total?: number
  page?: number
  pageSize?: number
  totalPages?: number
} = {}): Record<string, unknown> {
  return {
    items: overrides.items ?? [makeValidSaleRow()],
    total: overrides.total ?? 1,
    page: overrides.page ?? 1,
    pageSize: overrides.pageSize ?? 20,
    totalPages: overrides.totalPages ?? 1,
  }
}

function makeApiSuccess<T>(data: T, status = 200): ApiResult<T> {
  return { ok: true, data, status }
}

// ── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Schema tests (task 1.1 / 1.4) ──────────────────────────────────

describe('salesListQuerySchema', () => {
  it('accepts a full query with all supported filters', () => {
    const parsed = salesListQuerySchema.safeParse({
      page: '1',
      pageSize: '20',
      search: 'camiseta',
      status: 'ACTIVE',
      paymentStatus: 'partial',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.page).toBe('1')
      expect(parsed.data.paymentStatus).toBe('partial')
      expect(parsed.data.sortOrder).toBe('desc')
    }
  })

  it('accepts an empty object (no filters)', () => {
    const parsed = salesListQuerySchema.safeParse({})
    expect(parsed.success).toBe(true)
  })

  it('rejects an invalid paymentStatus value', () => {
    const parsed = salesListQuerySchema.safeParse({ paymentStatus: 'full' })
    expect(parsed.success).toBe(false)
  })

  it('rejects an invalid sortOrder value', () => {
    const parsed = salesListQuerySchema.safeParse({ sortOrder: 'ASC' })
    expect(parsed.success).toBe(false)
  })

  it('lowercase sortOrder is valid', () => {
    const parsed = salesListQuerySchema.safeParse({ sortOrder: 'asc' })
    expect(parsed.success).toBe(true)
  })

  it('accepts all three payment status values', () => {
    for (const status of ['pending', 'partial', 'paid']) {
      const parsed = salesListQuerySchema.safeParse({ paymentStatus: status })
      expect(parsed.success).toBe(true)
    }
  })
})

describe('salesListResponseSchema', () => {
  it('validates a complete paginated envelope', () => {
    const envelope = makePaginatedEnvelope({ items: [makeValidSaleRow()], total: 1, page: 1, pageSize: 20, totalPages: 1 })
    const parsed = salesListResponseSchema.safeParse(envelope)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.items).toHaveLength(1)
      expect(parsed.data.total).toBe(1)
      expect(parsed.data.page).toBe(1)
      expect(parsed.data.pageSize).toBe(20)
      expect(parsed.data.totalPages).toBe(1)
    }
  })

  it('validates an envelope with multiple items', () => {
    const envelope = makePaginatedEnvelope({
      items: [makeValidSaleRow(), makeValidSaleRow()],
      total: 2,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    })
    const parsed = salesListResponseSchema.safeParse(envelope)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.items).toHaveLength(2)
      expect(parsed.data.total).toBe(2)
    }
  })

  it('rejects response missing items field', () => {
    const bad = { total: 1, page: 1, pageSize: 20, totalPages: 1 }
    const parsed = salesListResponseSchema.safeParse(bad)
    expect(parsed.success).toBe(false)
  })

  it('rejects response missing total field', () => {
    const bad = { items: [makeValidSaleRow()], page: 1, pageSize: 20, totalPages: 1 }
    const parsed = salesListResponseSchema.safeParse(bad)
    expect(parsed.success).toBe(false)
  })

  it('rejects response missing page field', () => {
    const bad = { items: [makeValidSaleRow()], total: 1, pageSize: 20, totalPages: 1 }
    const parsed = salesListResponseSchema.safeParse(bad)
    expect(parsed.success).toBe(false)
  })
})

describe('salesListRowSchema', () => {
  it('validates a row with all payment fields present', () => {
    const row = makeValidSaleRow({ paymentStatus: 'partial', amountPaidCents: 50000, pendingBalanceCents: 100000 })
    const parsed = salesListRowSchema.safeParse(row)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.paymentStatus).toBe('partial')
      expect(parsed.data.amountPaidCents).toBe(50000)
      expect(parsed.data.pendingBalanceCents).toBe(100000)
      expect(parsed.data.customerName).toBe('Cliente Test')
      expect(parsed.data.canSettleBalance).toBe(true)
    }
  })

  it('validates a paid row with zero pending balance', () => {
    const row = makeValidSaleRow({ paymentStatus: 'paid', amountPaidCents: 150000, pendingBalanceCents: 0, settledAt: '2025-03-15T12:00:00.000Z', canSettleBalance: false })
    const parsed = salesListRowSchema.safeParse(row)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.paymentStatus).toBe('paid')
      expect(parsed.data.pendingBalanceCents).toBe(0)
      expect(parsed.data.settledAt).toBe('2025-03-15T12:00:00.000Z')
      expect(parsed.data.canSettleBalance).toBe(false)
    }
  })

  it('rejects a row with invalid paymentStatus value', () => {
    const row = makeValidSaleRow({ paymentStatus: 'completed' })
    const parsed = salesListRowSchema.safeParse(row)
    expect(parsed.success).toBe(false)
  })

  it('rejects a row missing customerName', () => {
    const row = makeValidSaleRow()
    delete row.customerName
    const parsed = salesListRowSchema.safeParse(row)
    expect(parsed.success).toBe(false)
  })

  it('rejects a row missing canSettleBalance', () => {
    const row = makeValidSaleRow()
    delete row.canSettleBalance
    const parsed = salesListRowSchema.safeParse(row)
    expect(parsed.success).toBe(false)
  })
})

describe('saleFormSchema — amountPaidNowCents', () => {
  it('accepts a form with optional amountPaidNowCents', () => {
    const parsed = saleFormSchema.safeParse({
      customerId: 'cust-1',
      channel: 'web',
      items: [{ variantId: 'var-1', quantity: 1, priceType: 'regular' }],
      amountPaidNowCents: 10000,
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.amountPaidNowCents).toBe(10000)
    }
  })

  it('accepts a form without amountPaidNowCents (backward compat)', () => {
    const parsed = saleFormSchema.safeParse({
      customerId: 'cust-1',
      channel: 'web',
      items: [{ variantId: 'var-1', quantity: 1, priceType: 'regular' }],
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.amountPaidNowCents).toBeUndefined()
    }
  })

  it('rejects negative amountPaidNowCents', () => {
    const parsed = saleFormSchema.safeParse({
      customerId: 'cust-1',
      channel: 'web',
      items: [{ variantId: 'var-1', quantity: 1, priceType: 'regular' }],
      amountPaidNowCents: -100,
    })
    expect(parsed.success).toBe(false)
  })
})

describe('saleDetailSchema — payment snapshot', () => {
  it('accepts detail with payment snapshot fields', () => {
    const detail = {
      id: 'sale-uuid-1',
      customerId: 'cust-uuid-1',
      channelReference: null,
      channel: 'web',
      status: 'ACTIVE',
      totalRevenueCents: 150000,
      totalCostCents: 120000,
      grossProfitCents: 30000,
      createdAt: '2025-03-15T12:00:00.000Z',
      updatedAt: '2025-03-15T12:30:00.000Z',
      lines: [],
      paymentStatus: 'partial',
      amountPaidCents: 50000,
      pendingBalanceCents: 100000,
      settledAt: null as string | null,
    }
    const parsed = saleDetailSchema.safeParse(detail)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.paymentStatus).toBe('partial')
      expect(parsed.data.amountPaidCents).toBe(50000)
      expect(parsed.data.pendingBalanceCents).toBe(100000)
    }
  })

  it('accepts detail without payment fields (backward compat with old backend)', () => {
    const detail = {
      id: 'sale-uuid-1',
      customerId: 'cust-uuid-1',
      channelReference: null,
      channel: 'web',
      status: 'ACTIVE',
      totalRevenueCents: 150000,
      totalCostCents: 120000,
      grossProfitCents: 30000,
      createdAt: '2025-03-15T12:00:00.000Z',
      updatedAt: '2025-03-15T12:30:00.000Z',
      lines: [],
    }
    const parsed = saleDetailSchema.safeParse(detail)
    expect(parsed.success).toBe(true)
  })
})

// ── API client tests (task 1.2 / 1.4) ──────────────────────────────

describe('listSales (paginated)', () => {
  it('returns valid parsed data when response matches paginated envelope', async () => {
    const envelope = makePaginatedEnvelope({ items: [makeValidSaleRow(), makeValidSaleRow()], total: 2 })
    mockApiGet.mockResolvedValueOnce(makeApiSuccess(envelope))

    const result = await listSales()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.items).toHaveLength(2)
      expect(result.data.total).toBe(2)
      expect(result.data.page).toBe(1)
      expect(result.data.pageSize).toBe(20)
      expect(result.data.totalPages).toBe(1)
      // Schema guarantees shape: parsed data has items with payment fields
      expect(result.data.items[0].paymentStatus).toBe('pending')
      expect(result.data.items[0].customerName).toBe('Cliente Test')
      expect(result.data.items[0].items).toHaveLength(1)
      expect(result.data.items[0].items[0].displayLabel).toBe('Camiseta')
    }
  })

  it('returns validated empty items array', async () => {
    const envelope = makePaginatedEnvelope({ items: [], total: 0, totalPages: 0 })
    mockApiGet.mockResolvedValueOnce(makeApiSuccess(envelope))

    const result = await listSales()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.items).toHaveLength(0)
      expect(result.data.total).toBe(0)
    }
  })

  it('rejects response missing items[] in envelope with SchemaValidationError', async () => {
    const badEnvelope = { total: 1, page: 1, pageSize: 20, totalPages: 1 }
    mockApiGet.mockResolvedValueOnce(makeApiSuccess(badEnvelope))

    const result = await listSales()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.error).toBe('SchemaValidationError')
      expect(result.error.message).toContain('Invalid sales list response')
      expect(result.error.status).toBe(502)
    }
  })

  it('rejects entry with invalid items shape (missing displayLabel) inside envelope', async () => {
    const row = makeValidSaleRow()
    const badItem = { ...makeValidSaleItem() }
    delete (badItem as Record<string, unknown>).displayLabel
    row.items = [badItem]
    const envelope = makePaginatedEnvelope({ items: [row] })

    mockApiGet.mockResolvedValueOnce(makeApiSuccess(envelope))

    const result = await listSales()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.error).toBe('SchemaValidationError')
    }
  })

  it('rejects envelope with missing pagination field (total)', async () => {
    const envelope = { items: [makeValidSaleRow()], page: 1, pageSize: 20, totalPages: 1 }
    mockApiGet.mockResolvedValueOnce(makeApiSuccess(envelope))

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

  it('serializes all query params including page, pageSize, search, paymentStatus, and lowercase sortOrder', async () => {
    mockApiGet.mockResolvedValueOnce(makeApiSuccess(makePaginatedEnvelope({ items: [], total: 0, totalPages: 0 })))

    await listSales({
      page: '2',
      pageSize: '10',
      search: 'camiseta',
      status: 'ACTIVE',
      paymentStatus: 'partial',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })

    expect(mockApiGet).toHaveBeenCalledWith(
      '/sales?page=2&pageSize=10&search=camiseta&status=ACTIVE&paymentStatus=partial&sortBy=createdAt&sortOrder=desc',
    )
  })

  it('serializes only provided params, omitting undefined', async () => {
    mockApiGet.mockResolvedValueOnce(makeApiSuccess(makePaginatedEnvelope({ items: [], total: 0, totalPages: 0 })))

    await listSales({ page: '1', sortOrder: 'asc' })

    expect(mockApiGet).toHaveBeenCalledWith('/sales?page=1&sortOrder=asc')
  })

  it('constructs path without query string when no params', async () => {
    mockApiGet.mockResolvedValueOnce(makeApiSuccess(makePaginatedEnvelope({ items: [], total: 0, totalPages: 0 })))

    await listSales()

    expect(mockApiGet).toHaveBeenCalledWith('/sales')
  })

  it('constructs path without query string when empty object', async () => {
    mockApiGet.mockResolvedValueOnce(makeApiSuccess(makePaginatedEnvelope({ items: [], total: 0, totalPages: 0 })))

    await listSales({})

    expect(mockApiGet).toHaveBeenCalledWith('/sales')
  })
})

describe('settleSaleBalance', () => {
  it('calls POST /sales/:id/settle-balance and returns the result', async () => {
    const settleResponse = { saleId: 'sale-uuid-1', paymentStatus: 'paid', settledAmountCents: 100000 }
    mockApiPost.mockResolvedValueOnce(makeApiSuccess(settleResponse))

    const result = await settleSaleBalance('sale-uuid-1')

    expect(mockApiPost).toHaveBeenCalledWith('/sales/sale-uuid-1/settle-balance', {})
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.saleId).toBe('sale-uuid-1')
      expect(result.data.paymentStatus).toBe('paid')
      expect(result.data.settledAmountCents).toBe(100000)
    }
  })

  it('propagates API errors from settle-balance endpoint', async () => {
    const apiError = {
      ok: false as const,
      error: { error: 'ConflictError', message: 'Balance already settled', status: 409 },
    }
    mockApiPost.mockResolvedValueOnce(apiError)

    const result = await settleSaleBalance('sale-uuid-1')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.status).toBe(409)
      expect(result.error.error).toBe('ConflictError')
    }
  })
})
