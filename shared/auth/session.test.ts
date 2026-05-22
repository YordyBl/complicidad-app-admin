import { describe, it, expect, beforeEach, vi } from 'vitest'

// ── Hoisted state ──────────────────────────────────────────────────

const { cookieMap, deletedCookies, redirectFn } = vi.hoisted(() => ({
  cookieMap: new Map<string, string>(),
  deletedCookies: [] as string[],
  redirectFn: vi.fn(),
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
    delete: (name: string) => {
      cookieMap.delete(name)
      deletedCookies.push(name)
    },
    getAll: () => Array.from(cookieMap.entries()).map(([name, value]) => ({ name, value })),
    has: (name: string) => cookieMap.has(name),
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: redirectFn,
}))

// ── Imports ────────────────────────────────────────────────────────

import {
  getSession,
  setSession,
  clearSession,
  getSessionToken,
  requireSession,
  redirectIfAuthenticated,
  requireActorContext,
  type SessionData,
} from './session'

// ── Test data ──────────────────────────────────────────────────────

const validSession: SessionData = {
  token: 'jwt-test-token-abc',
  user: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'operator',
  },
}

// ── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  redirectFn.mockClear()
  cookieMap.clear()
  deletedCookies.length = 0
})

describe('getSession', () => {
  it('returns null when no cookie exists', async () => {
    const session = await getSession()
    expect(session).toBeNull()
  })

  it('returns session data when valid cookie exists', async () => {
    cookieMap.set('test_session', JSON.stringify(validSession))

    const session = await getSession()
    expect(session).not.toBeNull()
    expect(session?.token).toBe('jwt-test-token-abc')
    expect(session?.user.email).toBe('test@example.com')
    expect(session?.user.role).toBe('operator')
  })

  it('returns null when cookie contains invalid JSON', async () => {
    cookieMap.set('test_session', 'not-valid-json')

    const session = await getSession()
    expect(session).toBeNull()
  })

  it('returns null when cookie value is empty string', async () => {
    cookieMap.set('test_session', '')

    const session = await getSession()
    expect(session).toBeNull()
  })
})

describe('setSession', () => {
  it('stores session data as JSON in httpOnly cookie', async () => {
    await setSession(validSession)

    const raw = cookieMap.get('test_session')
    expect(raw).toBeDefined()
    const parsed = JSON.parse(raw!)
    expect(parsed.token).toBe('jwt-test-token-abc')
    expect(parsed.user.id).toBe('user-1')
  })

  it('overwrites existing session', async () => {
    cookieMap.set('test_session', JSON.stringify({ token: 'old' }))

    await setSession(validSession)

    const parsed = JSON.parse(cookieMap.get('test_session')!)
    expect(parsed.token).toBe('jwt-test-token-abc')
  })
})

describe('clearSession', () => {
  it('removes the session cookie', async () => {
    cookieMap.set('test_session', JSON.stringify(validSession))

    await clearSession()

    expect(cookieMap.has('test_session')).toBe(false)
    expect(deletedCookies).toContain('test_session')
  })

  it('does not throw and leaves state consistent when no cookie exists', async () => {
    // Pre-condition: no session cookie is set
    expect(cookieMap.has('test_session')).toBe(false)

    await clearSession()

    // Cookie should still be absent
    expect(cookieMap.has('test_session')).toBe(false)
  })

  it('preserves unrelated cookies when clearing session', async () => {
    cookieMap.set('other_cookie', 'preserved-value')

    await clearSession()

    // Session cookie is removed (mocked delete pushes to deletedCookies)
    expect(cookieMap.has('test_session')).toBe(false)
    // Unrelated cookie is untouched
    expect(cookieMap.get('other_cookie')).toBe('preserved-value')
  })
})

describe('getSessionToken', () => {
  it('returns the token from an active session', async () => {
    cookieMap.set('test_session', JSON.stringify(validSession))

    const token = await getSessionToken()
    expect(token).toBe('jwt-test-token-abc')
  })

  it('returns null when no session', async () => {
    const token = await getSessionToken()
    expect(token).toBeNull()
  })
})

describe('requireSession', () => {
  it('returns session data when session exists', async () => {
    cookieMap.set('test_session', JSON.stringify(validSession))

    const session = await requireSession()
    expect(session.token).toBe('jwt-test-token-abc')
    expect(redirectFn).not.toHaveBeenCalled()
  })

  it('redirects to /login when no session', async () => {
    try {
      await requireSession()
    } catch {
      // redirect throws NEXT_REDIRECT which we catch
    }
    expect(redirectFn).toHaveBeenCalledWith('/login')
  })

  it('redirects when session is invalid JSON', async () => {
    cookieMap.set('test_session', 'garbage')

    try {
      await requireSession()
    } catch {
      // Expected
    }
    expect(redirectFn).toHaveBeenCalledWith('/login')
  })
})

describe('redirectIfAuthenticated', () => {
  it('redirects to /dashboard when session exists', async () => {
    cookieMap.set('test_session', JSON.stringify(validSession))

    try {
      await redirectIfAuthenticated()
    } catch {
      // Expected
    }
    expect(redirectFn).toHaveBeenCalledWith('/dashboard')
  })

  it('does nothing when no session exists', async () => {
    await redirectIfAuthenticated()
    expect(redirectFn).not.toHaveBeenCalled()
  })
})

// ── requireActorContext ─────────────────────────────────────────────

describe('requireActorContext', () => {
  it('returns actorId and actorSource when session user exists', async () => {
    cookieMap.set('test_session', JSON.stringify(validSession))

    const ctx = await requireActorContext()

    expect('actorId' in ctx).toBe(true)
    expect('error' in ctx).toBe(false)
    if ('actorId' in ctx) {
      expect(ctx.actorId).toBe('user-1')
      expect(ctx.actorSource).toBe('complicidad-app-admin')
    }
  })

  it('returns error state when no session exists', async () => {
    const result = await requireActorContext()

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error).toBeTruthy()
    }
  })

  it('returns error state when session is invalid JSON', async () => {
    cookieMap.set('test_session', 'garbage')

    const result = await requireActorContext()

    expect('error' in result).toBe(true)
  })

  it('returns error state when session user has no id', async () => {
    cookieMap.set('test_session', JSON.stringify({
      token: 'tok',
      user: { email: 'a@b.com', name: 'X', role: 'operator' },
    }))

    const result = await requireActorContext()
    expect('error' in result).toBe(true)
  })
})
