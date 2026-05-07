import { describe, it, expect, beforeEach, vi } from 'vitest'

const { cancelSaleMock, returnSaleMock, createSaleMock } = vi.hoisted(() => ({
  cancelSaleMock: vi.fn(),
  returnSaleMock: vi.fn(),
  createSaleMock: vi.fn(),
}))

vi.mock('@/shared/api/sales', () => ({
  saleFormSchema: {
    safeParse: (data: unknown) => {
      const d = data as Record<string, unknown>
      if (!d.customerId || (typeof d.customerId === 'string' && d.customerId === '')) {
        return { success: false, error: { errors: [{ message: 'El cliente es requerido' }] } }
      }
      if (d.channelReference === 'invalid-ref') {
        return { success: false, error: { errors: [{ message: 'Referencia inválida' }] } }
      }
      return { success: true, data }
    },
  },
  createSale: createSaleMock,
  cancelSale: cancelSaleMock,
  returnSale: returnSaleMock,
}))

import { createSaleAction, cancelSaleAction, returnSaleAction } from './sales-actions'

function createFormData(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) {
    fd.set(k, v)
  }
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createSaleAction', () => {
  it('creates a sale successfully with channel reference', async () => {
    createSaleMock.mockResolvedValueOnce({
      ok: true,
      data: { id: 'sale-1' },
      status: 201,
    })

    const fd = createFormData({ customerId: 'cust-1', channel: 'web', channelReference: 'ML-123', items: JSON.stringify([{ variantId: 'v1', quantity: 1, priceType: 'regular' }]) })
    const result = await createSaleAction(null, fd)

    expect(result.success).toBe(true)
    expect(createSaleMock).toHaveBeenCalledOnce()
  })

  it('creates a sale successfully without channel reference', async () => {
    createSaleMock.mockResolvedValueOnce({
      ok: true,
      data: { id: 'sale-2' },
      status: 201,
    })

    const fd = createFormData({ customerId: 'cust-1', channel: 'web', items: JSON.stringify([{ variantId: 'v1', quantity: 1, priceType: 'regular' }]) })
    const result = await createSaleAction(null, fd)

    expect(result.success).toBe(true)
    expect(createSaleMock).toHaveBeenCalledOnce()
  })

  it('returns validation error when customerId is missing', async () => {
    const fd = createFormData({ channel: 'web', items: JSON.stringify([{ variantId: 'v1', quantity: 1, priceType: 'regular' }]) })
    const result = await createSaleAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('requerido')
  })

  it('returns validation error when items JSON is invalid', async () => {
    const fd = createFormData({ customerId: 'cust-1', channel: 'web', items: 'not-json' })
    const result = await createSaleAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('inválido')
  })
})

describe('cancelSaleAction', () => {
  it('cancels a sale successfully', async () => {
    cancelSaleMock.mockResolvedValueOnce({
      ok: true,
      data: { id: 'sale-1', status: 'cancelled' },
      status: 200,
    })

    const fd = createFormData({ saleId: 'sale-1' })
    const result = await cancelSaleAction(null, fd)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  it('returns error on missing saleId', async () => {
    const fd = createFormData({})
    const result = await cancelSaleAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('ID')
  })

  it('returns error on 404 not found', async () => {
    cancelSaleMock.mockResolvedValueOnce({
      ok: false,
      error: { error: 'NotFound', message: 'Sale not found', status: 404 },
    })

    const fd = createFormData({ saleId: 'bad-id' })
    const result = await cancelSaleAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('encontrada')
  })

  it('returns error on 400 cannot cancel', async () => {
    cancelSaleMock.mockResolvedValueOnce({
      ok: false,
      error: { error: 'BusinessError', message: 'Sale already cancelled', status: 400 },
    })

    const fd = createFormData({ saleId: 'sale-1' })
    const result = await cancelSaleAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Sale already cancelled')
  })

  it('returns network error message', async () => {
    cancelSaleMock.mockResolvedValueOnce({
      ok: false,
      error: { error: 'NetworkError', message: 'Connection timed out', status: 503 },
    })

    const fd = createFormData({ saleId: 'sale-1' })
    const result = await cancelSaleAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('disponible')
  })
})

describe('returnSaleAction', () => {
  it('returns a sale successfully', async () => {
    returnSaleMock.mockResolvedValueOnce({
      ok: true,
      data: { id: 'sale-1', status: 'returned' },
      status: 200,
    })

    const fd = createFormData({ saleId: 'sale-1' })
    const result = await returnSaleAction(null, fd)

    expect(result.success).toBe(true)
  })

  it('returns error on missing saleId', async () => {
    const fd = createFormData({})
    const result = await returnSaleAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('ID')
  })

  it('returns error on 404 not found', async () => {
    returnSaleMock.mockResolvedValueOnce({
      ok: false,
      error: { error: 'NotFound', message: 'Sale not found', status: 404 },
    })

    const fd = createFormData({ saleId: 'bad-id' })
    const result = await returnSaleAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('encontrada')
  })

  it('returns network error message', async () => {
    returnSaleMock.mockResolvedValueOnce({
      ok: false,
      error: { error: 'NetworkError', message: 'timeout', status: 503 },
    })

    const fd = createFormData({ saleId: 'sale-1' })
    const result = await returnSaleAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('disponible')
  })
})
