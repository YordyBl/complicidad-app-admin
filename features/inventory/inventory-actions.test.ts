import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ────────────────────────────────────────────────────────────

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/shared/auth/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/auth/session')>()
  return {
    ...actual,
    requireActorContext: vi.fn(),
  }
})

vi.mock('@/shared/api/inventory', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api/inventory')>()
  return {
    ...actual,
    registerPurchase: vi.fn(),
    increaseInventoryLot: vi.fn(),
    editInventoryLot: vi.fn(),
    compensateInventoryLot: vi.fn(),
  }
})

// ── Imports ──────────────────────────────────────────────────────────

import { registerPurchaseAction, increaseInventoryLotAction, editInventoryLotAction, compensateInventoryLotAction, type InventoryActionState } from './inventory-actions'
import { registerPurchase, increaseInventoryLot, editInventoryLot, compensateInventoryLot } from '@/shared/api/inventory'
import { requireActorContext } from '@/shared/auth/session'
import { revalidatePath } from 'next/cache'

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

// ── Lot action tests ─────────────────────────────────────────────────

describe('increaseInventoryLotAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: actor context available
    vi.mocked(requireActorContext).mockResolvedValue({
      actorId: 'user-1',
      actorSource: 'complicidad-app-admin',
    })
  })

  it('calls increaseInventoryLot with actor context and revalidates', async () => {
    vi.mocked(increaseInventoryLot).mockResolvedValueOnce({
      ok: true,
      data: { lotId: 'new-lot' },
      status: 201,
    })

    const fd = createFormData({
      variantId: 'var-001',
      productId: 'prod-001',
      quantity: '25',
      unitCost: '300',
      reason: 'Nuevo ingreso',
      effectiveAt: '2026-05-17',
    })

    const result = await increaseInventoryLotAction(null, fd)

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ lotId: 'new-lot' })
    expect(increaseInventoryLot).toHaveBeenCalledWith(
      { variantId: 'var-001', quantity: 25, unitCost: 300, reason: 'Nuevo ingreso', effectiveAt: '2026-05-17' },
      { 'x-actor-id': 'user-1', 'x-actor-source': 'complicidad-app-admin' },
    )
    expect(revalidatePath).toHaveBeenCalledWith('/inventory/lots')
    expect(revalidatePath).toHaveBeenCalledWith('/inventory')
    expect(revalidatePath).toHaveBeenCalledWith('/inventory/products/prod-001')
  })

  it('rejects with zod validation error for missing variantId', async () => {
    const fd = createFormData({
      quantity: '10',
      reason: 'Ingreso',
    })

    const result = await increaseInventoryLotAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
    expect(increaseInventoryLot).not.toHaveBeenCalled()
  })

  it('returns visible error when actor context is missing', async () => {
    vi.mocked(requireActorContext).mockResolvedValueOnce({
      error: 'No autorizado: sesión no encontrada',
    })

    const fd = createFormData({
      variantId: 'var-001',
      quantity: '10',
    })

    const result = await increaseInventoryLotAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('No autorizado')
    expect(increaseInventoryLot).not.toHaveBeenCalled()
  })

  it('maps API 400 error to user-facing message', async () => {
    vi.mocked(increaseInventoryLot).mockResolvedValueOnce({
      ok: false,
      error: { error: 'ValidationError', message: 'Cantidad inválida', status: 400 },
    })

    const fd = createFormData({
      variantId: 'var-001',
      quantity: '10',
    })

    const result = await increaseInventoryLotAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Cantidad inválida')
  })

  it('maps network error', async () => {
    vi.mocked(increaseInventoryLot).mockResolvedValueOnce({
      ok: false,
      error: { error: 'NetworkError', message: 'Connection lost', status: 503 },
    })

    const fd = createFormData({
      variantId: 'var-001',
      quantity: '10',
    })

    const result = await increaseInventoryLotAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toBe('El servidor no está disponible. Intente más tarde.')
  })
})

