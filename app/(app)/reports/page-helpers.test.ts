/**
 * Unit tests for reports page helpers — query normalization and URL building.
 *
 * Each list card (Lots, Stock-by-Product) has INDEPENDENT pagination
 * and search state via namespaced URL params:
 *
 *   lots_page, lots_pageSize, lots_search
 *   stock_page, stock_pageSize, stock_search
 *
 * `buildCardUrl` preserves the OTHER card's params so paginating
 * one card does not reset the other card's URL state.
 *
 * `buildReportsPageUrl` is deprecated but kept for backward compat.
 */
import { describe, it, expect } from 'vitest'
import {
  normalizeReportsSearchParams,
  buildCardUrl,
  buildReportsPageUrl,
  type ReportsQueryResult,
} from './page-helpers'

// ═══════════════════════════════════════════════════════════════════
// normalizeReportsSearchParams
// ═══════════════════════════════════════════════════════════════════

describe('normalizeReportsSearchParams', () => {
  it('extracts namespaced stock params from raw Next.js searchParams', () => {
    const raw: Record<string, string | string[] | undefined> = {
      stock_page: '3',
      stock_pageSize: '10',
      stock_search: 'camiseta',
    }

    const result = normalizeReportsSearchParams(raw)

    expect(result.stock.page).toBe('3')
    expect(result.stock.pageSize).toBe('10')
    expect(result.stock.search).toBe('camiseta')
  })

  it('extracts namespaced lots params from raw Next.js searchParams', () => {
    const raw: Record<string, string | string[] | undefined> = {
      lots_page: '2',
      lots_pageSize: '5',
      lots_search: 'pantalón',
    }

    const result = normalizeReportsSearchParams(raw)

    expect(result.lots.page).toBe('2')
    expect(result.lots.pageSize).toBe('5')
    expect(result.lots.search).toBe('pantalón')
  })

  it('extracts BOTH namespaced sets independently', () => {
    const raw: Record<string, string | string[] | undefined> = {
      stock_page: '1',
      stock_search: 'remera',
      lots_page: '3',
      lots_search: 'zapato',
    }

    const result = normalizeReportsSearchParams(raw)

    expect(result.stock.page).toBe('1')
    expect(result.stock.search).toBe('remera')
    expect(result.lots.page).toBe('3')
    expect(result.lots.search).toBe('zapato')
  })

  it('returns undefined for all fields when no params present', () => {
    const raw: Record<string, string | string[] | undefined> = {}
    const result = normalizeReportsSearchParams(raw)

    expect(result.stock.page).toBeUndefined()
    expect(result.stock.pageSize).toBeUndefined()
    expect(result.stock.search).toBeUndefined()
    expect(result.lots.page).toBeUndefined()
    expect(result.lots.pageSize).toBeUndefined()
    expect(result.lots.search).toBeUndefined()
  })

  it('ignores non-string values (Next.js array/undefined params)', () => {
    const raw: Record<string, string | string[] | undefined> = {
      stock_page: ['1', '2'],
      lots_search: undefined,
    }

    const result = normalizeReportsSearchParams(raw)

    expect(result.stock.page).toBeUndefined()
    expect(result.lots.search).toBeUndefined()
  })

  it('handles empty string values as-is', () => {
    const raw: Record<string, string | string[] | undefined> = {
      stock_search: '',
      lots_pageSize: '',
    }

    const result = normalizeReportsSearchParams(raw)

    expect(result.stock.search).toBe('')
    expect(result.lots.pageSize).toBe('')
  })

  it('ignores unrelated query params and old un-namespaced params', () => {
    // Old shared params (page, search) are ignored — they're the source of the bug.
    const raw: Record<string, string | string[] | undefined> = {
      page: '3',           // old shared param — ignored
      search: 'camiseta',  // old shared param — ignored
      utm_source: 'email',
      ref: 'sidebar',
    }

    const result = normalizeReportsSearchParams(raw)

    expect(result.stock.page).toBeUndefined()
    expect(result.stock.search).toBeUndefined()
    expect(result.lots.page).toBeUndefined()
    expect(result.lots.search).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════
// buildCardUrl
// ═══════════════════════════════════════════════════════════════════

describe('buildCardUrl', () => {
  const emptyQueries: ReportsQueryResult = {
    stock: {},
    lots: {},
  }

  it('constructs bare /reports when no params at all', () => {
    const url = buildCardUrl('lots', emptyQueries)
    expect(url).toBe('/reports')
  })

  it('constructs URL with only the given namespace params', () => {
    const queries: ReportsQueryResult = {
      stock: {},
      lots: { page: '2', search: 'camiseta' },
    }

    const url = buildCardUrl('lots', queries)
    expect(url).toContain('lots_page=2')
    expect(url).toContain('lots_search=camiseta')
    expect(url).not.toContain('stock_')
  })

  it('applies overrides while preserving other params within the same namespace', () => {
    const queries: ReportsQueryResult = {
      stock: {},
      lots: { page: '2', search: 'remera', pageSize: '5' },
    }

    const url = buildCardUrl('lots', queries, { page: '3' })

    expect(url).toContain('lots_page=3')
    expect(url).toContain('lots_search=remera')
    expect(url).toContain('lots_pageSize=5')
  })

  it('strips params set to empty string from the URL', () => {
    const queries: ReportsQueryResult = {
      stock: {},
      lots: { page: '1', search: '' },
    }

    const url = buildCardUrl('lots', queries)

    expect(url).toContain('lots_page=1')
    expect(url).not.toContain('lots_search=')
  })

  it('omits undefined params from the URL', () => {
    const queries: ReportsQueryResult = {
      stock: {},
      lots: { page: '1', pageSize: undefined },
    }

    const url = buildCardUrl('lots', queries)

    expect(url).toContain('lots_page=1')
    expect(url).not.toContain('lots_pageSize')
  })

  it('PRESERVES the OTHER card params unchanged', () => {
    // This is the CRITICAL behavior: paginating one card must not
    // lose the other card's URL state (page, search, etc.)
    const queries: ReportsQueryResult = {
      stock: { page: '3', search: 'zapato' },
      lots: { page: '2' },
    }

    // Change lots page to 3 — stock params must survive
    const url = buildCardUrl('lots', queries, { page: '3' })

    expect(url).toContain('lots_page=3')
    expect(url).toContain('stock_page=3')
    expect(url).toContain('stock_search=zapato')
  })

  it('PRESERVES stock params when building lots URL', () => {
    const queries: ReportsQueryResult = {
      stock: { page: '2', search: 'camiseta' },
      lots: { page: '1' },
    }

    const url = buildCardUrl('lots', queries, { search: 'nuevo' })

    expect(url).toContain('lots_page=1')
    expect(url).toContain('lots_search=nuevo')
    expect(url).toContain('stock_page=2')
    expect(url).toContain('stock_search=camiseta')
  })

  it('PRESERVES lots params when building stock URL', () => {
    const queries: ReportsQueryResult = {
      stock: { page: '1' },
      lots: { page: '5', search: 'pantalón' },
    }

    const url = buildCardUrl('stock', queries, { page: '2' })

    expect(url).toContain('stock_page=2')
    expect(url).toContain('lots_page=5')
    // URLSearchParams encodes special characters: ó → %C3%B3n
    expect(url).toContain('lots_search=pantal%C3%B3n')
  })

  it('handles special characters in search (URL encoding)', () => {
    const queries: ReportsQueryResult = {
      stock: {},
      lots: { search: 'camiseta & pantalón' },
    }

    const url = buildCardUrl('lots', queries)

    expect(url).toContain('lots_search=camiseta')
    expect(url).toContain('pantal%C3%B3n')
  })
})

// ═══════════════════════════════════════════════════════════════════
// buildReportsPageUrl (deprecated — still tested for backward compat)
// ═══════════════════════════════════════════════════════════════════

describe('buildReportsPageUrl (deprecated)', () => {
  it('constructs bare /reports when no params', () => {
    const url = buildReportsPageUrl({})
    expect(url).toBe('/reports')
  })

  it('preserves existing params in the URL', () => {
    const current = { page: '2', search: 'remera', pageSize: '10' }
    const url = buildReportsPageUrl(current)

    expect(url).toContain('page=2')
    expect(url).toContain('search=remera')
    expect(url).toContain('pageSize=10')
  })

  it('applies overrides while preserving other params', () => {
    const current = { page: '2', search: 'remera', pageSize: '5' }
    const url = buildReportsPageUrl(current, { page: '3' })

    expect(url).toContain('page=3')
    expect(url).toContain('search=remera')
    expect(url).toContain('pageSize=5')
  })

  it('strips params set to empty string from the URL', () => {
    const current = { page: '1', search: '' }
    const url = buildReportsPageUrl(current)

    expect(url).toBe('/reports?page=1')
    expect(url).not.toContain('search=')
  })
})
