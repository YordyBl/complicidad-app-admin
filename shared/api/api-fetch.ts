import 'server-only'

/**
 * Server-only API fetch client for Complicidad backend.
 *
 * Responsibilities:
 * - Resolves API_BASE_URL server-side (never exposed to browser).
 * - Injects bearer JWT from httpOnly session cookie.
 * - Normalizes backend { error, message } responses into typed results.
 * - Applies cache: 'no-store' by default for mutable/private data.
 * - Handles network/timeout errors gracefully.
 */

import { env } from '@/shared/config/env'
import { cookies } from 'next/headers'

// ── Types ──────────────────────────────────────────────────────────

export interface ApiError {
  error: string
  message: string
  status: number
}

export interface ApiSuccess<T> {
  ok: true
  data: T
  status: number
}

export interface ApiFailure {
  ok: false
  error: ApiError
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure

// ── Default fetch options ──────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 15_000

function buildHeaders(bearerToken?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  if (bearerToken) {
    headers['Authorization'] = `Bearer ${bearerToken}`
  }
  return headers
}

// ── Exported helpers ───────────────────────────────────────────────

/** Read the session JWT from the httpOnly cookie (server-only). */
export async function getBearerToken(): Promise<string | null> {
  try {
    const jar = await cookies()
    return jar.get(env.COOKIE_NAME)?.value ?? null
  } catch {
    return null
  }
}

/** Core fetch wrapper — always server-side. */
export async function apiFetch<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: unknown
    bearerToken?: string | null
    cache?: RequestCache
    timeoutMs?: number
  } = {},
): Promise<ApiResult<T>> {
  const {
    method = 'GET',
    body,
    bearerToken,
    cache = 'no-store',
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options

  const url = `${env.API_BASE_URL}/api/v1${path}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      method,
      headers: buildHeaders(bearerToken ?? undefined),
      body: body ? JSON.stringify(body) : undefined,
      cache,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    // Try to parse JSON, fall back to text for network/unexpected errors
    let json: unknown
    try {
      json = await res.json()
    } catch {
      return {
        ok: false,
        error: {
          error: 'NetworkError',
          message: `El backend devolvió una respuesta no JSON (status ${res.status})`,
          status: res.status || 503,
        },
      }
    }

    if (!res.ok) {
      const err = json as Record<string, unknown>
      return {
        ok: false,
        error: {
          error: typeof err.error === 'string' ? err.error : 'UnknownError',
          message: typeof err.message === 'string' ? err.message : 'Error desconocido',
          status: res.status,
        },
      }
    }

    return {
      ok: true,
      data: json as T,
      status: res.status,
    }
  } catch (err: unknown) {
    clearTimeout(timeoutId)
    if (err instanceof DOMException && err.name === 'AbortError') {
      return {
        ok: false,
        error: {
          error: 'TimeoutError',
          message: `La solicitud a ${path} excedió el tiempo límite después de ${timeoutMs}ms`,
          status: 503,
        },
      }
    }
    const message = err instanceof Error ? err.message : 'Error de red desconocido'
    return {
      ok: false,
      error: {
        error: 'NetworkError',
        message,
        status: 503,
      },
    }
  }
}

/** Convenience: GET request with auto bearer injection. */
export async function apiGet<T>(
  path: string,
  cache: RequestCache = 'no-store',
): Promise<ApiResult<T>> {
  const token = await getBearerToken()
  return apiFetch<T>(path, { method: 'GET', bearerToken: token, cache })
}

/** Convenience: POST request with auto bearer injection. */
export async function apiPost<T>(
  path: string,
  body: unknown,
): Promise<ApiResult<T>> {
  const token = await getBearerToken()
  return apiFetch<T>(path, { method: 'POST', body, bearerToken: token })
}

/** Convenience: PUT request with auto bearer injection. */
export async function apiPut<T>(
  path: string,
  body: unknown,
): Promise<ApiResult<T>> {
  const token = await getBearerToken()
  return apiFetch<T>(path, { method: 'PUT', body, bearerToken: token })
}
