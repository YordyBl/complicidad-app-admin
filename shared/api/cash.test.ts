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
  getCurrentCashBox,
  listCashBoxes,
  openCashBox,
  closeCashBox,
  getCashBoxSummary,
  addCashMovement,
  getCashBoxMovements,
} from './cash'

// ── Helpers ────────────────────────────────────────────────────────

function mockFetchSuccess(data: unknown, status = 200) {
  fetchImpl.mockResolvedValueOnce({
    ok: true,
    status,
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

const baseUrl = 'http://localhost:3000/api/v1'

beforeEach(() => {
  fetchImpl.mockClear()
  cookieMap.clear()
})

// ── Tests ──────────────────────────────────────────────────────────

describe('getCurrentCashBox', () => {
  it('fetches GET /cash-boxes/current', async () => {
    const box = {
      id: 'cb-1',
      businessDate: '2026-05-15',
      status: 'OPEN',
      openingBalanceCents: 10000,
      currentBalanceCents: 15000,
      finalBalanceCents: null,
      closedAt: null,
      legacy: false,
      isCurrent: true,
      createdAt: '2026-05-15T10:00:00Z',
    }
    mockFetchSuccess(box)

    const result = await getCurrentCashBox()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('cb-1')
      expect(result.data.isCurrent).toBe(true)
      expect(result.data.status).toBe('OPEN')
    }
    expect(fetchImpl).toHaveBeenCalledWith(
      `${baseUrl}/cash-boxes/current`,
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('returns error on 404 (valid: no current caja)', async () => {
    mockFetchError(404, 'NotFoundError', 'No hay una caja abierta para hoy')

    const result = await getCurrentCashBox()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.status).toBe(404)
    }
  })

  it('returns error on network failure', async () => {
    fetchImpl.mockRejectedValueOnce(new Error('Connection refused'))

    const result = await getCurrentCashBox()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.error).toBe('NetworkError')
    }
  })
})

describe('listCashBoxes', () => {
  it('fetches GET /cash-boxes', async () => {
    const boxes = [
      { id: 'cb-1', businessDate: '2026-05-15', status: 'OPEN', isCurrent: true, openingBalanceCents: 0, currentBalanceCents: 0, finalBalanceCents: null, closedAt: null, legacy: false },
      { id: 'cb-2', businessDate: '2026-05-14', status: 'CLOSED', isCurrent: false, openingBalanceCents: 0, currentBalanceCents: 0, finalBalanceCents: 50000, closedAt: '2026-05-14T20:00:00Z', legacy: false },
    ]
    mockFetchSuccess(boxes)

    const result = await listCashBoxes()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(2)
      expect(result.data[0].id).toBe('cb-1')
    }
    expect(fetchImpl).toHaveBeenCalledWith(
      `${baseUrl}/cash-boxes`,
      expect.objectContaining({ method: 'GET' }),
    )
  })
})

describe('getCashBoxSummary', () => {
  it('fetches GET /cash-boxes/:id', async () => {
    const summary = {
      cashBoxId: 'cb-1',
      businessDate: '2026-05-15',
      status: 'OPEN',
      openingBalanceCents: 10000,
      currentBalanceCents: 25000,
      netMovementCents: 15000,
      grossSalesCents: 50000,
      purchaseOutflowCents: -20000,
      returnOutflowCents: -5000,
      manualAdjustmentsCents: 0,
      withdrawalsCents: -10000,
    }
    mockFetchSuccess(summary)

    const result = await getCashBoxSummary('cb-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.cashBoxId).toBe('cb-1')
      expect(result.data.grossSalesCents).toBe(50000)
      expect(result.data.purchaseOutflowCents).toBe(-20000)
    }
    expect(fetchImpl).toHaveBeenCalledWith(
      `${baseUrl}/cash-boxes/cb-1`,
      expect.objectContaining({ method: 'GET' }),
    )
  })
})

describe('closeCashBox', () => {
  it('posts POST /cash-boxes/current/close with final balance', async () => {
    const closed = { id: 'cb-1', status: 'CLOSED', finalBalanceCents: 25000 }
    mockFetchSuccess(closed, 200)

    const result = await closeCashBox({ finalBalanceCents: 25000 })

    expect(result.ok).toBe(true)
    expect(fetchImpl).toHaveBeenCalledWith(
      `${baseUrl}/cash-boxes/current/close`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ finalBalanceCents: 25000 }),
      }),
    )
  })
})

describe('addCashMovement', () => {
  it('posts POST /cash-boxes/current/movements', async () => {
    const movement = {
      id: 'mov-1',
      type: 'MANUAL_ADJUSTMENT',
      amountCents: -5000,
      concept: 'Pago proveedor',
      sourceId: '',
      createdAt: '2026-05-15T12:00:00Z',
      profitCents: null,
    }
    mockFetchSuccess(movement, 201)

    const result = await addCashMovement({
      concept: 'Pago proveedor',
      amountCents: -5000,
      type: 'MANUAL_ADJUSTMENT',
    })

    expect(result.ok).toBe(true)
    expect(fetchImpl).toHaveBeenCalledWith(
      `${baseUrl}/cash-boxes/current/movements`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ concept: 'Pago proveedor', amountCents: -5000, type: 'MANUAL_ADJUSTMENT' }),
      }),
    )
  })
})

describe('getCashBoxMovements', () => {
  it('fetches GET /cash-boxes/:id/movements', async () => {
    const movList = {
      cashBoxId: 'cb-1',
      businessDate: '2026-05-15',
      status: 'OPEN',
      entries: [
        { id: 'e1', type: 'SALE_INCOME', amountCents: 50000, concept: 'Venta #1', sourceId: 's1', createdAt: '2026-05-15T10:00:00Z', profitCents: 20000 },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    }
    mockFetchSuccess(movList)

    const result = await getCashBoxMovements('cb-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.entries).toHaveLength(1)
    }
    expect(fetchImpl).toHaveBeenCalledWith(
      `${baseUrl}/cash-boxes/cb-1/movements`,
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('passes query params for filters', async () => {
    mockFetchSuccess({ entries: [], total: 0, page: 2, pageSize: 10, totalPages: 0, cashBoxId: 'cb-1', businessDate: '', status: 'CLOSED' })

    await getCashBoxMovements('cb-1', { page: 2, pageSize: 10, type: 'WITHDRAWAL' })

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('page=2'),
      expect.anything(),
    )
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('pageSize=10'),
      expect.anything(),
    )
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('type=WITHDRAWAL'),
      expect.anything(),
    )
  })
})

describe('openCashBox', () => {
  it('posts POST /cash-boxes/open', async () => {
    const box = { id: 'cb-new', status: 'OPEN', openingBalanceCents: 0 }
    mockFetchSuccess(box, 201)

    const result = await openCashBox()

    expect(result.ok).toBe(true)
    expect(fetchImpl).toHaveBeenCalledWith(
      `${baseUrl}/cash-boxes/open`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify({}) }),
    )
  })
})
