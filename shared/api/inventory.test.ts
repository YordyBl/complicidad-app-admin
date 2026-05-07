import { describe, it, expect, vi } from 'vitest'

// ── Hoisted mock state ─────────────────────────────────────────────

const { cookieMap } = vi.hoisted(() => ({
  cookieMap: new Map<string, string>(),
}))

// ── Mock env ──────────────────────────────────────────────────────

vi.mock('@/shared/config/env', () => ({
  env: {
    API_BASE_URL: 'http://localhost:3000',
    FRONTEND_ORIGIN: 'http://localhost:3001',
    COOKIE_NAME: 'test_session',
    NODE_ENV: 'development',
    IS_PRODUCTION: false,
    cookieOptions: {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 432000,
    },
  },
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const val = cookieMap.get(name)
      return val ? { value: val } : undefined
    },
    set: (name: string, value: string) => { cookieMap.set(name, value) },
    delete: (name: string) => { cookieMap.delete(name) },
    getAll: () => Array.from(cookieMap.entries()).map(([name, value]) => ({ name, value })),
    has: (name: string) => cookieMap.has(name),
  }),
}))

// ── Imports ────────────────────────────────────────────────────────

import { listProducts, getProductById } from './inventory'

// ── Helpers ────────────────────────────────────────────────────────

function mockFetchResponse(status: number, data: unknown) {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
  } as unknown as Response)
}

const validProductItem = {
  id: 'prod-1',
  name: 'Test Product',
  description: null,
  baseSku: 'test-product',
  salePrice: 15.00,
  presalePrice: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  variants: [
    { id: 'var-1', sku: 'SKU-001', attributes: {}, isActive: true, stock: 10 },
  ],
}

const validMeta = {
  page: 1,
  pageSize: 20,
  totalItems: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  filters: { status: 'active', search: '' },
}

// ── Tests ──────────────────────────────────────────────────────────

describe('listProducts', () => {
  it('calls GET /products with no query string when no params', async () => {
    mockFetchResponse(200, { data: [], meta: validMeta })

    const result = await listProducts({})

    expect(result.ok).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/products',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('calls GET /products with serialized query params', async () => {
    mockFetchResponse(200, { data: [validProductItem], meta: { ...validMeta, totalPages: 2, hasNextPage: true } })

    const result = await listProducts({
      page: '2',
      pageSize: '10',
      search: 'shirt',
      status: 'all',
      sortBy: 'name',
      sortOrder: 'asc',
    })

    expect(result.ok).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('page=2'),
      expect.anything(),
    )
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('pageSize=10'),
      expect.anything(),
    )
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('search=shirt'),
      expect.anything(),
    )
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('status=all'),
      expect.anything(),
    )
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('sortBy=name'),
      expect.anything(),
    )
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('sortOrder=asc'),
      expect.anything(),
    )
  })

  it('returns typed data on success', async () => {
    mockFetchResponse(200, { data: [validProductItem], meta: validMeta })

    const result = await listProducts({})

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.data).toHaveLength(1)
      expect(result.data.data[0].name).toBe('Test Product')
      expect(result.data.data[0].variants[0].sku).toBe('SKU-001')
      expect(result.data.meta.totalItems).toBe(1)
    }
  })

  it('returns failure on API error', async () => {
    mockFetchResponse(400, { error: 'ValidationError', message: 'page must be a positive integer' }, )

    const result = await listProducts({ page: '0' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.error).toBe('ValidationError')
    }
  })

  it('returns empty data on empty list', async () => {
    mockFetchResponse(200, {
      data: [],
      meta: {
        page: 1, pageSize: 20, totalItems: 0, totalPages: 0,
        hasNextPage: false, hasPreviousPage: false,
        sortBy: 'createdAt', sortOrder: 'desc',
        filters: { status: 'active', search: '' },
      },
    })

    const result = await listProducts({})

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.data).toEqual([])
      expect(result.data.meta.totalItems).toBe(0)
    }
  })

  it('omits empty/undefined params from query string', async () => {
    mockFetchResponse(200, { data: [], meta: validMeta })

    await listProducts({ page: '', search: '', status: undefined as unknown as string })

    const callUrl = vi.mocked(fetch).mock.calls[0]![0] as string
    // Should not include empty-string params
    expect(callUrl).not.toContain('page=')
    expect(callUrl).not.toContain('search=')
  })
})

// ── getProductById ───────────────────────────────────────────────────

describe('getProductById', () => {
  it('returns product found by id', async () => {
    mockFetchResponse(200, { ...validProductItem })

    const result = await getProductById('prod-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('prod-1')
      expect(result.data.name).toBe('Test Product')
      expect(result.data.variants).toHaveLength(1)
      expect(result.data.variants[0].sku).toBe('SKU-001')
    }
  })

  it('returns 404 error when product not found', async () => {
    mockFetchResponse(404, { error: 'NotFound', message: 'Producto no encontrado' })

    const result = await getProductById('non-existent')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.error).toBe('NotFound')
      expect(result.error.status).toBe(404)
    }
  })

  it('forwards server error status', async () => {
    mockFetchResponse(500, { error: 'ServerError', message: 'Internal error' })

    const result = await getProductById('prod-1')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.status).toBe(500)
    }
  })

  it('calls GET /products/:id endpoint', async () => {
    mockFetchResponse(200, { ...validProductItem })

    await getProductById('prod-1')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/products/prod-1'),
      expect.anything(),
    )
  })
})
