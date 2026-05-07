/**
 * Currency and date formatting helpers.
 *
 * All monetary values are PEN (Peruvian Soles) with S/ prefix.
 * Backend stores integer cents; UI displays as formatted PEN.
 */

const PEN_FORMATTER = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Format integer cents to PEN currency display string.
 * Example: 150000 → "S/ 1,500.00"
 */
export function formatCurrency(cents: number): string {
  const pesos = cents / 100
  return PEN_FORMATTER.format(pesos)
}

/**
 * Format a direct price (already in PEN) to PEN currency display string.
 * Unlike formatCurrency, this does NOT divide by 100.
 * Example: 250 → "S/ 250.00"
 */
export function formatPrice(price: number): string {
  return PEN_FORMATTER.format(price)
}

/**
 * Format a date string to a readable Argentine locale date.
 * Example: "2025-03-15T12:00:00Z" → "15/3/2025"
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('es-AR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(date)
}

/**
 * Format an ISO date string with time.
 * Example: "2025-03-15T12:30:00Z" → "15/3/2025 09:30"
 */
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('es-AR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
