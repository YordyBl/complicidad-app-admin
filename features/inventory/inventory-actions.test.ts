import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ────────────────────────────────────────────────────────────

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/shared/api/inventory', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api/inventory')>()
  return {
    ...actual,
    registerPurchase: vi.fn(),
  }
})

// ── Imports ──────────────────────────────────────────────────────────

import { registerPurchaseAction, type InventoryActionState } from './inventory-actions'
import { registerPurchase } from '@/shared/api/inventory'

// ── Helpers ──────────────────────────────────────────────────────────

function createFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(overrides)) {
    fd.set(key, value)
  }
  return fd
}

const validItems = [
  { variantId: 'var-1', quantity: 10, unitCost: 500 },
  { variantId: 'var-2', quantity: 5, unitCost: 300 },
]

// ── Tests ────────────────────────────────────────────────────────────

describe('registerPurchaseAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('accepts valid multi-item purchase', async () => {
    vi.mocked(registerPurchase).mockResolvedValueOnce({
      ok: true,
      data: { purchaseId: 'purch-1' },
      status: 200,
    })

    const fd = createFormData({
      items: JSON.stringify(validItems),
      supplierId: 'supp-1',
      notes: 'Bulk order',
      purchaseDate: '2025-03-15',
    })

    const result = await registerPurchaseAction(null, fd)

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ purchaseId: 'purch-1' })
    expect(registerPurchase).toHaveBeenCalledWith({
      items: validItems,
      supplierId: 'supp-1',
      notes: 'Bulk order',
      purchaseDate: '2025-03-15',
    })
  })

  it('rejects empty items array', async () => {
    const fd = createFormData({
      items: JSON.stringify([]),
    })

    const result = await registerPurchaseAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Debe incluir al menos un producto')
    expect(registerPurchase).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON in items field', async () => {
    const fd = createFormData({
      items: 'not-valid-json',
    })

    const result = await registerPurchaseAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Formato de productos inválido.')
    expect(registerPurchase).not.toHaveBeenCalled()
  })

  it('rejects missing items field', async () => {
    const fd = createFormData({})

    const result = await registerPurchaseAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Debe incluir al menos un producto')
    expect(registerPurchase).not.toHaveBeenCalled()
  })

  it('handles API error from registerPurchase', async () => {
    vi.mocked(registerPurchase).mockResolvedValueOnce({
      ok: false,
      error: { error: 'ValidationError', message: 'Invalid variant', status: 400 },
    })

    const fd = createFormData({
      items: JSON.stringify([{ variantId: 'invalid', quantity: 1, unitCost: 100 }]),
    })

    const result = await registerPurchaseAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid variant')
  })

  it('handles network error from registerPurchase', async () => {
    vi.mocked(registerPurchase).mockResolvedValueOnce({
      ok: false,
      error: { error: 'NetworkError', message: 'No connection', status: 503 },
    })

    const fd = createFormData({
      items: JSON.stringify(validItems),
    })

    const result = await registerPurchaseAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toBe('El servidor no está disponible. Intente más tarde.')
  })
})
