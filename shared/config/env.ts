/**
 * Server-only environment configuration.
 *
 * Validates required runtime variables at module load.
 * Never leaks secrets to the client — all exports are server-safe.
 *
 * Design decisions:
 * - API_BASE_URL: backend HTTP base for server-to-server calls.
 *   In Docker: http://api:3000 (service DNS). Locally: http://localhost:3000.
 * - FRONTEND_ORIGIN: public browser origin (for CORS config, not for fetch).
 * - COOKIE_NAME: name of the httpOnly JWT session cookie.
 * - IS_PRODUCTION: guards against dev-only defaults leaking to prod.
 */

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000'
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3001'
const COOKIE_NAME = process.env.COOKIE_NAME ?? 'complicidad_session'
const NODE_ENV = process.env.NODE_ENV ?? 'development'

const IS_PRODUCTION = NODE_ENV === 'production'

if (IS_PRODUCTION) {
  if (API_BASE_URL === 'http://localhost:3000') {
    console.warn(
      '[complicidad] API_BASE_URL is default localhost in production — set API_BASE_URL env var',
    )
  }
  if (FRONTEND_ORIGIN === 'http://localhost:3001') {
    console.warn(
      '[complicidad] FRONTEND_ORIGIN is default localhost in production — set FRONTEND_ORIGIN env var',
    )
  }
}

export const env = {
  API_BASE_URL,
  FRONTEND_ORIGIN,
  COOKIE_NAME,
  NODE_ENV,
  IS_PRODUCTION,
  /** Cookie flags for the httpOnly session token. */
  cookieOptions: {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 5, // 5 days — matches backend JWT expiry
  },
} as const

export type Env = typeof env
