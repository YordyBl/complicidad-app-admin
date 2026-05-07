import { describe, it, expect, beforeEach, vi } from 'vitest'

// ── Hoisted state ──────────────────────────────────────────────────

const { cookieMap, fetchImpl } = vi.hoisted(() => ({
  cookieMap: new Map<string, string>(),
  fetchImpl: vi.fn(),
}))

// ── Mocks ──────────────────────────────────────────────────────────

vi.mock('@/shared/config/env', () => ({
  env: {
    API_BASE_URL: 'http://localhost:3000',
    COOKIE_NAME: 'test_session',
    cookieOptions: { httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 432000 },
  },
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (cookieMap.has(name) ? { value: cookieMap.get(name)! } : undefined),
    set: (name: string, value: string) => { cookieMap.set(name, value) },
    delete: (name: string) => { cookieMap.delete(name) },
    getAll: () => [],
    has: (name: string) => cookieMap.has(name),
  }),
}))

vi.stubGlobal('fetch', fetchImpl)

// ── Imports ────────────────────────────────────────────────────────

import {
  getLiquidity,
  getStockInvestment,
  getSalesTotal,
  getFifoCogs,
  getGrossProfit,
  getReinvestment,
  getOperatingCapital,
  getStockByProduct,
  getLots,
} from './reports'

// ── Helpers ────────────────────────────────────────────────────────

function mockFetchSuccess(data: unknown) {
  fetchImpl.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => data,
  } as Response)
}

function mockFetchError(status: number, error: string, message: string) {
  fetchImpl.mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({ error, message }),
  } as Response)
}

function mockFetchNetworkError() {
  fetchImpl.mockRejectedValueOnce(new Error('Connection timeout'))
}

beforeEach(() => {
  vi.clearAllMocks()
  cookieMap.clear()
})

// ── Success tests ──────────────────────────────────────────────────

describe('Reports — success responses', () => {
  it('getLiquidity returns parsed data', async () => {
    mockFetchSuccess({ totalCashInCents: 100000, totalCashOutCents: 50000, balanceCents: 50000 })
    const r = await getLiquidity()
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.totalCashInCents).toBe(100000)
      expect(r.data.balanceCents).toBe(50000)
    }
  })

  it('getStockInvestment returns parsed data', async () => {
    mockFetchSuccess({ totalInvestmentCents: 25000000 })
    const r = await getStockInvestment()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.totalInvestmentCents).toBe(25000000)
  })

  it('getSalesTotal returns sales data', async () => {
    mockFetchSuccess({ totalSalesCents: 30000000 })
    const r = await getSalesTotal()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.totalSalesCents).toBe(30000000)
  })

  it('getFifoCogs returns COGS data', async () => {
    mockFetchSuccess({ totalCogsCents: 15000000 })
    const r = await getFifoCogs()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.totalCogsCents).toBe(15000000)
  })

  it('getGrossProfit returns profit data', async () => {
    mockFetchSuccess({ grossProfitCents: 5000000 })
    const r = await getGrossProfit()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.grossProfitCents).toBe(5000000)
  })

  it('getReinvestment returns reinvestment data', async () => {
    mockFetchSuccess({ reinvestmentCents: 2000000 })
    const r = await getReinvestment()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.reinvestmentCents).toBe(2000000)
  })

  it('getOperatingCapital returns capital data', async () => {
    mockFetchSuccess({ operatingCapitalCents: 10000000 })
    const r = await getOperatingCapital()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.operatingCapitalCents).toBe(10000000)
  })

  it('getStockByProduct returns empty array', async () => {
    mockFetchSuccess([])
    const r = await getStockByProduct()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data).toEqual([])
  })

  it('getStockByProduct returns product list', async () => {
    mockFetchSuccess([
      { productName: 'Product A', sku: 'SKU-001', totalRemainingQty: 5, investmentCents: 500000 },
    ])
    const r = await getStockByProduct()
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data).toHaveLength(1)
      expect(r.data[0]!.totalRemainingQty).toBe(5)
    }
  })

  it('getStockByProduct normalizes wrapped { items: [...] } response', async () => {
    mockFetchSuccess({
      items: [
        { productName: 'Prod B', sku: 'SKU-002', totalRemainingQty: 3, investmentCents: 30000 },
      ],
      totalInvestmentCents: 30000,
      currency: 'ARS',
    })
    const r = await getStockByProduct()
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data).toHaveLength(1)
      expect(r.data[0]!.productName).toBe('Prod B')
    }
  })

  it('getStockByProduct returns empty array on non-array, non-wrapper response', async () => {
    mockFetchSuccess({ error: 'unexpected shape' })
    const r = await getStockByProduct()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data).toEqual([])
  })

  it('getLots returns lot list', async () => {
    mockFetchSuccess([
      { lotId: 'lot-1', variantId: 'v-1', productName: 'Item', sku: 'SKU-001', purchasedQuantity: 100, remainingQuantity: 50, unitCostCents: 5000, purchaseDate: '2025-01-15T00:00:00Z' },
    ])
    const r = await getLots()
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data).toHaveLength(1)
      expect(r.data[0]!.purchasedQuantity).toBe(100)
    }
  })

  it('getLots normalizes wrapped { open: [...], exhausted: [...] } response', async () => {
    mockFetchSuccess({
      open: [
        { lotId: 'lot-1', variantId: 'v-1', productName: 'A', sku: 'SK-A', purchasedQuantity: 10, remainingQuantity: 5, unitCostCents: 100, purchaseDate: '2025-01-01T00:00:00Z' },
      ],
      exhausted: [
        { lotId: 'lot-2', variantId: 'v-1', productName: 'A', sku: 'SK-A', purchasedQuantity: 20, remainingQuantity: 0, unitCostCents: 100, purchaseDate: '2025-01-01T00:00:00Z' },
      ],
      totalOpenCount: 1,
      totalExhaustedCount: 1,
    })
    const r = await getLots()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data).toHaveLength(2)
  })

  it('getLots returns empty array on non-array, non-wrapper response', async () => {
    mockFetchSuccess({ error: 'unexpected shape' })
    const r = await getLots()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data).toEqual([])
  })
})

// ── Error tests (used by report-cards error states) ───────────────

describe('Reports — error states', () => {
  it('getLiquidity returns error on 500', async () => {
    mockFetchError(500, 'InternalError', 'Database connection failed')
    const r = await getLiquidity()
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.message).toContain('Database')
  })

  it('getStockInvestment returns error on 503', async () => {
    mockFetchError(503, 'ServiceUnavailable', 'Backend offline')
    const r = await getStockInvestment()
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.status).toBe(503)
  })

  it('any report returns error on network failure', async () => {
    mockFetchNetworkError()
    const r = await getSalesTotal()
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.status).toBe(503)
      expect(r.error.error).toBe('NetworkError')
    }
  })

  it('getLots returns error on backend failure', async () => {
    mockFetchError(400, 'ValidationError', 'Invalid request')
    const r = await getLots()
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.status).toBe(400)
  })
})

// ── Cache behavior ─────────────────────────────────────────────────

describe('Reports — cache behavior', () => {
  it('all report GETs use no-store cache', async () => {
    mockFetchSuccess({ totalCashInCents: 0, totalCashOutCents: 0, balanceCents: 0 })

    await getLiquidity()

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ cache: 'no-store' }),
    )
  })
})
