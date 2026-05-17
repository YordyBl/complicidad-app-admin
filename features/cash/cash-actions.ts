'use server'

import { revalidatePath } from 'next/cache'
import {
  closeCash,
  closeCashBox,
  addCashMovement,
  openCashBox,
  getCashBoxSummary,
  getCashBoxMovements,
  type CashClosingFormData,
  type CashClosingResponse,
  type ManualMovementFormData,
  type CashBoxSummary,
  type CashMovementList,
  cashClosingFormSchema,
  closeCashBoxFormSchema,
  manualMovementFormSchema,
} from '@/shared/api/cash'

export interface CashActionState {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

export interface CashDataActionState<T = unknown> {
  success: boolean
  error?: string
  data?: T
}

// ── Legacy manual cash closing ─────────────────────────────────────

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

// ── Cash Box actions ───────────────────────────────────────────────

/** Server Action: close the current cash box. The server derives the final balance from the cash ledger. */
export async function closeCashBoxAction(
  _prevState: CashActionState | null,
  _formData: FormData,
): Promise<CashActionState> {
  const parsed = closeCashBoxFormSchema.safeParse({})
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? 'Datos inválidos',
    }
  }

  const result = await closeCashBox()

  if (!result.ok) {
    return {
      success: false,
      error: result.error.status === 400
        ? (result.error.message || 'No se puede cerrar la caja en este momento.')
        : result.error.error === 'NetworkError'
          ? 'El servidor no está disponible. Intente más tarde.'
          : (result.error.message || 'Error al cerrar la caja.'),
    }
  }

  revalidatePath('/cash')
  return { success: true, data: result.data as Record<string, unknown> }
}

/** Server Action: add a manual movement to the current cash box. */
export async function addMovementAction(
  _prevState: CashActionState | null,
  formData: FormData,
): Promise<CashActionState> {
  const raw: Record<string, unknown> = {}

  const concept = formData.get('concept') as string | null
  const amountStr = formData.get('amountCents') as string | null
  const type = formData.get('type') as string | null

  if (concept) raw.concept = concept
  if (amountStr) raw.amountCents = parseInt(amountStr, 10)
  if (type) raw.type = type

  const parsed = manualMovementFormSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? 'Datos inválidos',
    }
  }

  const result = await addCashMovement(parsed.data as ManualMovementFormData)

  if (!result.ok) {
    return {
      success: false,
      error: result.error.status === 400
        ? (result.error.message || 'No se puede agregar el movimiento.')
        : result.error.error === 'NetworkError'
          ? 'El servidor no está disponible. Intente más tarde.'
          : (result.error.message || 'Error al agregar el movimiento.'),
    }
  }

  revalidatePath('/cash')
  return { success: true, data: result.data as Record<string, unknown> }
}

/** Server Action: open a new cash box for today. */
export async function openCashBoxAction(): Promise<CashActionState> {
  const result = await openCashBox()

  if (!result.ok) {
    return {
      success: false,
      error: result.error.status === 400
        ? (result.error.message || 'No se puede abrir una caja en este momento.')
        : result.error.error === 'NetworkError'
          ? 'El servidor no está disponible. Intente más tarde.'
          : (result.error.message || 'Error al abrir la caja.'),
    }
  }

  revalidatePath('/cash')
  return { success: true, data: result.data as Record<string, unknown> }
}

/** Server Action: fetch summary for a specific cash box (for client-side selector). */
export async function getSummaryAction(
  boxId: string,
): Promise<CashDataActionState<CashBoxSummary>> {
  const result = await getCashBoxSummary(boxId)

  if (!result.ok) {
    return {
      success: false,
      error: result.error.message || 'Error al cargar el resumen de caja.',
    }
  }

  return { success: true, data: result.data }
}

/** Server Action: fetch movements for a specific cash box (for client-side selector). */
export async function getMovementsAction(
  boxId: string,
  options?: { page?: number; pageSize?: number; type?: string; search?: string; from?: string; to?: string },
): Promise<CashDataActionState<CashMovementList>> {
  const result = await getCashBoxMovements(boxId, options)

  if (!result.ok) {
    return {
      success: false,
      error: result.error.message || 'Error al cargar los movimientos.',
    }
  }

  return { success: true, data: result.data }
}
