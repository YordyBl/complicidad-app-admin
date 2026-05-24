import { describe, it, expect, beforeEach, vi } from 'vitest'

const { cancelSaleMock, returnSaleMock, createSaleMock, settleSaleBalanceMock, createConstanciaEmissionMock, mockRevalidatePath } = vi.hoisted(() => ({
  cancelSaleMock: vi.fn(),
  returnSaleMock: vi.fn(),
  createSaleMock: vi.fn(),
  settleSaleBalanceMock: vi.fn(),
  createConstanciaEmissionMock: vi.fn(),
  mockRevalidatePath: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
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
  settleSaleBalance: settleSaleBalanceMock,
  createSaleConstanciaEmission: createConstanciaEmissionMock,
}))

import { createSaleAction, cancelSaleAction, returnSaleAction, settleSaleBalanceAction, createConstanciaEmissionAction } from './sales-actions'

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

  it('includes amountPaidNowCents in the create payload for partial payment', async () => {
    createSaleMock.mockResolvedValueOnce({
      ok: true,
      data: { id: 'sale-3' },
      status: 201,
    })

    const fd = createFormData({
      customerId: 'cust-1',
      channel: 'web',
      items: JSON.stringify([{ variantId: 'v1', quantity: 1, priceType: 'regular' }]),
      amountPaidNowCents: '50000',
      totalCents: '150000',
    })
    const result = await createSaleAction(null, fd)

    expect(result.success).toBe(true)
    expect(createSaleMock).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaidNowCents: 50000 }),
    )
  })

  it('includes amountPaidNowCents=0 for no upfront payment', async () => {
    createSaleMock.mockResolvedValueOnce({
      ok: true,
      data: { id: 'sale-4' },
      status: 201,
    })

    const fd = createFormData({
      customerId: 'cust-1',
      channel: 'web',
      items: JSON.stringify([{ variantId: 'v1', quantity: 1, priceType: 'regular' }]),
      amountPaidNowCents: '0',
      totalCents: '150000',
    })
    const result = await createSaleAction(null, fd)

    expect(result.success).toBe(true)
    expect(createSaleMock).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaidNowCents: 0 }),
    )
  })

  it('blocks amountPaidNowCents that exceeds cart total', async () => {
    const fd = createFormData({
      customerId: 'cust-1',
      channel: 'web',
      items: JSON.stringify([{ variantId: 'v1', quantity: 1, priceType: 'regular' }]),
      amountPaidNowCents: '200000',
      totalCents: '150000',
    })
    const result = await createSaleAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('exceder')
    expect(createSaleMock).not.toHaveBeenCalled()
  })

  it('rejects malformed amountPaidNowCents (non-integer)', async () => {
    const fd = createFormData({
      customerId: 'cust-1',
      channel: 'web',
      items: JSON.stringify([{ variantId: 'v1', quantity: 1, priceType: 'regular' }]),
      amountPaidNowCents: 'abc',
      totalCents: '150000',
    })
    const result = await createSaleAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('inválido')
    expect(createSaleMock).not.toHaveBeenCalled()
  })

  it('rejects negative amountPaidNowCents', async () => {
    const fd = createFormData({
      customerId: 'cust-1',
      channel: 'web',
      items: JSON.stringify([{ variantId: 'v1', quantity: 1, priceType: 'regular' }]),
      amountPaidNowCents: '-100',
      totalCents: '150000',
    })
    const result = await createSaleAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('negativo')
    expect(createSaleMock).not.toHaveBeenCalled()
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

describe('settleSaleBalanceAction', () => {
  it('settles a pending balance successfully', async () => {
    settleSaleBalanceMock.mockResolvedValueOnce({
      ok: true,
      data: { saleId: 'sale-1', paymentStatus: 'paid', settledAmountCents: 50000 },
      status: 200,
    })

    const result = await settleSaleBalanceAction('sale-1')

    expect(result.success).toBe(true)
    expect(settleSaleBalanceMock).toHaveBeenCalledWith('sale-1')
  })

  it('returns error when saleId is empty', async () => {
    const result = await settleSaleBalanceAction('')

    expect(result.success).toBe(false)
    expect(result.error).toContain('ID')
  })

  it('returns error on 404 not found', async () => {
    settleSaleBalanceMock.mockResolvedValueOnce({
      ok: false,
      error: { error: 'NotFound', message: 'Sale not found', status: 404 },
    })

    const result = await settleSaleBalanceAction('bad-id')

    expect(result.success).toBe(false)
    expect(result.error).toContain('encontrada')
  })

  it('returns error on 409 conflict (already settled)', async () => {
    settleSaleBalanceMock.mockResolvedValueOnce({
      ok: false,
      error: { error: 'Conflict', message: 'Sale is already fully paid', status: 409 },
    })

    const result = await settleSaleBalanceAction('settled-sale')

    expect(result.success).toBe(false)
    expect(result.error).toContain('saldo')
  })

  it('returns network error message', async () => {
    settleSaleBalanceMock.mockResolvedValueOnce({
      ok: false,
      error: { error: 'NetworkError', message: 'timeout', status: 503 },
    })

    const result = await settleSaleBalanceAction('sale-1')

    expect(result.success).toBe(false)
    expect(result.error).toContain('disponible')
  })

  it('returns generic error fallback for unknown status codes', async () => {
    settleSaleBalanceMock.mockResolvedValueOnce({
      ok: false,
      error: { error: 'InternalError', message: 'Unexpected failure', status: 500 },
    })

    const result = await settleSaleBalanceAction('sale-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unexpected failure')
  })

  it('calls revalidatePath for /sales and /cash on successful settlement', async () => {
    settleSaleBalanceMock.mockResolvedValueOnce({
      ok: true,
      data: { saleId: 'sale-1', paymentStatus: 'paid', settledAmountCents: 50000 },
      status: 200,
    })

    const result = await settleSaleBalanceAction('sale-1')

    expect(result.success).toBe(true)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/sales')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/cash')
  })
})

describe('createConstanciaEmissionAction', () => {
  it('creates a constancia emission and revalidates the sale path', async () => {
    const mockEmission = {
      id: 'emission-uuid-0001',
      saleId: 'sale-1',
      emissionNumber: 1,
      issuedAt: '2025-05-15T12:00:00.000Z',
      templateVersion: 'v1',
      hasSnapshot: true,
      pdfUrl: '/api/sales/sale-1/constancia-emissions/emission-uuid-0001/pdf',
    }
    createConstanciaEmissionMock.mockResolvedValueOnce({
      ok: true,
      data: mockEmission,
      status: 201,
    })

    const result = await createConstanciaEmissionAction('sale-1', {
      id: 'sale-1',
      customerName: 'Juan Pérez',
      lines: [],
    })

    expect(result.success).toBe(true)
    expect(createConstanciaEmissionMock).toHaveBeenCalledWith('sale-1', expect.objectContaining({ id: 'sale-1' }))
    expect(mockRevalidatePath).toHaveBeenCalledWith('/sales/sale-1')
    if (result.success) {
      expect(result.data).toBeDefined()
    }
  })

  it('returns validation error when saleId is empty', async () => {
    const result = await createConstanciaEmissionAction('', {})
    expect(result.success).toBe(false)
    expect(result.error).toContain('ID')
  })

  it('returns error on backend failure (network)', async () => {
    createConstanciaEmissionMock.mockResolvedValueOnce({
      ok: false,
      error: { error: 'NetworkError', message: 'timeout', status: 503 },
    })

    const result = await createConstanciaEmissionAction('sale-1', {})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('disponible')
    }
  })

  it('returns error on backend 404', async () => {
    createConstanciaEmissionMock.mockResolvedValueOnce({
      ok: false,
      error: { error: 'NotFoundError', message: 'Sale not found', status: 404 },
    })

    const result = await createConstanciaEmissionAction('bad-id', {})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('encontrada')
    }
  })

  it('returns error on backend validation failure', async () => {
    createConstanciaEmissionMock.mockResolvedValueOnce({
      ok: false,
      error: { error: 'ValidationError', message: 'saleData must be an object', status: 400 },
    })

    const result = await createConstanciaEmissionAction('sale-1', {})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('saleData')
    }
  })
})
