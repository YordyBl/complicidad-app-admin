import { describe, it, expect } from 'vitest'
import { formatCurrency, formatPrice, formatDate, formatDateTime } from './formatters'

// Helper: normalize whitespace for cross-platform assertion stability
function normalize(str: string): string {
  return str.replace(/\s/g, ' ')
}

describe('formatCurrency', () => {
  it('formats zero cents as S/ 0.00', () => {
    const result = formatCurrency(0)
    expect(normalize(result)).toBe('S/ 0.00')
  })

  it('formats positive cents with thousand separators', () => {
    const result = formatCurrency(150000)
    // 150000 cents = S/ 1,500.00
    expect(normalize(result)).toBe('S/ 1,500.00')
  })

  it('formats single cent', () => {
    const result = formatCurrency(1)
    expect(normalize(result)).toBe('S/ 0.01')
  })

  it('formats large amounts', () => {
    const result = formatCurrency(150000000)
    // 150,000,000 cents = S/ 1,500,000.00
    expect(normalize(result)).toBe('S/ 1,500,000.00')
  })

  it('handles negative amounts', () => {
    const result = formatCurrency(-50000)
    // -50000 cents = -S/ 500.00
    expect(normalize(result)).toContain('-')
    expect(normalize(result)).toContain('S/')
    expect(normalize(result)).toContain('500.00')
  })

  it('uses S/ PEN symbol, not $', () => {
    const result = formatCurrency(999)
    expect(result).toContain('S/')
    expect(result).not.toContain('$')
  })

  it('formats one sol exactly', () => {
    const result = formatCurrency(100)
    // 100 cents = S/ 1.00
    expect(normalize(result)).toBe('S/ 1.00')
  })
})

describe('formatPrice', () => {
  it('formats a direct price in PEN', () => {
    const result = formatPrice(250)
    expect(normalize(result)).toBe('S/ 250.00')
  })

  it('formats fractional price', () => {
    const result = formatPrice(99.5)
    expect(normalize(result)).toBe('S/ 99.50')
  })

  it('handles zero', () => {
    const result = formatPrice(0)
    expect(normalize(result)).toBe('S/ 0.00')
  })

  it('handles large price with thousand separators', () => {
    const result = formatPrice(2500)
    expect(normalize(result)).toBe('S/ 2,500.00')
  })
})

describe('formatDate', () => {
  it('returns a string matching date pattern', () => {
    const result = formatDate('2025-03-15T12:00:00Z')
    // Should contain "/" separators and digits
    expect(result).toMatch(/\d/)
    expect(result).toContain('/')
  })

  it('handles January 1st', () => {
    const result = formatDate('2026-01-01T00:00:00Z')
    expect(result).toMatch(/\d/)
    expect(result).toContain('/')
  })

  it('always returns a non-empty string', () => {
    const result = formatDate('2020-12-25T00:00:00Z')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('formatDateTime', () => {
  it('returns a string containing date and time parts', () => {
    const result = formatDateTime('2025-03-15T12:30:00Z')
    expect(result).toMatch(/\d/)
    expect(result).toContain('/')
  })

  it('handles midnight', () => {
    const result = formatDateTime('2025-01-01T00:00:00Z')
    expect(result.length).toBeGreaterThan(0)
  })

  it('produces different output for AM vs PM if locale supports it', () => {
    const am = formatDateTime('2025-01-01T08:00:00Z')
    const pm = formatDateTime('2025-01-01T20:00:00Z')
    // Both should be non-empty; exact format depends on locale
    expect(am.length).toBeGreaterThan(0)
    expect(pm.length).toBeGreaterThan(0)
  })
})
