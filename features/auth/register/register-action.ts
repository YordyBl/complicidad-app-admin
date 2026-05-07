'use server'

import { register as registerApi, registerRequestSchema } from '@/shared/api/auth'

export interface RegisterActionResult {
  success: boolean
  error?: string
}

/**
 * Server Action: register a new user account.
 * Server-side ensures no CORS issues and keeps backend DNS server-only.
 */
export async function registerAction(
  _prevState: RegisterActionResult | null,
  formData: FormData,
): Promise<RegisterActionResult> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role') || undefined,
  }

  const parsed = registerRequestSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }
  }

  const result = await registerApi(parsed.data)

  if (!result.ok) {
    if (result.error.status === 409) {
      return { success: false, error: 'Ya existe una cuenta con ese email.' }
    }
    if (result.error.error === 'NetworkError') {
      return { success: false, error: 'El servidor no está disponible. Intente más tarde.' }
    }
    return { success: false, error: result.error.message || 'Error al crear la cuenta.' }
  }

  return { success: true }
}
