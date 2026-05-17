import 'server-only'

/**
 * Sales API client — create, cancel, return, list, detail.
 *
 * Endpoints:
 * - POST /api/v1/sales              → Sale
 * - POST /api/v1/sales/:id/cancel   → CancelledSale
 * - POST /api/v1/sales/:id/return   → ReturnedSale
 * - GET  /api/v1/sales              → SaleListItem[]
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
  type SaleItem,
  type SaleFormData,
  type SaleListItem,
  type SaleListEntry,
  type SaleListItemDisplay,
  type SaleDetail,
} from './schemas'

// Re-export schemas and types for server-side consumers
export {
  saleFormSchema,
  saleIdFormSchema,
  saleListSchema,
  saleDetailSchema,
  saleListEntrySchema,
  saleListItemSchema,
  type SaleItem,
  type SaleFormData,
  type SaleListItem,
  type SaleListEntry,
  type SaleListItemDisplay,
  type SaleDetail,
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

export interface ListSalesFilters {
  customerId?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  sortOrder?: 'ASC' | 'DESC'
}

export async function listSales(
  filters?: ListSalesFilters,
): Promise<ApiResult<SaleListItem[]>> {
  const params = new URLSearchParams()
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') {
        params.set(key, value)
      }
    }
  }
  const qs = params.toString()
  const path = qs ? `/sales?${qs}` : '/sales'

  const result = await apiGet<SaleListItem[]>(path)

  // Validate response shape through Zod on success
  if (result.ok) {
    const parsed = saleListSchema.safeParse(result.data)
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

export async function getSale(
  id: string,
): Promise<ApiResult<SaleDetail>> {
  return apiGet<SaleDetail>(`/sales/${id}`)
}
