/**
 * Component tests for lot-adjustment-form.tsx.
 *
 * Verifies:
 * 1. Intake mode: shows "adding stock in a new lot" intent.
 * 2. Edit mode: shows "editing the existing lot" intent, no destructive language.
 * 3. Compensate mode: shows "compensating correction" intent.
 * 4. Form submission sends correct payload.
 * 5. Backend error is surfaced and values are preserved.
 * 6. Required field validation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { InventoryLotRow } from '@/shared/api/schemas'

// ── Mocks for server actions ──────────────────────────────────

const mockRefresh = vi.fn()
const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/inventory/lots',
}))

vi.mock('@/features/inventory/inventory-actions', () => ({
  increaseInventoryLotAction: vi.fn(),
  editInventoryLotAction: vi.fn(),
  compensateInventoryLotAction: vi.fn(),
}))

// ── Import component (does not exist yet — RED phase) ─────────

import { LotAdjustmentForm } from './lot-adjustment-form'

// ── Test data ─────────────────────────────────────────────────

const intactLot: InventoryLotRow = {
  lotId: 'lot-1',
  variantId: 'var-1',
  productId: 'prod-1',
  productName: 'Remera Classic',
  sku: 'REM-CLA-M',
  attributes: { size: 'M', color: 'Negro' },
  purchasedQuantity: 20,
  remainingQuantity: 15,
  unitCost: 45.5,
  purchaseDate: '2025-06-01T00:00:00.000Z',
  state: 'INTACT',
  allowedAction: 'edit',
}

const historicalLot: InventoryLotRow = {
  lotId: 'lot-4',
  variantId: 'var-3',
  productId: 'prod-2',
  productName: 'Pantalón Jean',
  sku: 'PAN-JEA-40',
  attributes: { size: '40' },
  purchasedQuantity: 10,
  remainingQuantity: 5,
  unitCost: 120.0,
  purchaseDate: '2025-03-01T00:00:00.000Z',
  state: 'HISTORICAL',
  allowedAction: 'compensate',
  reasonHint: 'Ajuste histórico por cierre de año',
}

// ── Helpers ───────────────────────────────────────────────────

function renderForm(
  mode: 'increase' | 'edit' | 'compensate',
  lot?: InventoryLotRow,
  defaultVariantId?: string,
) {
  const onClose = vi.fn()
  const lotData = lot ?? intactLot
  const result = render(
    <LotAdjustmentForm
      mode={mode}
      lot={lotData}
      variantId={lotData.variantId}
      productId={lotData.productId}
      onClose={onClose}
    />,
  )
  return { ...result, onClose }
}

// ═══════════════════════════════════════════════════════════════
// Intake mode — "adding stock in a new lot"
// ═══════════════════════════════════════════════════════════════

describe('LotAdjustmentForm — intake mode', () => {
  it('states the admin is adding stock in a new lot', () => {
    renderForm('increase')
    expect(
      screen.getByText(/nuevo ingreso/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/agregar stock/i),
    ).toBeInTheDocument()
  })

  it('shows quantity and unit cost fields', () => {
    renderForm('increase')
    expect(screen.getByLabelText(/cantidad/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/costo unitario/i)).toBeInTheDocument()
  })

  it('shows an optional reason field', () => {
    renderForm('increase')
    expect(screen.getByLabelText(/motivo/i)).toBeInTheDocument()
  })

  it('shows the stock effect summary before confirmation', () => {
    renderForm('increase')
    expect(
      screen.getByText(/stock será incrementado/i),
    ).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════
// Edit mode — "editing the existing lot" (intact only)
// ═══════════════════════════════════════════════════════════════

describe('LotAdjustmentForm — edit mode', () => {
  it('states the admin is editing the existing lot', () => {
    renderForm('edit', intactLot)
    expect(
      screen.getByText(/editar lote existente/i),
    ).toBeInTheDocument()
  })

  it('does NOT show destructive or compensation language', () => {
    renderForm('edit', intactLot)
    expect(
      screen.queryByText(/compensar/i),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/corrección/i),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/destructiv/i),
    ).not.toBeInTheDocument()
  })

  it('pre-fills current lot values', () => {
    renderForm('edit', intactLot)
    const qtyInput = screen.getByLabelText(/cantidad/i) as HTMLInputElement
    expect(qtyInput.value).toBe('20')
  })

  it('shows the current unit cost', () => {
    renderForm('edit', intactLot)
    const costInput = screen.getByLabelText(/costo unitario/i) as HTMLInputElement
    expect(costInput.value).toBe('45.5')
  })

  it('shows lot identity (SKU + attributes) for context', () => {
    renderForm('edit', intactLot)
    expect(screen.getByText(/REM-CLA-M/)).toBeInTheDocument()
    expect(screen.getByText(/size: M/)).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════
// Compensate mode — "compensating correction" (historical only)
// ═══════════════════════════════════════════════════════════════

describe('LotAdjustmentForm — compensate mode', () => {
  it('states the admin is creating a compensating correction', () => {
    renderForm('compensate', historicalLot)
    expect(
      screen.getByText('Compensación histórica'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/corrección compensatoria/i),
    ).toBeInTheDocument()
  })

  it('shows the original historical lot as identifiable', () => {
    renderForm('compensate', historicalLot)
    expect(screen.getByText(/PAN-JEA-40/)).toBeInTheDocument()
    expect(screen.getByText(/Histórico/)).toBeInTheDocument()
  })

  it('shows the reason hint from the backend', () => {
    renderForm('compensate', historicalLot)
    expect(
      screen.getByText(/ajuste histórico por cierre de año/i),
    ).toBeInTheDocument()
  })

  it('requires a reason for compensation', () => {
    renderForm('compensate', historicalLot)
    const reasonInput = screen.getByLabelText(/motivo/i) as HTMLInputElement
    expect(reasonInput).toBeInTheDocument()
    expect(reasonInput).toBeRequired()
  })

  it('shows quantity delta field instead of absolute quantity', () => {
    renderForm('compensate', historicalLot)
    expect(screen.getByLabelText(/delta|diferencia/i)).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════
// Error feedback
// ═══════════════════════════════════════════════════════════════

describe('LotAdjustmentForm — error feedback', () => {
  it('shows backend error message in context', async () => {
    const { increaseInventoryLotAction } = await import(
      '@/features/inventory/inventory-actions'
    )
    vi.mocked(increaseInventoryLotAction).mockResolvedValueOnce({
      success: false,
      error: 'El stock no puede exceder el límite del lote',
    })

    const { onClose } = renderForm('increase')

    const qtyInput = screen.getByLabelText(/cantidad/i)
    fireEvent.change(qtyInput, { target: { value: '999' } })

    const submitBtn = screen.getByRole('button', { name: /confirmar|guardar/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/stock no puede exceder/i),
      ).toBeInTheDocument()
    })

    // Form should NOT close on error
    expect(onClose).not.toHaveBeenCalled()
  })

  it('preserves entered values after backend error', async () => {
    const { increaseInventoryLotAction } = await import(
      '@/features/inventory/inventory-actions'
    )
    vi.mocked(increaseInventoryLotAction).mockResolvedValueOnce({
      success: false,
      error: 'Error de validación',
    })

    renderForm('increase')

    const qtyInput = screen.getByLabelText(/cantidad/i) as HTMLInputElement
    const reasonInput = screen.getByLabelText(/motivo/i) as HTMLInputElement

    fireEvent.change(qtyInput, { target: { value: '50' } })
    fireEvent.change(reasonInput, { target: { value: 'Ajuste manual' } })

    const submitBtn = screen.getByRole('button', { name: /confirmar|guardar/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/error de validación/i)).toBeInTheDocument()
    })

    // Values should be preserved
    expect(qtyInput.value).toBe('50')
    expect(reasonInput.value).toBe('Ajuste manual')
  })
})

// ═══════════════════════════════════════════════════════════════
// Route refresh on success
// ═══════════════════════════════════════════════════════════════

describe('LotAdjustmentForm — route refresh on success', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls router.refresh() after successful increase submission', async () => {
    const { increaseInventoryLotAction } = await import(
      '@/features/inventory/inventory-actions'
    )
    vi.mocked(increaseInventoryLotAction).mockResolvedValueOnce({
      success: true,
      data: { lotId: 'new-lot' },
    })

    const { onClose } = renderForm('increase')

    const qtyInput = screen.getByLabelText(/cantidad/i)
    fireEvent.change(qtyInput, { target: { value: '10' } })

    const submitBtn = screen.getByRole('button', { name: /confirmar ingreso/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  it('calls router.refresh() after successful edit submission', async () => {
    const { editInventoryLotAction } = await import(
      '@/features/inventory/inventory-actions'
    )
    vi.mocked(editInventoryLotAction).mockResolvedValueOnce({
      success: true,
      data: { lotId: 'lot-1' },
    })

    const { onClose } = renderForm('edit', intactLot)

    const submitBtn = screen.getByRole('button', { name: /guardar cambios/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  it('calls router.refresh() after successful compensate submission', async () => {
    const { compensateInventoryLotAction } = await import(
      '@/features/inventory/inventory-actions'
    )
    vi.mocked(compensateInventoryLotAction).mockResolvedValueOnce({
      success: true,
      data: { lotId: 'lot-4' },
    })

    const { onClose } = renderForm('compensate', historicalLot)

    const deltaInput = screen.getByLabelText(/diferencia/i)
    fireEvent.change(deltaInput, { target: { value: '5' } })

    const reasonInput = screen.getByLabelText(/motivo/i)
    fireEvent.change(reasonInput, { target: { value: 'Corrección' } })

    const submitBtn = screen.getByRole('button', { name: /registrar compensación/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  it('does NOT call router.refresh() on failed submission', async () => {
    const { increaseInventoryLotAction } = await import(
      '@/features/inventory/inventory-actions'
    )
    vi.mocked(increaseInventoryLotAction).mockResolvedValueOnce({
      success: false,
      error: 'Stock insuficiente',
    })

    const { onClose } = renderForm('increase')

    const qtyInput = screen.getByLabelText(/cantidad/i)
    fireEvent.change(qtyInput, { target: { value: '999' } })

    const submitBtn = screen.getByRole('button', { name: /confirmar ingreso/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/stock insuficiente/i)).toBeInTheDocument()
    })

    expect(mockRefresh).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does NOT call router.refresh() on failed edit submission', async () => {
    const { editInventoryLotAction } = await import(
      '@/features/inventory/inventory-actions'
    )
    vi.mocked(editInventoryLotAction).mockResolvedValueOnce({
      success: false,
      error: 'El lote ya no está intacto',
    })

    const { onClose } = renderForm('edit', intactLot)

    const submitBtn = screen.getByRole('button', { name: /guardar cambios/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/el lote ya no está intacto/i)).toBeInTheDocument()
    })

    expect(mockRefresh).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════
// productId in FormData — for product path revalidation
// ═══════════════════════════════════════════════════════════════

describe('LotAdjustmentForm — productId in FormData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('includes productId in FormData for product path revalidation (intake)', async () => {
    const { increaseInventoryLotAction } = await import(
      '@/features/inventory/inventory-actions'
    )
    vi.mocked(increaseInventoryLotAction).mockResolvedValueOnce({
      success: true,
      data: { lotId: 'new-lot' },
    })

    render(
      <LotAdjustmentForm
        mode="increase"
        lot={intactLot}
        variantId="var-1"
        productId="prod-specific-1"
        onClose={vi.fn()}
      />,
    )

    const qtyInput = screen.getByLabelText(/cantidad/i)
    fireEvent.change(qtyInput, { target: { value: '10' } })

    const submitBtn = screen.getByRole('button', { name: /confirmar ingreso/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(increaseInventoryLotAction).toHaveBeenCalled()
    })

    const lastCall = vi.mocked(increaseInventoryLotAction).mock.calls.at(-1)
    const formData = lastCall?.[1] as FormData | undefined
    expect(formData).toBeDefined()
    expect(formData!.get('productId')).toBe('prod-specific-1')
  })

  it('includes productId in FormData for product path revalidation (edit)', async () => {
    const { editInventoryLotAction } = await import(
      '@/features/inventory/inventory-actions'
    )
    vi.mocked(editInventoryLotAction).mockResolvedValueOnce({
      success: true,
      data: { lotId: 'lot-1' },
    })

    render(
      <LotAdjustmentForm
        mode="edit"
        lot={intactLot}
        variantId="var-1"
        productId="prod-specific-1"
        onClose={vi.fn()}
      />,
    )

    const submitBtn = screen.getByRole('button', { name: /guardar cambios/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(editInventoryLotAction).toHaveBeenCalled()
    })

    const lastCall = vi.mocked(editInventoryLotAction).mock.calls.at(-1)
    const formData = lastCall?.[1] as FormData | undefined
    expect(formData).toBeDefined()
    expect(formData!.get('productId')).toBe('prod-specific-1')
  })
})
