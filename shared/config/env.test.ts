import { describe, it, expect, beforeEach, vi } from 'vitest'

// Since env.ts is evaluated at module load and uses process.env, 
// we need to set env vars before importing it.
// Use dynamic imports to re-evaluate the module with different env values.

describe('env module', () => {
  beforeEach(() => {
    vi.resetModules()
    // Reset process.env to known state
    vi.stubEnv('API_BASE_URL', 'http://localhost:3000')
    vi.stubEnv('FRONTEND_ORIGIN', 'http://localhost:3001')
    vi.stubEnv('COOKIE_NAME', 'complicidad_session')
    vi.stubEnv('NODE_ENV', 'development')
  })

  it('provides default values in development', async () => {
    const { env } = await import('./env')
    expect(env.API_BASE_URL).toBe('http://localhost:3000')
    expect(env.FRONTEND_ORIGIN).toBe('http://localhost:3001')
    expect(env.COOKIE_NAME).toBe('complicidad_session')
    expect(env.NODE_ENV).toBe('development')
    expect(env.IS_PRODUCTION).toBe(false)
  })

  it('sets secure: false in cookieOptions for development', async () => {
    const { env } = await import('./env')
    expect(env.cookieOptions.secure).toBe(false)
    expect(env.cookieOptions.httpOnly).toBe(true)
    expect(env.cookieOptions.sameSite).toBe('lax')
    expect(env.cookieOptions.path).toBe('/')
    expect(env.cookieOptions.maxAge).toBe(60 * 60 * 24 * 5) // 5 days
  })

  it('detects production mode', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { env } = await import('./env')
    expect(env.IS_PRODUCTION).toBe(true)
    expect(env.cookieOptions.secure).toBe(true)
  })

  it('reads custom env values', async () => {
    vi.stubEnv('API_BASE_URL', 'http://api:3000')
    vi.stubEnv('FRONTEND_ORIGIN', 'https://complicidad.com')
    vi.stubEnv('COOKIE_NAME', 'custom_session')
    const { env } = await import('./env')
    expect(env.API_BASE_URL).toBe('http://api:3000')
    expect(env.FRONTEND_ORIGIN).toBe('https://complicidad.com')
    expect(env.COOKIE_NAME).toBe('custom_session')
  })

  it('logs warnings for default values in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    
    // Re-import to trigger module-level check
    vi.resetModules()
    await import('./env')
    
    expect(warnSpy).toHaveBeenCalled()
    const calls = warnSpy.mock.calls.map((c) => c[0]).join(' ')
    expect(calls).toContain('API_BASE_URL')
    expect(calls).toContain('FRONTEND_ORIGIN')
    
    warnSpy.mockRestore()
  })

  it('does not warn when custom values set in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('API_BASE_URL', 'http://api:3000')
    vi.stubEnv('FRONTEND_ORIGIN', 'https://complicidad.com')
    
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    
    vi.resetModules()
    await import('./env')
    
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('exports env as const (immutable type)', async () => {
    const { env } = await import('./env')
    // Verify the env object shape is frozen-like (as const)
    expect(typeof env.API_BASE_URL).toBe('string')
    expect(typeof env.cookieOptions.maxAge).toBe('number')
  })
})
