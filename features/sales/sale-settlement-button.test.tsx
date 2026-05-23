import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'

const { mockSettleSaleBalanceAction } = vi.hoisted(() => ({
  mockSettleSaleBalanceAction: vi.fn(),
}))

vi.mock('./sales-actions', () => ({
  settleSaleBalanceAction: mockSettleSaleBalanceAction,
}))

// Simplified AlertDialog mock — renders all children unconditionally.
// Real AlertDialog conditionally renders content via portal, but for
// unit tests we verify behavior (callbacks, render/not-render, state).
vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: Record<string, unknown>) =>
    require('react').createElement('div', { 'data-testid': 'alert-dialog' }, children),
  AlertDialogAction: ({ children, onClick, disabled }: Record<string, unknown>) =>
    require('react').createElement('button', {
      'data-testid': 'alert-dialog-action',
      onClick,
      disabled,
    }, children),
  AlertDialogCancel: ({ children, onClick, disabled }: Record<string, unknown>) =>
    require('react').createElement('button', {
      'data-testid': 'alert-dialog-cancel',
      onClick,
      disabled,
    }, children),
  AlertDialogContent: ({ children }: Record<string, unknown>) =>
    require('react').createElement('div', { 'data-testid': 'alert-dialog-content' }, children),
  AlertDialogDescription: ({ children }: Record<string, unknown>) =>
    require('react').createElement('p', { 'data-testid': 'alert-dialog-description' }, children),
  AlertDialogFooter: ({ children }: Record<string, unknown>) =>
    require('react').createElement('div', { 'data-testid': 'alert-dialog-footer' }, children),
  AlertDialogHeader: ({ children }: Record<string, unknown>) =>
    require('react').createElement('div', { 'data-testid': 'alert-dialog-header' }, children),
  AlertDialogTitle: ({ children }: Record<string, unknown>) =>
    require('react').createElement('h2', { 'data-testid': 'alert-dialog-title' }, children),
  AlertDialogTrigger: ({ children, asChild, ...props }: Record<string, unknown>) =>
    require('react').createElement('button', {
      'data-testid': 'alert-dialog-trigger',
      ...props,
    }, children),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick, className, variant, size, ...props }: Record<string, unknown>) =>
    require('react').createElement('button', {
      disabled,
      onClick,
      'data-testid': 'settlement-button',
      ...props,
    }, children),
}))

vi.mock('@/shared/api/formatters', () => ({
  formatCurrency: (cents: number) => `S/ ${(cents / 100).toFixed(2)}`,
}))

vi.mock('lucide-react', () => ({
  Wallet: () => require('react').createElement('span', { 'data-testid': 'wallet-icon' }),
  Loader2: () => require('react').createElement('span', { 'data-testid': 'loader-icon' }),
}))

import { SaleSettlementButton } from './sale-settlement-button'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SaleSettlementButton', () => {
  it('renderiza el botón cuando canSettleBalance es true', () => {
    render(
      <SaleSettlementButton
        saleId="sale-1"
        canSettleBalance={true}
        pendingBalanceCents={50000}
      />,
    )

    // The trigger button should be rendered inside the dialog
    const trigger = screen.getByTestId('alert-dialog-trigger')
    expect(trigger).toBeInTheDocument()
  })

  it('no renderiza el botón cuando canSettleBalance es false', () => {
    render(
      <SaleSettlementButton
        saleId="sale-1"
        canSettleBalance={false}
        pendingBalanceCents={0}
      />,
    )

    expect(screen.queryByTestId('alert-dialog-trigger')).not.toBeInTheDocument()
    expect(screen.queryByText(/liquidar saldo/i)).not.toBeInTheDocument()
  })

  it('no renderiza el botón cuando pendingBalanceCents es 0', () => {
    render(
      <SaleSettlementButton
        saleId="sale-1"
        canSettleBalance={true}
        pendingBalanceCents={0}
      />,
    )

    expect(screen.queryByTestId('alert-dialog-trigger')).not.toBeInTheDocument()
  })

  it('muestra el monto pendiente en el botón', () => {
    render(
      <SaleSettlementButton
        saleId="sale-1"
        canSettleBalance={true}
        pendingBalanceCents={75000}
      />,
    )

    // The button shows the amount being settled (may appear in trigger + dialog content)
    const matches = screen.getAllByText(/S\/ 750\.00/i)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('muestra el diálogo de confirmación con título y monto', () => {
    render(
      <SaleSettlementButton
        saleId="sale-1"
        canSettleBalance={true}
        pendingBalanceCents={50000}
      />,
    )

    // Dialog content (title + description) should be in the DOM
    expect(screen.getByTestId('alert-dialog-title')).toHaveTextContent(/liquidar saldo/i)
    expect(screen.getByTestId('alert-dialog-description')).toHaveTextContent(/S\/ 500\.00/)
  })

  it('llama a settleSaleBalanceAction al confirmar y oculta el botón tras éxito', async () => {
    mockSettleSaleBalanceAction.mockResolvedValueOnce({ success: true })

    const user = userEvent.setup()

    const { rerender } = render(
      <SaleSettlementButton
        saleId="sale-1"
        canSettleBalance={true}
        pendingBalanceCents={50000}
      />,
    )

    // Confirm via the action button
    await user.click(screen.getByTestId('alert-dialog-action'))

    await waitFor(() => {
      expect(mockSettleSaleBalanceAction).toHaveBeenCalledWith('sale-1')
    })

    // After success, the button should be removed from DOM (settled=true)
    await waitFor(() => {
      expect(screen.queryByTestId('alert-dialog-trigger')).not.toBeInTheDocument()
    })
  })

  it('muestra mensaje de error cuando la acción falla', async () => {
    mockSettleSaleBalanceAction.mockResolvedValueOnce({
      success: false,
      error: 'No se pudo liquidar el saldo.',
    })

    const user = userEvent.setup()

    render(
      <SaleSettlementButton
        saleId="sale-1"
        canSettleBalance={true}
        pendingBalanceCents={50000}
      />,
    )

    await user.click(screen.getByTestId('alert-dialog-action'))

    await waitFor(() => {
      expect(mockSettleSaleBalanceAction).toHaveBeenCalledWith('sale-1')
    })

    // Error should be displayed in an alert role element
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('No se pudo liquidar el saldo.')
    })

    // Button should still be visible (settlement failed, settled still false)
    expect(screen.getByTestId('alert-dialog-trigger')).toBeInTheDocument()
  })

  it('no llama a la acción al cancelar', async () => {
    const user = userEvent.setup()

    render(
      <SaleSettlementButton
        saleId="sale-1"
        canSettleBalance={true}
        pendingBalanceCents={50000}
      />,
    )

    // Cancel
    await user.click(screen.getByTestId('alert-dialog-cancel'))

    // Action should NOT have been called
    expect(mockSettleSaleBalanceAction).not.toHaveBeenCalled()

    // Button should still be visible
    expect(screen.getByTestId('alert-dialog-trigger')).toBeInTheDocument()
  })
})
