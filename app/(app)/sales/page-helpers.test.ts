/**
 * Unit tests for sales page helpers — query normalization and URL building.
 */

import { describe, it, expect } from 'vitest'
import { normalizeSalesSearchParams, buildSalesPageUrl } from './page-helpers'
import type { SalesListQuery } from '@/shared/api/schemas'

describe('normalizeSalesSearchParams', () => {
  it('extracts all supported query params from raw Next.js searchParams', () => {
    const raw: Record<string, string | string[] | undefined> = {
      page: '3',
      pageSize: '10',
      search: 'camiseta',
      status: 'ACTIVE',
      paymentStatus: 'partial',
      sortBy: 'totalRevenueCents',
      sortOrder: 'desc',
    }

    const result = normalizeSalesSearchParams(raw)

    expect(result.page).toBe('3')
    expect(result.pageSize).toBe('10')
    expect(result.search).toBe('camiseta')
    expect(result.status).toBe('ACTIVE')
    expect(result.paymentStatus).toBe('partial')
    expect(result.sortBy).toBe('totalRevenueCents')
    expect(result.sortOrder).toBe('desc')
  })

  it('returns undefined for missing params', () => {
    const raw: Record<string, string | string[] | undefined> = {}
    const result = normalizeSalesSearchParams(raw)
    expect(result.page).toBeUndefined()
    expect(result.search).toBeUndefined()
    expect(result.paymentStatus).toBeUndefined()
  })

  it('ignores non-string values (Next.js array/undefined params)', () => {
    const raw: Record<string, string | string[] | undefined> = {
      page: ['1', '2'],
      search: undefined,
      status: 'ACTIVE',
    }
    const result = normalizeSalesSearchParams(raw)
    expect(result.page).toBeUndefined()
    expect(result.search).toBeUndefined()
    expect(result.status).toBe('ACTIVE')
  })

  it('handles empty string values as-is (caller strips them)', () => {
    const raw: Record<string, string | string[] | undefined> = {
      search: '',
      page: '1',
      status: '',
    }
    const result = normalizeSalesSearchParams(raw)
    expect(result.search).toBe('')
    expect(result.page).toBe('1')
    expect(result.status).toBe('')
  })
})

describe('buildSalesPageUrl', () => {
  it('constructs bare /sales when no params', () => {
    const url = buildSalesPageUrl({})
    expect(url).toBe('/sales')
  })

  it('preserves existing params in the URL', () => {
    const current: SalesListQuery = { page: '2', search: 'camiseta', status: 'ACTIVE' }
    const url = buildSalesPageUrl(current)
    expect(url).toContain('page=2')
    expect(url).toContain('search=camiseta')
    expect(url).toContain('status=ACTIVE')
  })

  it('applies overrides while preserving other params', () => {
    const current: SalesListQuery = { page: '2', search: 'camiseta', sortOrder: 'asc' }
    const url = buildSalesPageUrl(current, { page: '3' })
    expect(url).toContain('page=3')
    expect(url).toContain('search=camiseta')
    expect(url).toContain('sortOrder=asc')
  })

  it('strips params set to empty string from the URL', () => {
    const current: SalesListQuery = { page: '1', search: '' }
    const url = buildSalesPageUrl(current)
    expect(url).toBe('/sales?page=1')
    expect(url).not.toContain('search=')
  })

  it('omits undefined params from the URL', () => {
    const current: SalesListQuery = { page: '1', paymentStatus: undefined }
    const url = buildSalesPageUrl(current)
    expect(url).toBe('/sales?page=1')
    expect(url).not.toContain('paymentStatus')
  })
})
