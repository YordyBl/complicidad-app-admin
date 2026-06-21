import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  liquidityReportSchema,
  stockInvestmentReportSchema,
  salesTotalReportSchema,
  fifoCogsReportSchema,
  grossProfitReportSchema,
  reinvestmentReportSchema,
  operatingCapitalReportSchema,
  stockByProductResponseSchema,
  lotsResponseSchema,
  type LiquidityReport,
  type StockInvestmentReport,
  type SalesTotalReport,
  type FifoCogsReport,
  type GrossProfitReport,
  type ReinvestmentReport,
  type OperatingCapitalReport,
  type StockByProductResponse,
  type LotsResponse,
} from './schemas'

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
    mockFetchSuccess({ liquidityCents: 100000, currency: 'ARS' })
    const r = await getLiquidity()
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.liquidityCents).toBe(100000)
    }
  })

  it('getStockInvestment returns parsed data', async () => {
    mockFetchSuccess({ totalInvestmentCents: 25000000, currency: 'ARS' })
    const r = await getStockInvestment()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.totalInvestmentCents).toBe(25000000)
  })

  it('getSalesTotal returns sales data', async () => {
    mockFetchSuccess({ totalSalesCents: 30000000, currency: 'ARS', activeSaleCount: 12 })
    const r = await getSalesTotal()
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.totalSalesCents).toBe(30000000)
      expect(r.data.activeSaleCount).toBe(12)
    }
  })

  it('getFifoCogs returns COGS data', async () => {
    mockFetchSuccess({ totalCogsCents: 15000000, currency: 'ARS' })
    const r = await getFifoCogs()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.totalCogsCents).toBe(15000000)
  })

  it('getGrossProfit returns profit data', async () => {
    mockFetchSuccess({ grossProfitCents: 5000000, currency: 'ARS' })
    const r = await getGrossProfit()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.grossProfitCents).toBe(5000000)
  })

  it('getReinvestment returns reinvestment data', async () => {
    mockFetchSuccess({ reinvestmentCents: 2000000, currency: 'ARS' })
    const r = await getReinvestment()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.reinvestmentCents).toBe(2000000)
  })

  it('getOperatingCapital returns capital data', async () => {
    mockFetchSuccess({ operatingCapitalCents: 10000000, currency: 'ARS' })
    const r = await getOperatingCapital()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.operatingCapitalCents).toBe(10000000)
  })

  it('getStockByProduct returns paginated envelope', async () => {
    mockFetchSuccess({
      items: [
        { productId: 'p1', productName: 'Product A', variantId: 'v1', sku: 'SKU-001', totalRemainingQty: 5, investmentCents: 500000 },
      ],
      page: 1,
      pageSize: 5,
      totalItems: 12,
      totalPages: 3,
      search: '',
    })
    const r = await getStockByProduct()
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.items).toHaveLength(1)
      expect(r.data.items[0]!.totalRemainingQty).toBe(5)
      expect(r.data.totalItems).toBe(12)
      expect(r.data.totalPages).toBe(3)
    }
  })

  it('getStockByProduct passes query params in URL', async () => {
    mockFetchSuccess({
      items: [],
      page: 2,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
      search: 'foo',
    })
    await getStockByProduct({ page: 2, pageSize: 10, search: 'foo' })
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('stock-by-product?'),
      expect.anything(),
    )
    const url = fetchImpl.mock.calls[0]?.[0] as string
    expect(url).toContain('page=2')
    expect(url).toContain('pageSize=10')
    expect(url).toContain('search=foo')
  })

  it('getLots returns paginated envelope', async () => {
    mockFetchSuccess({
      items: [
        { lotId: 'lot-1', variantId: 'v-1', productName: 'Item', sku: 'SKU-001', purchasedQuantity: 100, remainingQuantity: 50, unitCostCents: 5000, totalCostCents: 250000, purchaseDate: '2025-01-15T00:00:00Z', status: 'OPEN' },
      ],
      page: 1,
      pageSize: 5,
      totalItems: 1,
      totalPages: 1,
      search: '',
    })
    const r = await getLots()
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.items).toHaveLength(1)
      expect(r.data.items[0]!.purchasedQuantity).toBe(100)
      expect(r.data.items[0]!.unitCostCents).toBe(5000)
    }
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
    mockFetchSuccess({ liquidityCents: 0, currency: 'ARS' })

    await getLiquidity()

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ cache: 'no-store' }),
    )
  })
})

