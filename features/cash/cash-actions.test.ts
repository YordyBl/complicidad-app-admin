import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'

const mocks = vi.hoisted(() => ({
  closeCashMock: vi.fn(),
  addCashMovementMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePathMock,
}))

vi.mock('@/shared/api/cash', () => {
  const cashClosingFormSchema = z.object({
    notes: z.string().nullable().optional(),
  })

  const manualMovementFormSchema = z.object({
    concept: z.string().min(1, 'El concepto es requerido'),
    amountCents: z.number().int().positive('El monto debe ser mayor a cero'),
    type: z.enum(['MANUAL_ADJUSTMENT', 'WITHDRAWAL']),
  })

  return {
    cashClosingFormSchema,
    manualMovementFormSchema,
    closeCashBoxFormSchema: z.object({}),
    closeCash: mocks.closeCashMock,
    addCashMovement: mocks.addCashMovementMock,
    closeCashBox: vi.fn(),
    openCashBox: vi.fn(),
    getCashBoxSummary: vi.fn(),
    getCashBoxMovements: vi.fn(),
  }
})

import { addMovementAction, closeCashAction, closeCashBoxAction } from './cash-actions'
import * as cashApi from '@/shared/api/cash'

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

describe('closeCashAction', () => {
  it('closes cash successfully with notes', async () => {
    mocks.closeCashMock.mockResolvedValueOnce({
      ok: true,
      data: { id: 'close-1', closedAt: '2025-03-15T12:00:00Z', notes: 'End of day' },
      status: 201,
    })

    const fd = createFormData({ notes: 'End of day' })
    const result = await closeCashAction(null, fd)

    expect(result.success).toBe(true)
    expect(result.data?.id).toBe('close-1')
  })

  it('closes cash successfully without notes', async () => {
    mocks.closeCashMock.mockResolvedValueOnce({
      ok: true,
      data: { id: 'close-2', closedAt: '2025-03-15T12:00:00Z' },
      status: 201,
    })

    const fd = createFormData({})
    const result = await closeCashAction(null, fd)

    expect(result.success).toBe(true)
  })

  it('returns error on 400 backend rejection', async () => {
    mocks.closeCashMock.mockResolvedValueOnce({
      ok: false,
      error: { error: 'ValidationError', message: 'Cash already closed', status: 400 },
    })

    const fd = createFormData({})
    const result = await closeCashAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Cash already closed')
  })

  it('returns error on network failure', async () => {
    mocks.closeCashMock.mockResolvedValueOnce({
      ok: false,
      error: { error: 'NetworkError', message: 'Connection refused', status: 503 },
    })

    const fd = createFormData({ notes: 'test' })
    const result = await closeCashAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('disponible')
  })
})

describe('closeCashBoxAction', () => {
  it('calls closeCashBox without arguments and revalidates on success', async () => {
    vi.mocked(cashApi.closeCashBox).mockResolvedValueOnce({
      ok: true,
      data: {
        id: 'box-close-1',
        businessDate: '2026-05-17',
        status: 'CLOSED',
        openingBalanceCents: 10000,
        currentBalanceCents: 13500,
        finalBalanceCents: 13500,
        closedAt: '2026-05-17T23:00:00.000Z',
        legacy: false,
      },
      status: 200,
    })

    const fd = new FormData()
    const result = await closeCashBoxAction(null, fd)

    expect(result.success).toBe(true)
    expect(result.data?.id).toBe('box-close-1')
    expect(vi.mocked(cashApi.closeCashBox)).toHaveBeenCalledWith()
    expect(mocks.revalidatePathMock).toHaveBeenCalledWith('/cash')
  })

  it('returns error on 400 backend rejection', async () => {
    vi.mocked(cashApi.closeCashBox).mockResolvedValueOnce({
      ok: false,
      error: { error: 'BusinessRuleError', message: 'Caja ya cerrada', status: 400 },
    })

    const fd = new FormData()
    const result = await closeCashBoxAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Caja ya cerrada')
    expect(vi.mocked(cashApi.closeCashBox)).toHaveBeenCalledWith()
  })

  it('returns error on network failure', async () => {
    vi.mocked(cashApi.closeCashBox).mockResolvedValueOnce({
      ok: false,
      error: { error: 'NetworkError', message: 'Connection refused', status: 503 },
    })

    const fd = new FormData()
    const result = await closeCashBoxAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('disponible')
    expect(vi.mocked(cashApi.closeCashBox)).toHaveBeenCalledWith()
  })
})

describe('addMovementAction', () => {
  it('sends a positive amount in cents to the API', async () => {
    mocks.addCashMovementMock.mockResolvedValueOnce({
      ok: true,
      data: { id: 'mov-1' },
      status: 201,
    })

    const fd = createFormData({
      concept: 'Retiro de caja',
      amountCents: '2500',
      type: 'WITHDRAWAL',
    })

    const result = await addMovementAction(null, fd)

    expect(result.success).toBe(true)
    expect(mocks.addCashMovementMock).toHaveBeenCalledWith({
      concept: 'Retiro de caja',
      amountCents: 2500,
      type: 'WITHDRAWAL',
    })
  })

  it('rejects zero amount before calling the API', async () => {
    const fd = createFormData({
      concept: 'Retiro de caja',
      amountCents: '0',
      type: 'WITHDRAWAL',
    })

    const result = await addMovementAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toBe('El monto debe ser mayor a cero')
    expect(mocks.addCashMovementMock).not.toHaveBeenCalled()
  })

  it('rejects negative amount before calling the API', async () => {
    const fd = createFormData({
      concept: 'Retiro de caja',
      amountCents: '-2500',
      type: 'WITHDRAWAL',
    })

    const result = await addMovementAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toBe('El monto debe ser mayor a cero')
    expect(mocks.addCashMovementMock).not.toHaveBeenCalled()
  })
})
