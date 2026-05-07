'use server'

import { revalidatePath } from 'next/cache'
import {
  createProduct,
  registerPurchase,
  productFormSchema,
  purchaseFormSchema,
} from '@/shared/api/inventory'
import type { ProductFormData, PurchaseFormData } from '@/shared/api/inventory'

export interface InventoryActionState {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

/**
 * Server Action: create a new product with auto-generated variants from sizes.
 */
export async function createProductAction(
  _prevState: InventoryActionState | null,
  formData: FormData,
): Promise<InventoryActionState> {
  // Parse sizes from formData: comma-separated or JSON array
  const sizesRaw = formData.get('sizes') as string | null
  let sizes: string[] = []
  if (sizesRaw) {
    try {
      const parsed = JSON.parse(sizesRaw)
      sizes = Array.isArray(parsed) ? parsed.map(String) : sizesRaw.split(',').map((s) => s.trim()).filter(Boolean)
    } catch {
      sizes = sizesRaw.split(',').map((s) => s.trim()).filter(Boolean)
    }
  }

  const raw: Record<string, unknown> = {
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    baseSku: formData.get('baseSku'),
    salePrice: Number(formData.get('salePrice')),
    sizes,
  }

  const presaleRaw = formData.get('presalePrice')
  if (presaleRaw && presaleRaw !== '') {
    raw.presalePrice = Number(presaleRaw)
  }

  // Parse aliases from comma-separated string
  const aliasesRaw = formData.get('aliases') as string | null
  if (aliasesRaw) {
    raw.aliases = aliasesRaw.split(',').map((a) => a.trim()).filter(Boolean)
  }

  const parsed = productFormSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? 'Datos inválidos',
    }
  }

  const result = await createProduct(parsed.data as ProductFormData)

  if (!result.ok) {
    if (result.error.status === 400) {
      return {
        success: false,
        error: result.error.message || 'Datos del producto inválidos.',
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
      error: result.error.message || 'Error al crear el producto.',
    }
  }

  revalidatePath('/inventory')
  return { success: true, data: result.data as Record<string, unknown> }
}

/**
 * Server Action: register a new inventory purchase.
 * Items are serialized as JSON string in FormData ('items' field).
 */
export async function registerPurchaseAction(
  _prevState: InventoryActionState | null,
  formData: FormData,
): Promise<InventoryActionState> {
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

  const raw: Record<string, unknown> = {
    items,
  }

  const supplierId = formData.get('supplierId') as string | null
  if (supplierId) raw.supplierId = supplierId

  const notes = formData.get('notes') as string | null
  if (notes) raw.notes = notes

  const purchaseDate = formData.get('purchaseDate') as string | null
  if (purchaseDate) raw.purchaseDate = purchaseDate

  const parsed = purchaseFormSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? 'Datos inválidos',
    }
  }

  const result = await registerPurchase(parsed.data as PurchaseFormData)

  if (!result.ok) {
    if (result.error.status === 400) {
      return {
        success: false,
        error: result.error.message || 'Datos de compra inválidos.',
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
      error: result.error.message || 'Error al registrar la compra.',
    }
  }

  revalidatePath('/inventory')
  return { success: true, data: result.data as Record<string, unknown> }
}
