import 'server-only'

/**
 * Cash Box API client.
 *
 * Endpoints:
 * - GET    /cash-boxes/current              → CashBox
 * - GET    /cash-boxes                      → CashBox[]
 * - POST   /cash-boxes/open                 → CashBox
 * - POST   /cash-boxes/current/close        → CashBox
 * - GET    /cash-boxes/:id                  → CashBoxSummary
 * - POST   /cash-boxes/current/movements    → CashMovement
 * - GET    /cash-boxes/:id/movements        → CashMovementList
 */

import { apiGet, apiPost } from './api-fetch'
import type { ApiResult } from './api-fetch'
import {
  cashBoxSchema,
  cashBoxListSchema,
  cashBoxSummarySchema,
  cashMovementSchema,
  cashMovementListSchema,
  manualMovementFormSchema,
  closeCashBoxFormSchema,
  cashClosingFormSchema,
  type CashBox,
  type CashBoxSummary,
  type CashMovement,
  type CashMovementList,
  type ManualMovementFormData,
  type CloseCashBoxFormData,
  type CashClosingFormData,
  type CashClosingResponse,
} from './schemas'

// Re-export schemas and types for server-side consumers
export {
  cashBoxSchema,
  cashBoxListSchema,
  cashBoxSummarySchema,
  cashMovementSchema,
  cashMovementListSchema,
  manualMovementFormSchema,
  closeCashBoxFormSchema,
  cashClosingFormSchema,
  type CashBox,
  type CashBoxSummary,
  type CashMovement,
  type CashMovementList,
  type ManualMovementFormData,
  type CloseCashBoxFormData,
  type CashClosingFormData,
  type CashClosingResponse,
}

// ── API functions ──────────────────────────────────────────────────

/** Get the current open cash box. 404 means no current box exists — valid state. */
export async function getCurrentCashBox(): Promise<ApiResult<CashBox>> {
  return apiGet<CashBox>('/cash-boxes/current')
}

/** List all cash boxes ordered by business date descending. */
export async function listCashBoxes(): Promise<ApiResult<CashBox[]>> {
  return apiGet<CashBox[]>('/cash-boxes')
}

/** Open a new cash box for today. */
export async function openCashBox(): Promise<ApiResult<CashBox>> {
  return apiPost<CashBox>('/cash-boxes/open', {})
}

/** Close the current cash box. The server derives the final balance from the cash ledger. */
export async function closeCashBox(): Promise<ApiResult<CashBox>> {
  return apiPost<CashBox>('/cash-boxes/current/close', {})
}

/** Get financial summary for a specific cash box. */
export async function getCashBoxSummary(
  id: string,
): Promise<ApiResult<CashBoxSummary>> {
  return apiGet<CashBoxSummary>(`/cash-boxes/${id}`)
}

/** Add a manual movement (adjustment or withdrawal) to the current open cash box. */
export async function addCashMovement(
  body: ManualMovementFormData,
): Promise<ApiResult<CashMovement>> {
  return apiPost<CashMovement>('/cash-boxes/current/movements', body)
}

export interface CashBoxMovementsFilters {
  page?: number
  pageSize?: number
  type?: string
  search?: string
  from?: string
  to?: string
}

/** Get paginated movements for a cash box with optional filters. */
export async function getCashBoxMovements(
  id: string,
  filters?: CashBoxMovementsFilters,
): Promise<ApiResult<CashMovementList>> {
  const params = new URLSearchParams()
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') {
        params.set(key, String(value))
      }
    }
  }
  const qs = params.toString()
  const path = qs ? `/cash-boxes/${id}/movements?${qs}` : `/cash-boxes/${id}/movements`
  return apiGet<CashMovementList>(path)
}

// ── Legacy closing (preserved for backward compat) ──────────────────

export async function closeCash(
  body: CashClosingFormData,
): Promise<ApiResult<CashClosingResponse>> {
  return apiPost<CashClosingResponse>('/cash/closings', body)
}
