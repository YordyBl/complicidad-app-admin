import { describe, it, expect, beforeEach, vi } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────

const { createCustomerMock, updateCustomerMock } = vi.hoisted(() => ({
  createCustomerMock: vi.fn(),
  updateCustomerMock: vi.fn(),
}))

vi.mock('@/shared/api/customers', () => ({
  customerFormSchema: {
    safeParse: (data: unknown) => {
      const name = (data as Record<string, unknown>).name
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return { success: false, error: { errors: [{ message: 'El nombre es requerido' }] } }
      }
      return { success: true, data }
    },
  },
  createCustomer: createCustomerMock,
  updateCustomer: updateCustomerMock,
}))

// ── Import ────────────────────────────────────────────────────────

import { createCustomerAction, updateCustomerAction } from './customers-actions'

function createFormData(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) {
    fd.set(k, v)
  }
  return fd
}

function mockSuccess(data: Record<string, unknown>) {
  return { ok: true, data, status: 200 }
}

function mockError(status: number, error: string, message: string) {
  return { ok: false, error: { error, message, status } }
}

function mockNetworkError() {
  return { ok: false, error: { error: 'NetworkError', message: 'Connection refused', status: 503 } }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createCustomerAction', () => {
  it('creates a customer on valid data', async () => {
    createCustomerMock.mockResolvedValueOnce(mockSuccess({ id: 'cust-1', name: 'John Doe' }))

    const fd = createFormData({ name: 'John Doe' })
    const result = await createCustomerAction(null, fd)

    expect(result.success).toBe(true)
    expect(result.data?.id).toBe('cust-1')
    expect(createCustomerMock).toHaveBeenCalled()
  })

  it('returns error on empty name', async () => {
    const fd = createFormData({ name: '' })
    const result = await createCustomerAction(null, fd)

    expect(result.success).toBe(false)
    expect(createCustomerMock).not.toHaveBeenCalled()
  })

  it('returns error on 400 backend validation', async () => {
    createCustomerMock.mockResolvedValueOnce(mockError(400, 'ValidationError', 'Email already in use'))

    const fd = createFormData({ name: 'John Doe' })
    const result = await createCustomerAction(null, fd)

    expect(result.success).toBe(false)
    expect(createCustomerMock).toHaveBeenCalled()
  })

  it('returns user-safe error on network failure', async () => {
    createCustomerMock.mockResolvedValueOnce(mockNetworkError())

    const fd = createFormData({ name: 'John Doe' })
    const result = await createCustomerAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('disponible')
  })
})

describe('updateCustomerAction', () => {
  it('updates a customer on valid data', async () => {
    updateCustomerMock.mockResolvedValueOnce(mockSuccess({ id: 'cust-1', name: 'Jane Doe' }))

    const fd = createFormData({ name: 'Jane Doe' })
    fd.set('id', 'cust-1')
    const result = await updateCustomerAction(null, fd)

    expect(result.success).toBe(true)
    expect(updateCustomerMock).toHaveBeenCalled()
  })

  it('returns error when id is missing', async () => {
    const fd = createFormData({ name: 'Jane Doe' })
    const result = await updateCustomerAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('ID')
  })

  it('returns error on 404 not found', async () => {
    updateCustomerMock.mockResolvedValueOnce(mockError(404, 'NotFound', 'Customer not found'))

    const fd = createFormData({ name: 'Jane Doe' })
    fd.set('id', 'bad-id')
    const result = await updateCustomerAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('encontrado')
  })

  it('returns error on network failure', async () => {
    updateCustomerMock.mockResolvedValueOnce(mockNetworkError())

    const fd = createFormData({ name: 'Jane Doe' })
    fd.set('id', 'cust-1')
    const result = await updateCustomerAction(null, fd)

    expect(result.success).toBe(false)
    expect(result.error).toContain('disponible')
  })
})
