'use server'

import { revalidatePath } from 'next/cache'
import {
  createCustomer,
  updateCustomer,
  customerFormSchema,
} from '@/shared/api/customers'
import type { CustomerFormData } from '@/shared/api/customers'

export interface CustomerActionState {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

/**
 * Server Action: create a new customer.
 * Revalidates the customers list path on success.
 */
export async function createCustomerAction(
  _prevState: CustomerActionState | null,
  formData: FormData,
): Promise<CustomerActionState> {
  const raw: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    raw[key] = value || null
  }

  const parsed = customerFormSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? 'Datos inválidos',
    }
  }

  const result = await createCustomer(parsed.data as CustomerFormData)

  if (!result.ok) {
    if (result.error.status === 400) {
      return {
        success: false,
        error: result.error.message || 'Datos de cliente inválidos.',
      }
    }
    if (result.error.error === 'NetworkError') {
      return {
        success: false,
        error: 'El servidor no está disponible. Intente más tarde.',
      }
    }
    return {
      success: false,
      error: result.error.message || 'Error al crear el cliente.',
    }
  }

  revalidatePath('/customers')
  return { success: true, data: result.data as Record<string, unknown> }
}

/**
 * Server Action: update an existing customer.
 * Revalidates both the detail page and the list.
 */
export async function updateCustomerAction(
  _prevState: CustomerActionState | null,
  formData: FormData,
): Promise<CustomerActionState> {
  const id = formData.get('id') as string | null
  if (!id) {
    return { success: false, error: 'ID de cliente no proporcionado.' }
  }

  const raw: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    if (key !== 'id') {
      raw[key] = value || null
    }
  }

  const parsed = customerFormSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? 'Datos inválidos',
    }
  }

  const result = await updateCustomer(id, parsed.data as CustomerFormData)

  if (!result.ok) {
    if (result.error.status === 404) {
      return {
        success: false,
        error: 'Cliente no encontrado.',
      }
    }
    if (result.error.status === 400) {
      return {
        success: false,
        error: result.error.message || 'Datos de cliente inválidos.',
      }
    }
    if (result.error.error === 'NetworkError') {
      return {
        success: false,
        error: 'El servidor no está disponible. Intente más tarde.',
      }
    }
    return {
      success: false,
      error: result.error.message || 'Error al actualizar el cliente.',
    }
  }

  revalidatePath(`/customers/${id}`)
  revalidatePath('/customers')
  return { success: true, data: result.data as Record<string, unknown> }
}
