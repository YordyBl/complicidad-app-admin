/**
 * Tests for GET /api/inventory/search?term= proxy route.
 *
 * Covers:
 *  - Unwrap + remap: backend { matchType, items: [{ variantSku }] } → [{ sku }]
 *  - Pass-through: backend flat array → returned unchanged
 *  - Empty: backend { matchType: "none", items: [] } → []
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Hoisted mock for searchItems ───────────────────────────────────

const { mockSearchItems } = vi.hoisted(() => ({
  mockSearchItems: vi.fn(),
}))

vi.mock('@/shared/api/inventory', () => ({
  searchItems: mockSearchItems,
}))

// ── Import under test (must be after mock) ──────────────────────────

import { GET } from './route'

// ── Helpers ─────────────────────────────────────────────────────────

function makeRequest(term: string): NextRequest {
  const url = new URL(`http://localhost/api/inventory/search?term=${encodeURIComponent(term)}`)
  return new NextRequest(url)
}

function mockBackendSuccess(data: unknown) {
  mockSearchItems.mockResolvedValueOnce({
    ok: true,
    data,
    status: 200,
  })
}

async function expectJsonBody(response: Response): Promise<unknown> {
  return response.json()
}

/** Cast unknown to array for tests that expect array-shaped responses. */
type JsonArray = Record<string, unknown>[]
const asArray = (v: unknown): JsonArray => v as JsonArray

// ── Tests ───────────────────────────────────────────────────────────

describe('GET /api/inventory/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── R1: Unwrap + remap variantSku → sku ───────────────────────────

  it('unwraps { matchType, items } and remaps variantSku → sku (R1)', async () => {
    mockBackendSuccess({
      matchType: 'exact',
      items: [
        { variantId: 'v1', variantSku: 'SKU-001', productName: 'Test', salePrice: 100, presalePrice: null },
      ],
    })

    const response = await GET(makeRequest('SKU'))
    const body = await expectJsonBody(response)

    expect(response.status).toBe(200)
    expect(body).toEqual([
      { variantId: 'v1', sku: 'SKU-001', productName: 'Test', salePrice: 100, presalePrice: null },
    ])
  })

  it('unwraps multiple items with variantSku → sku remap (R1 — triangulate)', async () => {
    mockBackendSuccess({
      matchType: 'partial',
      items: [
        { variantId: 'v1', variantSku: 'SKU-A' },
        { variantId: 'v2', variantSku: 'SKU-B' },
      ],
    })

    const response = await GET(makeRequest('SKU'))
    const body = await expectJsonBody(response)

    expect(body).toHaveLength(2)
    expect(body).toEqual([
      expect.objectContaining({ variantId: 'v1', sku: 'SKU-A' }),
      expect.objectContaining({ variantId: 'v2', sku: 'SKU-B' }),
    ])
    // Confirm no variantSku field leaked
    const arr = asArray(body)
    expect(arr[0]).not.toHaveProperty('variantSku')
    expect(arr[1]).not.toHaveProperty('variantSku')
    // Confirm no matchType wrapper leaked
    expect(body).not.toHaveProperty('matchType')
  })

  // ── R2: Pass through flat arrays ──────────────────────────────────

  it('passes through already-flat arrays unchanged (R2)', async () => {
    const flatItems = [
      { variantId: 'v1', sku: 'SKU-Y', productName: 'Existing', salePrice: 50, presalePrice: null },
    ]
    mockBackendSuccess(flatItems)

    const response = await GET(makeRequest('SK'))
    const body = await expectJsonBody(response)

    expect(response.status).toBe(200)
    expect(body).toEqual(flatItems)
    // Exact reference check: same items, not wrapped
    expect(body).toHaveLength(1)
    expect(asArray(body)[0]).toHaveProperty('sku', 'SKU-Y')
  })

  // ── R3: Empty results ─────────────────────────────────────────────

  it('returns empty array when backend returns wrapped empty (R3)', async () => {
    mockBackendSuccess({ matchType: 'none', items: [] })

    const response = await GET(makeRequest('ZZZ'))
    const body = await expectJsonBody(response)

    expect(response.status).toBe(200)
    expect(body).toEqual([])
  })

  it('returns empty array when backend returns flat empty (R3 — triangulate)', async () => {
    mockBackendSuccess([])

    const response = await GET(makeRequest('ZZZ'))
    const body = await expectJsonBody(response)

    expect(response.status).toBe(200)
    expect(body).toEqual([])
  })

  // ── Already-present sku field (forward compat) ────────────────────

  it('prefers variantSku over sku when both are present (design: variantSku ?? sku)', async () => {
    mockBackendSuccess({
      matchType: 'exact',
      items: [
        { variantId: 'v1', variantSku: 'FROM-BACKEND', sku: 'CLIENT-LEGACY', productName: 'XY', salePrice: 10, presalePrice: null },
      ],
    })

    const response = await GET(makeRequest('XY'))
    const body = await expectJsonBody(response)

    // variantSku ?? sku → variantSku wins per design (backend is authoritative)
    expect(body).toEqual([
      expect.objectContaining({ variantId: 'v1', sku: 'FROM-BACKEND' }),
    ])
    expect(asArray(body)[0]).not.toHaveProperty('variantSku')
  })

  // ── Term < 2 should return 400 (existing behavior, unchanged) ─────

  it('returns 400 when term is less than 2 characters', async () => {
    const response = await GET(makeRequest('a'))
    const body = await expectJsonBody(response)

    expect(response.status).toBe(400)
    expect(body).toHaveProperty('error', 'ValidationError')
  })

  // ── Backend error propagation ─────────────────────────────────────

  it('propagates backend error when searchItems fails', async () => {
    mockSearchItems.mockResolvedValueOnce({
      ok: false,
      error: { error: 'ServerError', message: 'Backend down', status: 500 },
    })

    const response = await GET(makeRequest('ERR'))
    const body = await expectJsonBody(response)

    expect(response.status).toBe(500)
    expect(body).toHaveProperty('error', 'ServerError')
    expect(body).toHaveProperty('message', 'Backend down')
  })
})
