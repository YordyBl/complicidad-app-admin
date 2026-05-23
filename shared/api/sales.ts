import 'server-only'

/**
 * Sales API client — create, cancel, return, list, detail, settle.
 *
 * Endpoints:
 * - POST /api/v1/sales              → Sale
 * - POST /api/v1/sales/:id/cancel   → CancelledSale
 * - POST /api/v1/sales/:id/return   → ReturnedSale
 * - POST /api/v1/sales/:id/settle-balance → SettledSale
 * - GET  /api/v1/sales              → { items, total, page, pageSize, totalPages }
 * - GET  /api/v1/sales/:id          → SaleDetail
 */

import { apiGet, apiPost } from './api-fetch'
import type { ApiResult } from './api-fetch'
import {
  saleFormSchema,
  saleIdFormSchema,
  saleListSchema,
  saleDetailSchema,
  saleListEntrySchema,
  saleListItemSchema,
  salesListQuerySchema,
  salesListResponseSchema,
  type SaleItem,
  type SaleFormData,
  type SaleListItem,
  type SaleListEntry,
  type SaleListItemDisplay,
  type SaleDetail,
  type SalesListQuery,
  type SalesListResponse,
  type SalesListRow,
} from './schemas'

// Re-export schemas and types for server-side consumers
export {
  saleFormSchema,
  saleIdFormSchema,
  saleListSchema,
  saleDetailSchema,
  saleListEntrySchema,
  saleListItemSchema,
  salesListQuerySchema,
  salesListResponseSchema,
  type SaleItem,
  type SaleFormData,
  type SaleListItem,
  type SaleListEntry,
  type SaleListItemDisplay,
  type SaleDetail,
  type SalesListQuery,
  type SalesListResponse,
  type SalesListRow,
}

// ── API functions ──────────────────────────────────────────────────

export async function createSale(
  body: SaleFormData,
): Promise<ApiResult<Record<string, unknown>>> {
  return apiPost<Record<string, unknown>>('/sales', body)
}

export async function cancelSale(
  saleId: string,
): Promise<ApiResult<Record<string, unknown>>> {
  return apiPost<Record<string, unknown>>(`/sales/${saleId}/cancel`, {})
}

export async function returnSale(
  saleId: string,
): Promise<ApiResult<Record<string, unknown>>> {
  return apiPost<Record<string, unknown>>(`/sales/${saleId}/return`, {})
}

/**
 * List sales with pagination, filters, and payment status.
 *
 * Accepts a flat query object matching the backend's paginated
 * sales contract. All params are optional — an empty call returns
 * the first page with default pageSize.
 */
export async function listSales(
  query?: SalesListQuery,
): Promise<ApiResult<SalesListResponse>> {
  const params = new URLSearchParams()
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        params.set(key, value)
      }
    }
  }
  const qs = params.toString()
  const path = qs ? `/sales?${qs}` : '/sales'

  const result = await apiGet<SalesListResponse>(path)

  // Validate response shape through Zod on success
  if (result.ok) {
    const parsed = salesListResponseSchema.safeParse(result.data)
    if (parsed.success) {
      return { ...result, data: parsed.data }
    }
    return {
      ok: false,
      error: {
        error: 'SchemaValidationError',
        message: `Invalid sales list response: ${parsed.error.message}`,
        status: 502,
      },
    }
  }

  return result
}

/**
 * Settle a sale's remaining balance via POST /sales/:id/settle-balance.
 *
 * The backend creates a cash movement and flips paymentStatus to 'paid'.
 * Revalidation of /sales and /cash is handled by the caller (server action).
 */
export async function settleSaleBalance(
  saleId: string,
): Promise<ApiResult<Record<string, unknown>>> {
  return apiPost<Record<string, unknown>>(`/sales/${saleId}/settle-balance`, {})
}

export async function getSale(
  id: string,
): Promise<ApiResult<SaleDetail>> {
  return apiGet<SaleDetail>(`/sales/${id}`)
}
