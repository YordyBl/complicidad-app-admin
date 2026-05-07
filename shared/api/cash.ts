import 'server-only'

/**
 * Cash closing API client.
 *
 * Endpoint:
 * - POST /api/v1/cash/closings → CashClosing
 *
 * Manual cash closing is a destructive/financial operation:
 * requires confirmation, duplicate-submit protection, and receipt display.
 */

import { apiPost } from './api-fetch'
import type { ApiResult } from './api-fetch'
import {
  cashClosingFormSchema,
  type CashClosingFormData,
  type CashClosingResponse,
} from './schemas'

// Re-export schemas and types for server-side consumers
export { cashClosingFormSchema, type CashClosingFormData, type CashClosingResponse }

// ── API functions ──────────────────────────────────────────────────

export async function closeCash(
  body: CashClosingFormData,
): Promise<ApiResult<CashClosingResponse>> {
  return apiPost<CashClosingResponse>('/cash/closings', body)
}
