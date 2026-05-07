'use server'

import { revalidatePath } from 'next/cache'
import { closeCash, cashClosingFormSchema } from '@/shared/api/cash'
import type { CashClosingFormData } from '@/shared/api/cash'

export interface CashActionState {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

/**
 * Server Action: execute a manual cash closing.
 * Requires explicit confirmation. Prevents duplicate submission.
 */
export async function closeCashAction(
  _prevState: CashActionState | null,
  formData: FormData,
): Promise<CashActionState> {
  const raw: Record<string, unknown> = {}

  const notes = formData.get('notes') as string | null
  if (notes) raw.notes = notes

  const parsed = cashClosingFormSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? 'Datos inválidos',
    }
  }

  const result = await closeCash(parsed.data as CashClosingFormData)

  if (!result.ok) {
    if (result.error.status === 400) {
      return {
        success: false,
        error: result.error.message || 'No se puede realizar el cierre de caja en este momento.',
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
      error: result.error.message || 'Error al realizar el cierre de caja.',
    }
  }

  revalidatePath('/cash')
  return { success: true, data: result.data as Record<string, unknown> }
}
