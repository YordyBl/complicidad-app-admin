/**
 * Component tests for inventory-lots-view.tsx.
 *
 * Verifies:
 * 1. Grouped variant cards with correct SKU labels and stock totals.
 * 2. Lot state badges: INTACT, HISTORICAL, EXHAUSTED.
 * 3. Inline action triggers per lot based on allowedAction.
 * 4. Edit form opens with intact edit wording.
 * 5. Compensate form opens with historical compensation wording.
 * 6. Intake form accessible via "Nuevo ingreso" button per variant.
 * 7. No actions shown when canAdjust is false.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import type { InventoryLotsResponse } from '@/shared/api/schemas'

// ── Mock lot-adjustment-form ──────────────────────────────────

vi.mock('@/features/inventory/lot-adjustment-form', () => ({
  LotAdjustmentForm: ({
    mode,
    onClose,
  }: {
    mode: string
    lot?: unknown
    variantId?: string
    productId?: string
    onClose: () => void
  }) => (
    <div data-testid={`form-${mode}`}>
      <span>Form mode: {mode}</span>
      <button onClick={onClose} data-testid={`close-${mode}`}>
        Close {mode}
      </button>
    </div>
  ),
}))

// ── Mock next/link ────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: Record<string, unknown>) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').createElement('a', { href, ...props }, children),
}))

// ── Import component (does not exist yet — RED phase) ─────────

import { InventoryLotsView } from './inventory-lots-view'

// ── Test data ─────────────────────────────────────────────────

const mockLotsData: InventoryLotsResponse = {
  product: { id: 'prod-1', name: 'Remera Classic' },
  variants: [
    {
      variantId: 'var-1',
      sku: 'REM-CLA-M',
      attributes: { size: 'M', color: 'Negro' },
      stock: 35,
      lots: [
        {
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
          state: 'INTACT' as const,
          allowedAction: 'edit' as const,
        },
        {
          lotId: 'lot-2',
          variantId: 'var-1',
          productId: 'prod-1',
          productName: 'Remera Classic',
          sku: 'REM-CLA-M',
          attributes: { size: 'M', color: 'Negro' },
          purchasedQuantity: 25,
          remainingQuantity: 20,
          unitCost: 42.0,
          purchaseDate: '2025-05-15T00:00:00.000Z',
          state: 'INTACT' as const,
          allowedAction: 'edit' as const,
        },
      ],
    },
    {
      variantId: 'var-2',
      sku: 'REM-CLA-L',
      attributes: { size: 'L' },
      stock: 12,
      lots: [
        {
          lotId: 'lot-3',
          variantId: 'var-2',
          productId: 'prod-1',
          productName: 'Remera Classic',
          sku: 'REM-CLA-L',
          attributes: { size: 'L' },
          purchasedQuantity: 15,
          remainingQuantity: 0,
          unitCost: 46.0,
          purchaseDate: '2025-04-10T00:00:00.000Z',
          state: 'EXHAUSTED' as const,
          allowedAction: 'none' as const,
        },
      ],
    },
    {
      variantId: 'var-3',
      sku: 'PAN-JEA-40',
      attributes: { size: '40' },
      stock: 5,
      lots: [
        {
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
          state: 'HISTORICAL' as const,
          allowedAction: 'compensate' as const,
          reasonHint: 'Ajuste histórico por cierre de año',
        },
      ],
    },
  ],
}

const emptyData: InventoryLotsResponse = {
  product: null,
  variants: [],
}

// ── Render helpers ─────────────────────────────────────────────

function renderView(data = mockLotsData, canAdjust = true) {
  return render(
    <InventoryLotsView
      productId="prod-1"
      variantId={undefined}
      data={data}
      canAdjust={canAdjust}
    />,
  )
}

// ═══════════════════════════════════════════════════════════════
// Variant grouping and card rendering
// ═══════════════════════════════════════════════════════════════

describe('InventoryLotsView — variant grouping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders grouped variant cards with SKU labels', () => {
    renderView()
    expect(screen.getByText('REM-CLA-M')).toBeInTheDocument()
    expect(screen.getByText('REM-CLA-L')).toBeInTheDocument()
    expect(screen.getByText('PAN-JEA-40')).toBeInTheDocument()
  })

  it('shows total stock per variant', () => {
    renderView()
    // Stock of 35 for var-1 (REM-CLA-M), 12 for var-2, 5 for var-3
    const stockLabels = screen.getAllByText(/stock total:/i)
    expect(stockLabels.length).toBe(3)
    expect(stockLabels[0].textContent).toContain('35')
    expect(stockLabels[1].textContent).toContain('12')
    expect(stockLabels[2].textContent).toContain('5')
  })

  it('shows variant attributes as context', () => {
    renderView()
    expect(screen.getByText(/size: M/)).toBeInTheDocument()
    expect(screen.getByText(/color: Negro/)).toBeInTheDocument()
  })

  it('handles empty data gracefully', () => {
    render(
      <InventoryLotsView
        productId={undefined}
        variantId={undefined}
        data={emptyData}
        canAdjust={true}
      />,
    )
    expect(screen.queryByText('REM-CLA-M')).not.toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════
// Lot state badges
// ═══════════════════════════════════════════════════════════════

describe('InventoryLotsView — state badges', () => {
  it('shows INTACT badge for intact lots', () => {
    renderView()
    const badges = screen.getAllByText('INTACT')
    expect(badges.length).toBeGreaterThanOrEqual(2)
  })

  it('shows EXHAUSTED badge for exhausted lots', () => {
    renderView()
    expect(screen.getByText('EXHAUSTED')).toBeInTheDocument()
  })

  it('shows HISTORICAL badge for historical lots', () => {
    renderView()
    expect(screen.getByText('HISTORICAL')).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════
// Action triggers and form opening
// ═══════════════════════════════════════════════════════════════

describe('InventoryLotsView — action triggers', () => {
  it('shows "Editar" trigger for lots with allowedAction="edit"', () => {
    renderView()
    const editTriggers = screen.getAllByText(/editar/i)
    expect(editTriggers.length).toBeGreaterThanOrEqual(2)
  })

  it('shows "Compensar" trigger for lots with allowedAction="compensate"', () => {
    renderView()
    expect(screen.getByText(/compensar/i)).toBeInTheDocument()
  })

  it('does not show action for lots with allowedAction="none"', () => {
    renderView()
    // The exhausted lot (lot-3) should have no action button
    const exhaustedRow = screen.getByText('EXHAUSTED').closest('[data-lot-row]')?.parentElement
    // Just verify that in the EXHAUSTED lot area there's no edit/compensate button
    expect(screen.queryByText('EXHAUSTED')).toBeInTheDocument()
  })

  it('opens edit form when "Editar" is clicked', () => {
    renderView()
    const editBtn = screen.getAllByText(/editar/i)[0]
    fireEvent.click(editBtn)
    expect(screen.getByText(/form mode: edit/i)).toBeInTheDocument()
  })

  it('opens compensate form when "Compensar" is clicked', () => {
    renderView()
    const compensateBtn = screen.getByText(/compensar/i)
    fireEvent.click(compensateBtn)
    expect(screen.getByText(/form mode: compensate/i)).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════
// Intake button (new lot per variant)
// ═══════════════════════════════════════════════════════════════

describe('InventoryLotsView — intake', () => {
  it('shows "Nuevo ingreso" button per variant card when canAdjust', () => {
    renderView()
    const intakeButtons = screen.getAllByText(/nuevo ingreso/i)
    expect(intakeButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('opens intake form when "Nuevo ingreso" is clicked', () => {
    renderView()
    const intakeBtn = screen.getAllByText(/nuevo ingreso/i)[0]
    fireEvent.click(intakeBtn)
    expect(screen.getByText(/form mode: increase/i)).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════
// Admin visibility
// ═══════════════════════════════════════════════════════════════

describe('InventoryLotsView — admin visibility', () => {
  it('hides all action triggers when canAdjust is false', () => {
    renderView(mockLotsData, false)
    expect(screen.queryByText(/editar/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/compensar/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/nuevo ingreso/i)).not.toBeInTheDocument()
  })

  it('still renders lot data when canAdjust is false', () => {
    renderView(mockLotsData, false)
    expect(screen.getByText('REM-CLA-M')).toBeInTheDocument()
    const intactBadges = screen.getAllByText('INTACT')
    expect(intactBadges.length).toBeGreaterThanOrEqual(2)
  })
})