describe('editInventoryLotAction', () => {
  const lotId = 'lot-001'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireActorContext).mockResolvedValue({
      actorId: 'user-1',
      actorSource: 'complicidad-app-admin',
    })
  })

  it('calls editInventoryLot and revalidates lot path', async () => {
    vi.mocked(editInventoryLot).mockResolvedValueOnce({
      ok: true,
      data: { lotId: 'lot-001', quantity: 20 },
      status: 200,
    })

    const fd = createFormData({
      variantId: 'var-001',
      productId: 'prod-001',
      quantity: '20',
      reason: 'Ajuste de cantidad',
    })

    const result = await editInventoryLotAction(null, fd, lotId)

    expect(result.success).toBe(true)
    expect(editInventoryLot).toHaveBeenCalledWith('lot-001', {
      variantId: 'var-001',
      quantity: 20,
      reason: 'Ajuste de cantidad',
      unitCost: undefined,
      effectiveAt: undefined,
    }, { 'x-actor-id': 'user-1', 'x-actor-source': 'complicidad-app-admin' })
    expect(revalidatePath).toHaveBeenCalledWith('/inventory/lots')
    expect(revalidatePath).toHaveBeenCalledWith('/inventory')
    expect(revalidatePath).toHaveBeenCalledWith('/inventory/products/prod-001')
  })

  it('rejects when actor context is missing', async () => {
    vi.mocked(requireActorContext).mockResolvedValueOnce({
      error: 'No autorizado: sesión no encontrada',
    })

    const fd = createFormData({
      variantId: 'var-001',
      quantity: '20',
    })

    const result = await editInventoryLotAction(null, fd, lotId)

    expect(result.success).toBe(false)
    expect(result.error).toContain('No autorizado')
    expect(editInventoryLot).not.toHaveBeenCalled()
  })

  it('maps API 400 error', async () => {
    vi.mocked(editInventoryLot).mockResolvedValueOnce({
      ok: false,
      error: { error: 'ValidationError', message: 'Lote no editable', status: 400 },
    })

    const fd = createFormData({
      variantId: 'var-001',
      quantity: '20',
    })

    const result = await editInventoryLotAction(null, fd, lotId)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Lote no editable')
  })
})

describe('compensateInventoryLotAction', () => {
  const lotId = 'lot-hist'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireActorContext).mockResolvedValue({
      actorId: 'user-1',
      actorSource: 'complicidad-app-admin',
    })
  })

  it('calls compensateInventoryLot and revalidates', async () => {
    vi.mocked(compensateInventoryLot).mockResolvedValueOnce({
      ok: true,
      data: { adjustmentId: 'adj-1' },
      status: 200,
    })

    const fd = createFormData({
      productId: 'prod-001',
      quantityDelta: '5',
      reason: 'Compensación manual',
    })

    const result = await compensateInventoryLotAction(null, fd, lotId)

    expect(result.success).toBe(true)
    expect(compensateInventoryLot).toHaveBeenCalledWith('lot-hist', {
      quantityDelta: 5,
      reason: 'Compensación manual',
      unitCost: undefined,
      effectiveAt: undefined,
    }, { 'x-actor-id': 'user-1', 'x-actor-source': 'complicidad-app-admin' })
    expect(revalidatePath).toHaveBeenCalledWith('/inventory/lots')
    expect(revalidatePath).toHaveBeenCalledWith('/inventory')
    expect(revalidatePath).toHaveBeenCalledWith('/inventory/products/prod-001')
  })

  it('returns error when actor context is missing', async () => {
    vi.mocked(requireActorContext).mockResolvedValueOnce({
      error: 'No autorizado: sesión no encontrada',
    })

    const fd = createFormData({
      reason: 'Compensación',
    })

    const result = await compensateInventoryLotAction(null, fd, lotId)

    expect(result.success).toBe(false)
    expect(result.error).toContain('No autorizado')
    expect(compensateInventoryLot).not.toHaveBeenCalled()
  })

  it('rejects empty reason', async () => {
    const fd = createFormData({
      quantityDelta: '5',
      reason: '',
    })

    const result = await compensateInventoryLotAction(null, fd, lotId)

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
    expect(compensateInventoryLot).not.toHaveBeenCalled()
  })

  it('maps business rule error (422)', async () => {
    vi.mocked(compensateInventoryLot).mockResolvedValueOnce({
      ok: false,
      error: { error: 'BusinessRuleError', message: 'Solo se permite compensación en lotes históricos', status: 422 },
    })

    const fd = createFormData({
      quantityDelta: '5',
      reason: 'Compensación manual',
    })

    const result = await compensateInventoryLotAction(null, fd, lotId)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Solo se permite compensación en lotes históricos')
  })
})
