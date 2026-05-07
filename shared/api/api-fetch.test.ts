import { describe, it, expect, beforeEach, vi } from 'vitest'

// ── Hoisted mock state ─────────────────────────────────────────────
// vi.mock is hoisted — external variables not visible inside factory.
// Use vi.hoisted() for shared mutable state.

const { cookieMap } = vi.hoisted(() => ({
  cookieMap: new Map<string, string>(),
}))

// ── Mocks ──────────────────────────────────────────────────────────

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

import {
  apiFetch,
  apiGet,
  apiPost,
  apiPut,
  getBearerToken,
} from './api-fetch'

// ── Helpers ────────────────────────────────────────────────────────

function mockFetchResponse(status: number, data: unknown, ok = status >= 200 && status < 300) {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok,
    status,
    json: vi.fn().mockResolvedValue(data),
  } as unknown as Response)
}

function mockFetchNetworkError(message = 'fetch failed') {
  vi.mocked(fetch).mockRejectedValueOnce(new Error(message))
}

function mockFetchTimeout() {
  vi.mocked(fetch).mockRejectedValueOnce(
    new DOMException('The operation was aborted', 'AbortError'),
  )
}

function mockFetchNonJson(status: number) {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: false,
    status,
    json: vi.fn().mockRejectedValue(new Error('Not JSON')),
  } as unknown as Response)
}

// ── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  cookieMap.clear()
})

describe('getBearerToken', () => {
  it('returns null when no session cookie exists', async () => {
    const token = await getBearerToken()
    expect(token).toBeNull()
  })

  it('returns JWT from session cookie', async () => {
    cookieMap.set('test_session', 'jwt-token-123')
    const token = await getBearerToken()
    expect(token).toBe('jwt-token-123')
  })
})

describe('apiFetch', () => {
  it('makes a GET request with correct URL', async () => {
    mockFetchResponse(200, { data: 'ok' })

    const result = await apiFetch('/test')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual({ data: 'ok' })
      expect(result.status).toBe(200)
    }
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/test',
      expect.objectContaining({ method: 'GET', cache: 'no-store' }),
    )
  })

  it('makes a POST request with JSON body', async () => {
    mockFetchResponse(201, { id: '1' })

    const result = await apiFetch('/items', { method: 'POST', body: { name: 'test' } })

    expect(result.ok).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/items',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
      }),
    )
  })

  it('includes bearer token in Authorization header', async () => {
    mockFetchResponse(200, { ok: true })

    await apiFetch('/protected', { bearerToken: 'my-jwt-token' })

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer my-jwt-token' }),
      }),
    )
  })

  it('does NOT include Authorization header when no token', async () => {
    mockFetchResponse(200, { ok: true })

    await apiFetch('/public')

    const call = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit
    expect(call.headers).not.toHaveProperty('Authorization')
  })

  it('handles 400 error with { error, message }', async () => {
    mockFetchResponse(400, { error: 'ValidationError', message: 'Invalid data' }, false)

    const result = await apiFetch('/items', { method: 'POST', body: {} })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.status).toBe(400)
      expect(result.error.error).toBe('ValidationError')
      expect(result.error.message).toBe('Invalid data')
    }
  })

  it('handles 401 unauthorized', async () => {
    mockFetchResponse(401, { error: 'Unauthorized', message: 'Token expired' }, false)

    const result = await apiFetch('/admin')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.status).toBe(401)
      expect(result.error.error).toBe('Unauthorized')
    }
  })

  it('handles 404 not found', async () => {
    mockFetchResponse(404, { error: 'NotFound', message: 'Resource missing' }, false)

    const result = await apiFetch('/missing')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.status).toBe(404)
    }
  })

  it('handles 409 conflict', async () => {
    mockFetchResponse(409, { error: 'ConflictError', message: 'Already exists' }, false)

    const result = await apiFetch('/register', { method: 'POST', body: {} })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.status).toBe(409)
    }
  })

  it('handles network errors as 503', async () => {
    mockFetchNetworkError('Connection refused')

    const result = await apiFetch('/items')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.status).toBe(503)
      expect(result.error.error).toBe('NetworkError')
      expect(result.error.message).toBe('Connection refused')
    }
  })

  it('handles timeout as AbortError → 503', async () => {
    mockFetchTimeout()

    const result = await apiFetch('/slow')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.status).toBe(503)
      expect(result.error.error).toBe('TimeoutError')
      expect(result.error.message).toContain('excedió el tiempo límite')
    }
  })

  it('handles non-JSON responses as NetworkError', async () => {
    mockFetchNonJson(500)

    const result = await apiFetch('/broken')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.status).toBe(500)
      expect(result.error.error).toBe('NetworkError')
      expect(result.error.message).toContain('no JSON')
    }
  })

  it('supports custom Cache option', async () => {
    mockFetchResponse(200, { data: 'ok' })

    await apiFetch('/cached', { cache: 'force-cache' })

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ cache: 'force-cache' }),
    )
  })

  it('supports PUT method', async () => {
    mockFetchResponse(200, { id: '1', updated: true })

    const result = await apiFetch('/items/1', { method: 'PUT', body: { name: 'updated' } })

    expect(result.ok).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('supports DELETE method', async () => {
    mockFetchResponse(204, null)

    const result = await apiFetch('/items/1', { method: 'DELETE' })

    expect(result.ok).toBe(true)
  })
})

describe('apiGet', () => {
  it('injects bearer token automatically when session exists', async () => {
    cookieMap.set('test_session', 'auto-jwt')
    mockFetchResponse(200, { items: [] })

    const result = await apiGet('/customers')

    expect(result.ok).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer auto-jwt' }),
      }),
    )
  })

  it('works when no session exists (no auth header)', async () => {
    mockFetchResponse(200, { public: true })

    const result = await apiGet('/public')

    expect(result.ok).toBe(true)
    const call = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit
    expect(call.headers).not.toHaveProperty('Authorization')
  })
})

describe('apiPost', () => {
  it('injects bearer token and sends body', async () => {
    cookieMap.set('test_session', 'post-jwt')
    mockFetchResponse(201, { id: 'new-1' })

    const result = await apiPost('/customers', { name: 'New' })

    expect(result.ok).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer post-jwt' }),
        body: JSON.stringify({ name: 'New' }),
      }),
    )
  })
})

describe('apiPut', () => {
  it('injects bearer token and sends body', async () => {
    cookieMap.set('test_session', 'put-jwt')
    mockFetchResponse(200, { id: '1', updated: true })

    const result = await apiPut('/customers/1', { name: 'Updated' })

    expect(result.ok).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({ Authorization: 'Bearer put-jwt' }),
        body: JSON.stringify({ name: 'Updated' }),
      }),
    )
  })
})
