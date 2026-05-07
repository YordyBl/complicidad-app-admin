import { describe, it, expect, beforeEach, vi } from 'vitest'

const { loginMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
}))

vi.mock('@/shared/api/auth', () => ({
  loginRequestSchema: {
    safeParse: (data: unknown) => {
      const d = data as Record<string, unknown>
      const email = d.email
      const password = d.password
      if (!email || typeof email !== 'string' || email.trim() === '') {
        return { success: false, error: { errors: [{ message: 'El email es requerido' }] } }
      }
      if (!email.includes('@')) {
        return { success: false, error: { errors: [{ message: 'Email inválido' }] } }
      }
      if (!password || typeof password !== 'string' || password.trim() === '') {
        return { success: false, error: { errors: [{ message: 'La contraseña es requerida' }] } }
      }
      return { success: true, data: { email, password } }
    },
  },
  login: loginMock,
}))

const { cookieMap } = vi.hoisted(() => ({
  cookieMap: new Map<string, string>(),
}))

vi.mock('@/shared/config/env', () => ({
  env: {
    API_BASE_URL: 'http://localhost:3000',
    COOKIE_NAME: 'test_session',
    cookieOptions: { httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 432000 },
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
    getAll: () => [],
    has: (name: string) => cookieMap.has(name),
  }),
}))

import { loginAction } from './login-action'

function createFormData(data: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(data)) {
    fd.set(k, v)
  }
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  cookieMap.clear()
})

describe('loginAction', () => {
  it('returns success on valid login and stores session cookie', async () => {
    loginMock.mockResolvedValueOnce({
      ok: true,
      data: {
        token: 'jwt-abc',
        user: { id: '1', email: 'test@test.com', name: 'Test', role: 'operator' },
      },
      status: 200,
    })

    const fd = createFormData({ email: 'test@test.com', password: 'secret123' })
    const result = await loginAction(null, fd)

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()

    const cookieVal = cookieMap.get('test_session')
    expect(cookieVal).toBeDefined()
    const parsed = JSON.parse(cookieVal!)
    expect(parsed.token).toBe('jwt-abc')
  })

  it('returns error on invalid email format', async () => {
    const fd = createFormData({ email: 'bad-email', password: 'secret' })
    const result = await loginAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Email')
    expect(loginMock).not.toHaveBeenCalled()
  })

  it('returns error on missing fields', async () => {
    const fd = createFormData({ email: '', password: '' })
    const result = await loginAction(null, fd)

    expect(result.success).toBe(false)
    expect(loginMock).not.toHaveBeenCalled()
  })

  it('returns user-safe message on 401', async () => {
    loginMock.mockResolvedValueOnce({
      ok: false,
      error: { error: 'Unauthorized', message: 'Invalid credentials', status: 401 },
    })

    const fd = createFormData({ email: 'test@test.com', password: 'wrong' })
    const result = await loginAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('incorrectos')
  })

  it('returns server-unavailable message on network error', async () => {
    loginMock.mockResolvedValueOnce({
      ok: false,
      error: { error: 'NetworkError', message: 'fetch failed', status: 503 },
    })

    const fd = createFormData({ email: 'test@test.com', password: 'secret123' })
    const result = await loginAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('disponible')
  })
})
