import type { ProductListQuery } from '@/shared/api/schemas'

/** Convert raw Next.js searchParams to a typed ProductListQuery. */
export function normalizeSearchParams(
  raw: Record<string, string | string[] | undefined>,
): ProductListQuery {
  return {
    page: typeof raw.page === 'string' ? raw.page : undefined,
    pageSize: typeof raw.pageSize === 'string' ? raw.pageSize : undefined,
    search: typeof raw.search === 'string' ? raw.search : undefined,
    status: typeof raw.status === 'string' ? raw.status : undefined,
    sortBy: typeof raw.sortBy === 'string' ? raw.sortBy : undefined,
    sortOrder: typeof raw.sortOrder === 'string' ? raw.sortOrder : undefined,
  }
}

/** Construct URL search params string preserving existing params with updates. */
export function buildPageUrl(
  currentParams: ProductListQuery,
  overrides: Partial<ProductListQuery>,
): string {
  const merged = { ...currentParams, ...overrides }
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && value !== '') {
      searchParams.set(key, value)
    }
  }
  const qs = searchParams.toString()
  return qs ? `/inventory?${qs}` : '/inventory'
}