// ── Canonical Schema Validation ────────────────────────────────────

describe('Reports — canonical schemas', () => {
  describe('liquidityReportSchema', () => {
    it('parses valid liquidity payload', () => {
      const result = liquidityReportSchema.safeParse({
        liquidityCents: 500000,
        currency: 'ARS',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.liquidityCents).toBe(500000)
      }
    })

    it('rejects payload missing liquidityCents', () => {
      const result = liquidityReportSchema.safeParse({ currency: 'ARS' })
      expect(result.success).toBe(false)
    })

    it('rejects payload with extra inflow/outflow fields (strict)', () => {
      const result = liquidityReportSchema.safeParse({
        liquidityCents: 500,
        currency: 'ARS',
        totalCashInCents: 1000,
        totalCashOutCents: 500,
        balanceCents: 500,
      })
      // The old shape with inflow/outflow is rejected by strict parsing
      expect(result.success).toBe(false)
    })
  })

  describe('stockInvestmentReportSchema', () => {
    it('parses canonical totalInvestmentCents field', () => {
      const result = stockInvestmentReportSchema.safeParse({
        totalInvestmentCents: 25000000,
        currency: 'ARS',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.totalInvestmentCents).toBe(25000000)
      }
    })

    it('rejects payload missing totalInvestmentCents', () => {
      const result = stockInvestmentReportSchema.safeParse({ currency: 'ARS' })
      expect(result.success).toBe(false)
    })
  })

  describe('salesTotalReportSchema', () => {
    it('parses canonical totalSalesCents with activeSaleCount', () => {
      const result = salesTotalReportSchema.safeParse({
        totalSalesCents: 30000000,
        currency: 'ARS',
        activeSaleCount: 5,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.totalSalesCents).toBe(30000000)
        expect(result.data.activeSaleCount).toBe(5)
      }
    })

    it('accepts activeSaleCount as zero', () => {
      const result = salesTotalReportSchema.safeParse({
        totalSalesCents: 0,
        currency: 'ARS',
        activeSaleCount: 0,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('fifoCogsReportSchema', () => {
    it('parses canonical totalCogsCents field', () => {
      const result = fifoCogsReportSchema.safeParse({
        totalCogsCents: 15000000,
        currency: 'ARS',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.totalCogsCents).toBe(15000000)
      }
    })

    it('rejects non-integer cents', () => {
      const result = fifoCogsReportSchema.safeParse({
        totalCogsCents: 150.5,
        currency: 'ARS',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('grossProfitReportSchema', () => {
    it('parses canonical grossProfitCents', () => {
      const result = grossProfitReportSchema.safeParse({
        grossProfitCents: 5000000,
        currency: 'ARS',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('reinvestmentReportSchema', () => {
    it('parses canonical reinvestmentCents', () => {
      const result = reinvestmentReportSchema.safeParse({
        reinvestmentCents: 2000000,
        currency: 'ARS',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('operatingCapitalReportSchema', () => {
    it('parses canonical operatingCapitalCents', () => {
      const result = operatingCapitalReportSchema.safeParse({
        operatingCapitalCents: 10000000,
        currency: 'ARS',
      })
      expect(result.success).toBe(true)
    })
  })
})

// ── Paginated List Schema Validation ───────────────────────────────

describe('Reports — paginated list schemas', () => {
  describe('stockByProductResponseSchema', () => {
    const validPayload: StockByProductResponse = {
      items: [
        {
          productId: 'p1',
          productName: 'Test Product',
          variantId: 'v1',
          sku: 'SKU-001',
          totalRemainingQty: 5,
          investmentCents: 500000,
        },
      ],
      page: 1,
      pageSize: 5,
      totalItems: 12,
      totalPages: 3,
      search: '',
    }

    it('parses valid paginated response', () => {
      const result = stockByProductResponseSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('rejects payload missing items array', () => {
      const result = stockByProductResponseSchema.safeParse({
        page: 1,
        pageSize: 5,
        totalItems: 0,
        totalPages: 0,
        search: '',
      })
      expect(result.success).toBe(false)
    })

    it('rejects payload where investmentCents is not integer', () => {
      const result = stockByProductResponseSchema.safeParse({
        ...validPayload,
        items: [{ ...validPayload.items[0]!, investmentCents: 500.5 }],
      })
      expect(result.success).toBe(false)
    })

    it('accepts empty items array with zero metadata', () => {
      const result = stockByProductResponseSchema.safeParse({
        items: [],
        page: 1,
        pageSize: 5,
        totalItems: 0,
        totalPages: 0,
        search: '',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('lotsResponseSchema', () => {
    const validPayload: LotsResponse = {
      items: [
        {
          lotId: 'lot-1',
          variantId: 'v1',
          productName: 'Test Product',
          sku: 'SKU-001',
          purchasedQuantity: 100,
          remainingQuantity: 30,
          unitCostCents: 500,
          totalCostCents: 15000,
          purchaseDate: '2026-01-01T00:00:00.000Z',
          status: 'OPEN',
        },
      ],
      page: 1,
      pageSize: 5,
      totalItems: 1,
      totalPages: 1,
      search: '',
    }

    it('parses valid paginated lot response', () => {
      const result = lotsResponseSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('ensures unitCostCents is an integer', () => {
      const result = lotsResponseSchema.safeParse({
        ...validPayload,
        items: [{ ...validPayload.items[0]!, unitCostCents: 500.75 }],
      })
      expect(result.success).toBe(false)
    })

    it('validates status is OPEN or EXHAUSTED', () => {
      const result = lotsResponseSchema.safeParse({
        ...validPayload,
        items: [{ ...validPayload.items[0]!, status: 'CLOSED' as string }],
      })
      expect(result.success).toBe(false)
    })

    it('accepts EXHAUSTED lot with zero remaining', () => {
      const result = lotsResponseSchema.safeParse({
        ...validPayload,
        items: [
          {
            ...validPayload.items[0]!,
            remainingQuantity: 0,
            totalCostCents: 0,
            status: 'EXHAUSTED' as const,
          },
        ],
      })
      expect(result.success).toBe(true)
    })
  })
})

// ── Contract Drift Rejection ───────────────────────────────

describe('Reports — contract drift protection', () => {
  it('getLiquidity rejects payload without liquidityCents (NaN prevention)', async () => {
    // Simulate backend sending old shape
    mockFetchSuccess({ totalCashInCents: 1000, totalCashOutCents: 500, balanceCents: 500 })
    const r = await getLiquidity()
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.error).toBe('ContractError')
    }
  })

  it('getStockInvestment rejects payload using old field name', async () => {
    mockFetchSuccess({ stockInvestmentCents: 50000, currency: 'ARS' })
    const r = await getStockInvestment()
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.error).toBe('ContractError')
    }
  })

  it('getStockByProduct rejects legacy flat array (contract drift)', async () => {
    mockFetchSuccess([
      { productName: 'Prod', sku: 'SKU-1', totalRemainingQty: 2, investmentCents: 1000 },
    ])
    const r = await getStockByProduct()
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.error).toBe('ContractError')
    }
  })

  it('getLots rejects legacy flat array (contract drift)', async () => {
    mockFetchSuccess([
      {
        lotId: 'lot-1', variantId: 'v1', productName: 'P', sku: 'S',
        purchasedQuantity: 10, remainingQuantity: 5, unitCostCents: 100,
        purchaseDate: '2026-01-01T00:00:00.000Z',
      },
    ])
    const r = await getLots()
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.error).toBe('ContractError')
    }
  })

  it('getStockByProduct returns error on completely invalid shape', async () => {
    mockFetchSuccess({ error: 'something else entirely' })
    const r = await getStockByProduct()
    expect(r.ok).toBe(false)
  })

  it('getLots returns error on completely invalid shape', async () => {
    mockFetchSuccess('just a string')
    const r = await getLots()
    expect(r.ok).toBe(false)
  })
})
