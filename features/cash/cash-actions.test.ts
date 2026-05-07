import { describe, it, expect, beforeEach, vi } from 'vitest'

const { closeCashMock } = vi.hoisted(() => ({
  closeCashMock: vi.fn(),
}))

vi.mock('@/shared/api/cash', () => ({
  cashClosingFormSchema: {
    safeParse: (data: unknown) => ({ success: true, data }),
  },
  closeCash: closeCashMock,
}))

import { closeCashAction } from './cash-actions'

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
    closeCashMock.mockResolvedValueOnce({
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
    closeCashMock.mockResolvedValueOnce({
      ok: true,
      data: { id: 'close-2', closedAt: '2025-03-15T12:00:00Z' },
      status: 201,
    })

    const fd = createFormData({})
    const result = await closeCashAction(null, fd)

    expect(result.success).toBe(true)
  })

  it('returns error on 400 backend rejection', async () => {
    closeCashMock.mockResolvedValueOnce({
      ok: false,
      error: { error: 'ValidationError', message: 'Cash already closed', status: 400 },
    })

    const fd = createFormData({})
    const result = await closeCashAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Cash already closed')
  })

  it('returns error on network failure', async () => {
    closeCashMock.mockResolvedValueOnce({
      ok: false,
      error: { error: 'NetworkError', message: 'Connection refused', status: 503 },
    })

    const fd = createFormData({ notes: 'test' })
    const result = await closeCashAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('disponible')
  })
})
