import 'server-only'

/**
 * Inventory API client — products, item search, purchases.
 *
 * Endpoints:
 * - POST /api/v1/products          → Product
 * - GET  /api/v1/products          → ProductList (paginated, searchable)
 * - GET  /api/v1/items/search?term= → SearchResult[]
 * - POST /api/v1/purchases         → Purchase
 */

import { apiGet, apiPost } from './api-fetch'
import type { ApiResult } from './api-fetch'
import {
  productFormSchema,
  purchaseFormSchema,
  purchaseItemSchema,
  productListQuerySchema,
  productListResponseSchema,
  type ProductFormData,
  type ProductResponse,
  type SearchResult,
  type PurchaseItem,
  type PurchaseFormData,
  type ProductListQuery,
  type ProductListResponse,
  type ProductListItem,
  type ProductListMeta,
} from './schemas'

// Re-export schemas and types for server-side consumers
export {
  productFormSchema,
  purchaseFormSchema,
  purchaseItemSchema,
  productListQuerySchema,
  productListResponseSchema,
  type ProductFormData,
  type ProductResponse,
  type SearchResult,
  type PurchaseItem,
  type PurchaseFormData,
  type ProductListQuery,
  type ProductListResponse,
  type ProductListItem,
  type ProductListMeta,
}

// ── API functions ──────────────────────────────────────────────────

export async function createProduct(
  body: ProductFormData,
): Promise<ApiResult<ProductResponse>> {
  return apiPost<ProductResponse>('/products', body)
}

export async function searchItems(
  term: string,
): Promise<ApiResult<SearchResult[]>> {
  return apiGet<SearchResult[]>(`/items/search?term=${encodeURIComponent(term)}`)
}

export async function registerPurchase(
  body: PurchaseFormData,
): Promise<ApiResult<Record<string, unknown>>> {
  return apiPost<Record<string, unknown>>('/purchases', body)
}

/**
 * List products with pagination, search, filters, and sorting.
 *
 * Server-only — fetches from GET /api/v1/products.
 * Deterministic URL params: omits empty/undefined values.
 * Response is validated through Zod schema before returning.
 */
export async function listProducts(
  params: ProductListQuery = {},
): Promise<ApiResult<ProductListResponse>> {
  // Build query string, skipping empty/undefined params
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      searchParams.set(key, value)
    }
  }
  const qs = searchParams.toString()
  const path = qs ? `/products?${qs}` : '/products'

  const result = await apiGet<ProductListResponse>(path)

  // Validate response shape through Zod on success
  if (result.ok) {
    const parsed = productListResponseSchema.safeParse(result.data)
    if (parsed.success) {
      return { ...result, data: parsed.data }
    }
    return {
      ok: false,
      error: {
        error: 'SchemaValidationError',
        message: `Invalid product list response: ${parsed.error.message}`,
        status: 502,
      },
    }
  }

  return result
}

/**
 * Get a single product by ID.
 *
 * Calls the dedicated GET /api/v1/products/:id endpoint.
 * Returns the product on success, or an API error (including 404).
 */
export async function getProductById(
  id: string,
): Promise<ApiResult<ProductListItem>> {
  return apiGet<ProductListItem>(`/products/${encodeURIComponent(id)}`)
}
