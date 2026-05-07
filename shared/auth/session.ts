/**
 * Server-only session management.
 *
 * Centralizes JWT httpOnly cookie read/write/delete.
 * Protected route layouts call `requireSession()` and redirect if absent.
 * NEVER import this in a 'use client' module — it uses next/headers cookies().
 *
 * Note: cookies() is async in Next.js 15.2+. All helpers are async.
 */

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { env } from '@/shared/config/env'

// ── Types ──────────────────────────────────────────────────────────

export interface SessionUser {
  id: string
  email: string
  name: string
  role: string
}

export interface SessionData {
  token: string
  user: SessionUser
}

// ── Cookie helpers ─────────────────────────────────────────────────

/**
 * Read the session cookie. Returns null if absent or invalid.
 * Does NOT validate JWT expiry — backend will reject expired tokens.
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const jar = await cookies()
    const raw = jar.get(env.COOKIE_NAME)?.value
    if (!raw) return null
    return JSON.parse(raw) as SessionData
  } catch {
    return null
  }
}

/**
 * Write the session cookie after successful login/registration.
 * Stores the full session payload as JSON in an httpOnly cookie.
 */
export async function setSession(data: SessionData): Promise<void> {
  const jar = await cookies()
  jar.set(env.COOKIE_NAME, JSON.stringify(data), env.cookieOptions)
}

/**
 * Delete the session cookie (logout).
 */
export async function clearSession(): Promise<void> {
  const jar = await cookies()
  jar.delete(env.COOKIE_NAME)
}

/**
 * Extract bearer token for API calls. Returns null if no session.
 */
export async function getSessionToken(): Promise<string | null> {
  const session = await getSession()
  return session?.token ?? null
}

// ── Route protection ───────────────────────────────────────────────

/**
 * Require a valid session for protected routes.
 * Redirects to /login if no session exists.
 * Call this in Server Component layouts/pages (must be awaited).
 *
 * IMPORTANT: This is UX protection only.
 * The backend currently has NO auth/RBAC middleware enforced.
 * Until that backend gap is closed, frontend protection does not
 * constitute security — it only prevents accidental exposure of
 * private UI to unauthenticated visitors.
 */
export async function requireSession(): Promise<SessionData> {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }
  return session
}

/**
 * If a session exists, redirect to dashboard.
 * Used on public pages (login, register) to skip auth if already logged in.
 */
export async function redirectIfAuthenticated(): Promise<void> {
  const session = await getSession()
  if (session) {
    redirect('/dashboard')
  }
}

// ── Backend auth gap documentation ─────────────────────────────────

/**
 * KNOWN BACKEND GAP:
 * The complicidad-API currently issues JWTs via POST /login but does NOT
 * enforce auth/RBAC middleware on protected routes (inventory, sales,
 * customers, reports, cash). All routes are technically open.
 *
 * Frontend session checks are UX-only and MUST NOT be treated as security.
 * Once backend auth middleware is implemented, the frontend session
 * boundary will provide real protection.
 *
 * Tracked in: backend README — "RBAC middleware is deferred work"
 */
