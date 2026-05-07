import { describe, it, expect, beforeEach, vi } from 'vitest'

const { registerMock } = vi.hoisted(() => ({
  registerMock: vi.fn(),
}))

vi.mock('@/shared/api/auth', () => ({
  registerRequestSchema: {
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
      if (!password || typeof password !== 'string' || password.length < 6) {
        return { success: false, error: { errors: [{ message: 'La contraseña debe tener al menos 6 caracteres' }] } }
      }
      return { success: true, data: { email, password, role: d.role } }
    },
  },
  register: registerMock,
}))

// Mock session module to avoid actual cookie writes
vi.mock('@/shared/auth/session', () => ({
  setSession: vi.fn(),
  getSession: vi.fn(),
  clearSession: vi.fn(),
  getSessionToken: vi.fn(),
  requireSession: vi.fn(),
  redirectIfAuthenticated: vi.fn(),
}))

import { registerAction } from './register-action'

function createFormData(data: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(data)) {
    fd.set(k, v)
  }
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('registerAction', () => {
  it('returns success on valid registration', async () => {
    registerMock.mockResolvedValueOnce({
      ok: true,
      data: { user: { id: '1', email: 'new@test.com', name: 'New User', role: 'operator' } },
      status: 201,
    })

    const fd = createFormData({ email: 'new@test.com', password: 'password123' })
    const result = await registerAction(null, fd)

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('returns error on short password', async () => {
    const fd = createFormData({ email: 'new@test.com', password: '12345' })
    const result = await registerAction(null, fd)

    expect(result.success).toBe(false)
    expect(registerMock).not.toHaveBeenCalled()
  })

  it('returns error on invalid email', async () => {
    const fd = createFormData({ email: 'badmail', password: 'password123' })
    const result = await registerAction(null, fd)

    expect(result.success).toBe(false)
    expect(registerMock).not.toHaveBeenCalled()
  })

  it('returns user-safe message on 409 conflict', async () => {
    registerMock.mockResolvedValueOnce({
      ok: false,
      error: { error: 'ConflictError', message: 'Email already registered', status: 409 },
    })

    const fd = createFormData({ email: 'exists@test.com', password: 'password123' })
    const result = await registerAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('existe')
  })

  it('returns error on 400 validation failure', async () => {
    registerMock.mockResolvedValueOnce({
      ok: false,
      error: { error: 'ValidationError', message: 'Invalid data', status: 400 },
    })

    const fd = createFormData({ email: 'new@test.com', password: 'password123' })
    const result = await registerAction(null, fd)

    expect(result.success).toBe(false)
  })

  it('returns server-unavailable on network error', async () => {
    registerMock.mockResolvedValueOnce({
      ok: false,
      error: { error: 'NetworkError', message: 'fetch failed', status: 503 },
    })

    const fd = createFormData({ email: 'new@test.com', password: 'password123' })
    const result = await registerAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('disponible')
  })
})
