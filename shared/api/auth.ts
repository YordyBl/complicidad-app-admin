import 'server-only'

/**
 * Auth API client — login and registration endpoints.
 *
 * Schemas mirror the backend DTOs:
 * - POST /api/v1/login  → { token, user }
 * - POST /api/v1/register → { user }
 * Errors: { error, message } with 400/401/409/503 status.
 */

import { apiFetch } from './api-fetch'
import type { ApiResult } from './api-fetch'
import {
  loginRequestSchema,
  loginResponseSchema,
  registerRequestSchema,
  registerResponseSchema,
  type LoginRequest,
  type LoginResponse,
  type RegisterRequest,
  type RegisterResponse,
} from './schemas'

// Re-export schemas and types for server-side consumers
export {
  loginRequestSchema,
  loginResponseSchema,
  registerRequestSchema,
  registerResponseSchema,
  type LoginRequest,
  type LoginResponse,
  type RegisterRequest,
  type RegisterResponse,
}

// ── API functions ──────────────────────────────────────────────────

/** POST /api/v1/login — authenticate and receive JWT. */
export async function login(
  body: LoginRequest,
): Promise<ApiResult<LoginResponse>> {
  return apiFetch<LoginResponse>('/login', {
    method: 'POST',
    body,
    // No bearer token — this is the auth endpoint itself
  })
}

/** POST /api/v1/register — create a new user account (public). */
export async function register(
  body: RegisterRequest,
): Promise<ApiResult<RegisterResponse>> {
  return apiFetch<RegisterResponse>('/register', {
    method: 'POST',
    body,
    // No bearer token — public registration
  })
}
