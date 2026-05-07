'use server'

import { revalidatePath } from 'next/cache'
import {
  createSale,
  cancelSale,
  returnSale,
  saleFormSchema,
} from '@/shared/api/sales'
import type { SaleFormData } from '@/shared/api/sales'

export interface SaleActionState {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

/**
 * Server Action: create a new sale.
 * Items carry priceType instead of unitPriceCents — backend resolves
 * the authoritative price from the Product.
 */
export async function createSaleAction(
  _prevState: SaleActionState | null,
  formData: FormData,
): Promise<SaleActionState> {
  const customerId = formData.get('customerId') as string | null
  const channel = formData.get('channel') as string | null
  const channelReference = formData.get('channelReference') as string | null

  // Parse items from JSON string in formData
  const itemsRaw = formData.get('items') as string | null
  let items: unknown[] = []
  if (itemsRaw) {
    try {
      items = JSON.parse(itemsRaw)
    } catch {
      return { success: false, error: 'Formato de productos inválido.' }
    }
  }

  const raw = {
    customerId,
    channel,
    channelReference: channelReference ?? undefined,
    items,
  }

  const parsed = saleFormSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? 'Datos inválidos',
    }
  }

  const result = await createSale(parsed.data as SaleFormData)

  if (!result.ok) {
    if (result.error.status === 400) {
      return {
        success: false,
        error: result.error.message || 'Datos de venta inválidos.',
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
      error: result.error.message || 'Error al crear la venta.',
    }
  }

  revalidatePath('/sales')
  return { success: true, data: result.data as Record<string, unknown> }
}

export interface ReversalActionState {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

/**
 * Server Action: cancel a sale by ID.
 */
export async function cancelSaleAction(
  _prevState: ReversalActionState | null,
  formData: FormData,
): Promise<ReversalActionState> {
  const saleId = formData.get('saleId') as string | null

  if (!saleId) {
    return { success: false, error: 'El ID de venta es requerido.' }
  }

  const result = await cancelSale(saleId)

  if (!result.ok) {
    if (result.error.status === 404) {
      return { success: false, error: 'Venta no encontrada.' }
    }
    if (result.error.status === 400) {
      return {
        success: false,
        error: result.error.message || 'No se puede cancelar esta venta.',
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
      error: result.error.message || 'Error al cancelar la venta.',
    }
  }

  return { success: true, data: result.data as Record<string, unknown> }
}

/**
 * Server Action: return a sale by ID.
 */
export async function returnSaleAction(
  _prevState: ReversalActionState | null,
  formData: FormData,
): Promise<ReversalActionState> {
  const saleId = formData.get('saleId') as string | null

  if (!saleId) {
    return { success: false, error: 'El ID de venta es requerido.' }
  }

  const result = await returnSale(saleId)

  if (!result.ok) {
    if (result.error.status === 404) {
      return { success: false, error: 'Venta no encontrada.' }
    }
    if (result.error.status === 400) {
      return {
        success: false,
        error: result.error.message || 'No se puede devolver esta venta.',
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
      error: result.error.message || 'Error al devolver la venta.',
    }
  }

  return { success: true, data: result.data as Record<string, unknown> }
}
