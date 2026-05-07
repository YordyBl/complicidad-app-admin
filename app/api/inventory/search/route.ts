/**
 * API route: proxy item search to the backend.
 *
 * Client-side ItemSearch uses this route to avoid CORS issues
 * and keep backend DNS server-only.
 *
 * GET /api/inventory/search?term=<searchTerm>
 */
import { NextRequest, NextResponse } from 'next/server'
import { searchItems } from '@/shared/api/inventory'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let term = searchParams.get('term')

    if (!term || term.length < 2) {
      return NextResponse.json(
        { error: 'ValidationError', message: 'El término de búsqueda debe tener al menos 2 caracteres.' },
        { status: 400 },
      )
    }

    // Sanitize: strip non-searchable chars (¿, ¡, etc.) that can leak from Spanish keyboards
    term = term.replace(/[¿¡\u00BF\u00A1]/g, '').trim()

    if (term.length < 2) {
      return NextResponse.json(
        { error: 'ValidationError', message: 'El término de búsqueda debe tener al menos 2 caracteres.' },
        { status: 400 },
      )
    }

    const result = await searchItems(term)

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.error, message: result.error.message },
        { status: result.error.status },
      )
    }

    // Unwrap backend response: { matchType, items: [{ variantSku, ... }] } → [{ sku, ... }]
    const raw = result.data

    let items: unknown[]
    if (Array.isArray(raw)) {
      // Already flat — pass through unchanged (backward compat)
      items = raw
    } else if (
      raw &&
      typeof raw === 'object' &&
      'items' in raw &&
      Array.isArray((raw as Record<string, unknown>).items)
    ) {
      // Wrapped backend response — unwrap and remap
      items = (raw as { items: Record<string, unknown>[] }).items.map(
        (item) => {
          const mapped = { ...item, sku: (item.variantSku ?? item.sku) as string }
          if ('variantSku' in mapped) {
            delete (mapped as Record<string, unknown>).variantSku
          }
          return mapped
        },
      )
    } else {
      // Unexpected shape — return empty
      items = []
    }

    return NextResponse.json(items)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'InternalError', message },
      { status: 500 },
    )
  }
}
