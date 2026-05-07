/**
 * API route: proxy customer search to the backend.
 *
 * GET /api/customers/search?term=<searchTerm>
 */
import { NextRequest, NextResponse } from 'next/server'
import { listCustomers } from '@/shared/api/customers'
import type { Customer } from '@/shared/api/customers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const term = (searchParams.get('term') ?? '').toLowerCase().trim()

    if (!term || term.length < 2) {
      return NextResponse.json(
        { error: 'ValidationError', message: 'El término de búsqueda debe tener al menos 2 caracteres.' },
        { status: 400 },
      )
    }

    // Fetch all customers and filter client-side (backend has no search endpoint)
    const result = await listCustomers()

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.error, message: result.error.message },
        { status: result.error.status },
      )
    }

    // Filter customers matching the search term
    const filtered = result.data.filter(
      (c: Customer) =>
        c.name.toLowerCase().includes(term) ||
        (c.alias?.toLowerCase() ?? '').includes(term) ||
        (c.email?.toLowerCase() ?? '').includes(term),
    )

    return NextResponse.json(
      filtered.map((c: Customer) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        alias: c.alias,
      })),
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'InternalError', message },
      { status: 500 },
    )
  }
}
