/**
 * Reports page helpers — query normalization and URL building.
 *
 * Each list card (Lots, Stock-by-Product) has INDEPENDENT pagination
 * and search state via namespaced URL params:
 *
 *   lots_page, lots_pageSize, lots_search
 *   stock_page, stock_pageSize, stock_search
 *
 * The `buildCardUrl` helper preserves the OTHER card's params so
 * paginating/searching one card does not reset the other card's state.
 */

/** Per-card query state extracted from namespaced URL params. */
export interface ReportCardQuery {
  page?: string
  pageSize?: string
  search?: string
}

/** Both card queries extracted from raw Next.js searchParams. */
export interface ReportsQueryResult {
  stock: ReportCardQuery
  lots: ReportCardQuery
}

/** Safe string extraction from raw Next.js searchParams. */
function extract(raw: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = raw[key]
  return typeof v === 'string' ? v : undefined
}

/** Convert raw Next.js searchParams to namespaced per-card queries. */
export function normalizeReportsSearchParams(
  raw: Record<string, string | string[] | undefined>,
): ReportsQueryResult {
  return {
    stock: {
      page: extract(raw, 'stock_page'),
      pageSize: extract(raw, 'stock_pageSize'),
      search: extract(raw, 'stock_search'),
    },
    lots: {
      page: extract(raw, 'lots_page'),
      pageSize: extract(raw, 'lots_pageSize'),
      search: extract(raw, 'lots_search'),
    },
  }
}

/**
 * Build a URL for a single card's navigation action.
 *
 * Preserves the OTHER card's current params so back/forward
 * navigation and independent pagination/search work correctly.
 *
 * @param namespace  The card whose params are being changed
 * @param allQueries Both cards' current query state
 * @param overrides  Param overrides for the target namespace
 */
export function buildCardUrl(
  namespace: 'stock' | 'lots',
  allQueries: ReportsQueryResult,
  overrides: Partial<ReportCardQuery> = {},
): string {
  const myQuery = { ...allQueries[namespace], ...overrides }
  const otherNs = namespace === 'stock' ? 'lots' : 'stock'
  const otherQuery = allQueries[otherNs]

  const searchParams = new URLSearchParams()

  // Write the OTHER card's params first (unchanged)
  for (const [key, value] of Object.entries(otherQuery)) {
    if (value !== undefined && value !== '') {
      searchParams.set(`${otherNs}_${key}`, value)
    }
  }

  // Write THIS card's params (with overrides applied)
  for (const [key, value] of Object.entries(myQuery)) {
    if (value !== undefined && value !== '') {
      searchParams.set(`${namespace}_${key}`, value)
    }
  }

  const qs = searchParams.toString()
  return qs ? `/reports?${qs}` : '/reports'
}

/** @deprecated Use `buildCardUrl` with namespaced queries instead. */
export function buildReportsPageUrl(
  currentParams: ReportCardQuery,
  overrides: Partial<ReportCardQuery> = {},
): string {
  const merged = { ...currentParams, ...overrides }
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && value !== '') {
      searchParams.set(key, value)
    }
  }
  const qs = searchParams.toString()
  return qs ? `/reports?${qs}` : '/reports'
}
