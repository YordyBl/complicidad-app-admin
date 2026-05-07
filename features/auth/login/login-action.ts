'use server'

import { login, loginRequestSchema } from '@/shared/api/auth'
import { setSession } from '@/shared/auth/session'
import type { SessionData } from '@/shared/auth/session'

export interface LoginActionResult {
  success: boolean
  error?: string
}

/**
 * Server Action: authenticate user and establish httpOnly session cookie.
 * Called by the login form. Server-side ensures no CORS issues and
 * keeps backend DNS/tokens server-only.
 */
export async function loginAction(
  _prevState: LoginActionResult | null,
  formData: FormData,
): Promise<LoginActionResult> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = loginRequestSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }
  }

  const result = await login(parsed.data)

  if (!result.ok) {
    if (result.error.status === 401) {
      return { success: false, error: 'Email o contraseña incorrectos.' }
    }
    if (result.error.error === 'NetworkError') {
      return { success: false, error: 'El servidor no está disponible. Intente más tarde.' }
    }
    return { success: false, error: result.error.message || 'Error al iniciar sesión.' }
  }

  // Store session in httpOnly cookie
  const sessionData: SessionData = {
    token: result.data.token,
    user: result.data.user,
  }
  await setSession(sessionData)

  return { success: true }
}
