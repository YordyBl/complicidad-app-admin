/**
 * Tests for GET /api/sales/[id]/constancia-emissions/[emissionId]/pdf
 *
 * Covers task 3.4:
 * - Auth passthrough via httpOnly cookie
 * - PDF Content-Type and Content-Disposition headers
 * - Binary body forwarding
 * - Backend error propagation
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Hoisted mock state ──────────────────────────────────────────────
const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}))

// ── Mock global fetch ───────────────────────────────────────────────
vi.stubGlobal('fetch', mockFetch)

// ── Mock next/headers cookies ───────────────────────────────────────
const { mockCookieGet, mockCookieHas } = vi.hoisted(() => ({
  mockCookieGet: vi.fn(),
  mockCookieHas: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: mockCookieGet,
    has: mockCookieHas,
  }),
}))

// ── Mock env ────────────────────────────────────────────────────────
vi.mock('@/shared/config/env', () => ({
  env: {
    API_BASE_URL: 'http://localhost:3000',
    COOKIE_NAME: 'complicidad_session',
  },
}))

// ── Import route handler under test ─────────────────────────────────
import { GET } from './route'

// ── Helpers ─────────────────────────────────────────────────────────

function makeRequest(saleId = 'sale-uuid-0001', emissionId = 'emission-uuid-0001'): NextRequest {
  const url = new URL(`http://localhost/api/sales/${saleId}/constancia-emissions/${emissionId}/pdf`)
  return new NextRequest(url)
}

function mockBackendSuccess(pdfBuffer = Buffer.from('%PDF-1.4 fake pdf'), headers?: Record<string, string>) {
  mockFetch.mockResolvedValueOnce(
    new Response(pdfBuffer, {
      status: 200,
      headers: new Headers({
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="constancia-1-sale-uuid-0001.pdf"',
        'content-length': String(pdfBuffer.length),
        ...headers,
      }),
    }),
  )
}

function mockBackendError(status: number, body: Record<string, unknown>) {
  mockFetch.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  )
}

// ── Tests ───────────────────────────────────────────────────────────

// Pre-existing test guard: new file, no safety net needed

describe('GET /api/sales/[id]/constancia-emissions/[emissionId]/pdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCookieGet.mockReturnValue({ value: 'test-jwt-token' })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('proxies the request to backend with auth token from cookie', async () => {
    mockBackendSuccess()

    await GET(makeRequest(), { params: Promise.resolve({ id: 'sale-uuid-0001', emissionId: 'emission-uuid-0001' }) } as unknown as never)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const fetchUrl = mockFetch.mock.calls[0]?.[0] as string
    expect(fetchUrl).toContain('/sale-uuid-0001/constancia-emissions/emission-uuid-0001/pdf')
    const fetchInit = mockFetch.mock.calls[0]?.[1] as RequestInit | undefined
    expect(fetchInit?.headers).toBeDefined()
    const headers = fetchInit?.headers as Record<string, string> | undefined
    expect(headers?.['Authorization']).toBe('Bearer test-jwt-token')
  })

  it('returns PDF content type and binary body on backend success', async () => {
    const pdfBytes = Buffer.from('%PDF-1.4 test pdf content')
    mockBackendSuccess(pdfBytes)

    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'sale-uuid-0001', emissionId: 'emission-uuid-0001' }) } as unknown as never)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('Content-Disposition')).toContain('attachment')
    expect(response.headers.get('Content-Disposition')).toContain('filename=')

    const body = await response.arrayBuffer()
    expect(new Uint8Array(body)).toEqual(new Uint8Array(pdfBytes))
  })

  it('forwards backend 404 with JSON error body', async () => {
    mockBackendError(404, { error: 'NotFoundError', message: 'Emission not found' })

    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'sale-uuid-0001', emissionId: 'bad-emission' }) } as unknown as never)

    expect(response.status).toBe(404)
    const body = await response.json() as Record<string, unknown>
    expect(body.error).toBe('NotFoundError')
    expect(body.message).toBe('Emission not found')
  })

  it('forwards backend 500 with JSON error body', async () => {
    mockBackendError(500, { error: 'InternalError', message: 'PDF generation failed' })

    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'sale-uuid-0001', emissionId: 'emission-uuid-0001' }) } as unknown as never)

    expect(response.status).toBe(500)
    const body = await response.json() as Record<string, unknown>
    expect(body.error).toBe('InternalError')
  })

  it('preserves Content-Disposition header from backend', async () => {
    mockBackendSuccess(Buffer.from('pdf'), {
      'content-disposition': 'attachment; filename="constancia-3-sale-abc.pdf"',
    })

    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'sale-uuid-0001', emissionId: 'em-uuid-0003' }) } as unknown as never)

    expect(response.headers.get('Content-Disposition')).toContain('constancia-3-sale-abc.pdf')
  })

  it('returns 401 when no auth cookie is present', async () => {
    mockCookieGet.mockReturnValue(undefined)

    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'sale-uuid-0001', emissionId: 'emission-uuid-0001' }) } as unknown as never)

    expect(response.status).toBe(401)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns 503 on network error to backend', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

    const response = await GET(makeRequest(), { params: Promise.resolve({ id: 'sale-uuid-0001', emissionId: 'emission-uuid-0001' }) } as unknown as never)

    expect(response.status).toBe(503)
    const body = await response.json() as Record<string, unknown>
    expect(body.error).toBe('NetworkError')
  })
})
