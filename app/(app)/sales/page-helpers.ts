import type { SalesListQuery } from '@/shared/api/schemas'

/** Convert raw Next.js searchParams to a typed SalesListQuery. */
export function normalizeSalesSearchParams(
  raw: Record<string, string | string[] | undefined>,
): SalesListQuery {
  return {
    page: typeof raw.page === 'string' ? raw.page : undefined,
    pageSize: typeof raw.pageSize === 'string' ? raw.pageSize : undefined,
    search: typeof raw.search === 'string' ? raw.search : undefined,
    status: (typeof raw.status === 'string' ? raw.status : undefined) as SalesListQuery['status'],
    paymentStatus: (typeof raw.paymentStatus === 'string' ? raw.paymentStatus : undefined) as SalesListQuery['paymentStatus'],
    sortBy: (typeof raw.sortBy === 'string' ? raw.sortBy : undefined) as SalesListQuery['sortBy'],
    sortOrder: (typeof raw.sortOrder === 'string' ? raw.sortOrder : undefined) as SalesListQuery['sortOrder'],
  }
}

/** Construct URL search params string preserving existing params with updates. */
export function buildSalesPageUrl(
  currentParams: SalesListQuery,
  overrides: Partial<SalesListQuery> = {},
): string {
  const merged = { ...currentParams, ...overrides }
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && value !== '') {
      searchParams.set(key, value)
    }
  }
  const qs = searchParams.toString()
  return qs ? `/sales?${qs}` : '/sales'
}
