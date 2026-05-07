/**
 * Health check API client — internal diagnostic endpoint.
 *
 * GET /health → { status, timestamp }
 * Not prefixed with /api/v1 — direct mount on Express app.
 */

import { z } from 'zod'
import { env } from '@/shared/config/env'

const healthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
})

export type HealthResponse = z.infer<typeof healthResponseSchema>

/**
 * Check backend connectivity.
 * Uses the raw API_BASE_URL (no /api/v1 prefix — /health is at root).
 */
export async function checkHealth(): Promise<{
  ok: boolean
  data?: HealthResponse
  error?: string
}> {
  try {
    const res = await fetch(`${env.API_BASE_URL}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    const json: unknown = await res.json()
    const parsed = healthResponseSchema.safeParse(json)
    if (parsed.success) {
      return { ok: true, data: parsed.data }
    }
    return { ok: false, error: 'Unexpected health response format' }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { ok: false, error: message }
  }
}
