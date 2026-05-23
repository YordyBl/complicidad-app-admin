import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'

const { mockCreateSaleAction } = vi.hoisted(() => ({
  mockCreateSaleAction: vi.fn(),
}))

vi.mock('./sales-actions', () => ({
  createSaleAction: mockCreateSaleAction,
}))

vi.mock('./customer-search', () => ({
  CustomerSearch: ({ onSelect }: { onSelect: (c: { id: string; name: string }) => void }) =>
    require('react').createElement('div', { 'data-testid': 'customer-search' },
      require('react').createElement('button', {
        'data-testid': 'select-customer',
        type: 'button',
        onClick: () => onSelect({ id: 'cust-1', name: 'Test Customer' }),
      }, 'Select Customer'),
    ),
}))

vi.mock('@/features/inventory/item-search', () => ({
  ItemSearch: ({ onSelect }: { onSelect: (item: Record<string, unknown>) => void }) =>
    require('react').createElement('div', { 'data-testid': 'item-search' },
      require('react').createElement('button', {
        'data-testid': 'add-item',
        type: 'button',
        onClick: () => onSelect({
          variantId: 'var-1',
          sku: 'SKU001',
          productName: 'Test Product',
          salePrice: 100,
          presalePrice: null,
        }),
      }, 'Add Item'),
    ),
}))

vi.mock('@/components/ui/alert-dialog', () => {
  const React = require('react')
  return {
    AlertDialog: ({ children }: Record<string, unknown>) =>
      React.createElement('div', { 'data-testid': 'alert-dialog' }, children),
    AlertDialogAction: ({ children, onClick, disabled }: Record<string, unknown>) =>
      React.createElement('button', { 'data-testid': 'alert-dialog-action', onClick, disabled }, children),
    AlertDialogCancel: ({ children, onClick, disabled }: Record<string, unknown>) =>
      React.createElement('button', { 'data-testid': 'alert-dialog-cancel', onClick, disabled }, children),
    AlertDialogContent: ({ children }: Record<string, unknown>) =>
      React.createElement('div', { 'data-testid': 'alert-dialog-content' }, children),
    AlertDialogDescription: ({ children }: Record<string, unknown>) =>
      React.createElement('p', { 'data-testid': 'alert-dialog-description' }, children),
    AlertDialogFooter: ({ children }: Record<string, unknown>) =>
      React.createElement('div', { 'data-testid': 'alert-dialog-footer' }, children),
    AlertDialogHeader: ({ children }: Record<string, unknown>) =>
      React.createElement('div', { 'data-testid': 'alert-dialog-header' }, children),
    AlertDialogTitle: ({ children }: Record<string, unknown>) =>
      React.createElement('h2', { 'data-testid': 'alert-dialog-title' }, children),
    AlertDialogTrigger: ({ children, asChild, ...props }: Record<string, unknown>) =>
      React.createElement('button', { 'data-testid': 'alert-dialog-trigger', ...props }, children),
  }
})

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick, type, variant, size, asChild, className, ...props }: Record<string, unknown>) => {
    const React = require('react')
    if (asChild) {
      // For asChild (Link wrapper), just render children in a span
      return React.createElement('span', { 'data-testid': 'button-as-child', ...props }, children)
    }
    return React.createElement('button', {
      disabled,
      onClick,
      type: type || 'button',
      'data-testid': variant === 'ghost' ? 'remove-item-btn' : 'submit-sale-btn',
      ...props,
    }, children)
  },
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange, disabled }: Record<string, unknown>) =>
    require('react').createElement('div', { 'data-testid': 'channel-select', 'data-value': value }, children),
  SelectContent: ({ children }: Record<string, unknown>) =>
    require('react').createElement('div', { 'data-testid': 'select-content' }, children),
  SelectItem: ({ children, value }: Record<string, unknown>) =>
    require('react').createElement('div', { 'data-testid': `select-item-${value}` }, children),
  SelectTrigger: ({ children, id, disabled }: Record<string, unknown>) =>
    require('react').createElement('button', { 'data-testid': 'select-trigger', id, disabled }, children),
  SelectValue: ({ placeholder }: Record<string, unknown>) =>
    require('react').createElement('span', {}, placeholder || ''),
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ type, value, onChange, className, min, max, disabled, id, placeholder }: Record<string, unknown>) =>
    require('react').createElement('input', {
      type: type || 'text',
      value: value ?? '',
      onChange,
      className,
      min,
      max,
      disabled,
      id,
      placeholder,
      'data-testid': id || 'input',
    }),
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, className }: Record<string, unknown>) =>
    require('react').createElement('label', { htmlFor, className, 'data-testid': 'label' }, children),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: Record<string, unknown>) =>
    require('react').createElement('div', { 'data-testid': 'card' }, children),
  CardContent: ({ children, className }: Record<string, unknown>) =>
    require('react').createElement('div', { 'data-testid': 'card-content', className }, children),
  CardDescription: ({ children }: Record<string, unknown>) =>
    require('react').createElement('p', { 'data-testid': 'card-description' }, children),
  CardHeader: ({ children }: Record<string, unknown>) =>
    require('react').createElement('div', { 'data-testid': 'card-header' }, children),
  CardTitle: ({ children, className }: Record<string, unknown>) =>
    require('react').createElement('h3', { 'data-testid': 'card-title', className }, children),
}))

vi.mock('@/components/ui/form-field-error', () => ({
  FormFieldError: ({ message }: { message?: string }) =>
    message ? require('react').createElement('p', { 'data-testid': 'field-error' }, message) : null,
}))

vi.mock('@/components/ui/success-receipt', () => ({
  SuccessReceipt: ({ children, title }: Record<string, unknown>) =>
    require('react').createElement('div', { 'data-testid': 'success-receipt' },
      require('react').createElement('h2', {}, title as string),
      children,
    ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: Record<string, unknown>) =>
    require('react').createElement('span', { 'data-testid': 'badge', className }, children),
}))

vi.mock('@/shared/api/formatters', () => ({
  formatCurrency: (cents: number) => `S/ ${(cents / 100).toFixed(2)}`,
}))

vi.mock('lucide-react', () => ({
  Save: () => require('react').createElement('span', { 'data-testid': 'save-icon' }),
  ArrowLeft: () => require('react').createElement('span', { 'data-testid': 'arrow-left-icon' }),
  Plus: () => require('react').createElement('span', { 'data-testid': 'plus-icon' }),
  Trash2: () => require('react').createElement('span', { 'data-testid': 'trash-icon' }),
  AlertTriangle: () => require('react').createElement('span', { 'data-testid': 'alert-icon' }),
}))

import { SaleForm } from './sale-form'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SaleForm — payment fields', () => {
  it('muestra el campo de pago inicial cuando hay items en el carrito', async () => {
    const user = userEvent.setup()
    render(<SaleForm />)

    // Initially no cart items, payment fields should not be visible
    expect(screen.queryByPlaceholderText('0.00')).not.toBeInTheDocument()

    // Add an item to cart
    await user.click(screen.getByTestId('select-customer'))
    await user.click(screen.getByTestId('add-item'))

    // Payment field should now be visible
    await waitFor(() => {
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument()
    })
  })

  it('muestra el checkbox "Pagar total" y lo sincroniza con el total', async () => {
    const user = userEvent.setup()
    render(<SaleForm />)

    // Add customer and item
    await user.click(screen.getByTestId('select-customer'))
    await user.click(screen.getByTestId('add-item'))

    // Full payment checkbox should be visible
    const fullPaymentCheckbox = await screen.findByLabelText('Pagar total')
    expect(fullPaymentCheckbox).toBeInTheDocument()
    expect(fullPaymentCheckbox).not.toBeChecked()

    // Check "Pagar total" — amount paid should sync to cart total (1 x 100 = S/ 100.00)
    await user.click(fullPaymentCheckbox)
    expect(fullPaymentCheckbox).toBeChecked()

    const amountInput = screen.getByPlaceholderText('0.00') as HTMLInputElement
    expect(amountInput.value).toBe('100.00')
  })

  it('muestra el saldo pendiente derivado del pago inicial', async () => {
    const user = userEvent.setup()
    render(<SaleForm />)

    await user.click(screen.getByTestId('select-customer'))
    await user.click(screen.getByTestId('add-item'))

    // Enter partial payment: 60 soles
    const amountInput = screen.getByPlaceholderText('0.00') as HTMLInputElement
    await user.clear(amountInput)
    await user.type(amountInput, '60')

    // Pending balance should show: S/ 100.00 - S/ 60.00 = S/ 40.00
    await waitFor(() => {
      expect(screen.getByText(/Pendiente/)).toBeInTheDocument()
      expect(screen.getByText(/40\.00/)).toBeInTheDocument()
    })
  })

  it('limpia el pago inicial cuando el checkbox se desmarca', async () => {
    const user = userEvent.setup()
    render(<SaleForm />)

    await user.click(screen.getByTestId('select-customer'))
    await user.click(screen.getByTestId('add-item'))

    // Check full payment
    const fullPaymentCheckbox = screen.getByLabelText('Pagar total')
    await user.click(fullPaymentCheckbox)

    const amountInput = screen.getByPlaceholderText('0.00') as HTMLInputElement
    expect(amountInput.value).toBe('100.00')

    // Uncheck — amount should clear
    await user.click(fullPaymentCheckbox)
    expect(amountInput.value).toBe('')
  })

  it('incluye amountPaidNowCents y totalCents en el FormData al enviar', async () => {
    mockCreateSaleAction.mockResolvedValueOnce({ success: true })
    const user = userEvent.setup()
    render(<SaleForm />)

    await user.click(screen.getByTestId('select-customer'))
    await user.click(screen.getByTestId('add-item'))

    // Set partial payment: 60 soles
    const amountInput = screen.getByPlaceholderText('0.00') as HTMLInputElement
    await user.clear(amountInput)
    await user.type(amountInput, '60')

    // Submit
    await user.click(screen.getByTestId('submit-sale-btn'))

    await waitFor(() => {
      expect(mockCreateSaleAction).toHaveBeenCalled()
      const [_prevState, formData] = mockCreateSaleAction.mock.calls[0]
      // FormData is the second argument (a real FormData instance)
      expect(formData.get('amountPaidNowCents')).toBe('6000')   // 60 soles = 6000 cents
      expect(formData.get('totalCents')).toBe('10000')           // 100 soles = 10000 cents
    })
  })

  it('re-sincroniza el pago cuando el total del carrito cambia estando activo "Pagar total"', async () => {
    const user = userEvent.setup()
    render(<SaleForm />)

    await user.click(screen.getByTestId('select-customer'))

    // Add first item — total = 100 soles
    await user.click(screen.getByTestId('add-item'))

    // Check "Pagar total" → amount should sync to 100.00
    const fullPaymentCheckbox = screen.getByLabelText('Pagar total')
    await user.click(fullPaymentCheckbox)
    const amountInput = screen.getByPlaceholderText('0.00') as HTMLInputElement
    expect(amountInput.value).toBe('100.00')

    // Add another unit of the same item → total becomes 200.00
    await user.click(screen.getByTestId('add-item'))

    // Paid amount MUST re-sync to the new total (200.00)
    await waitFor(() => {
      expect(amountInput.value).toBe('200.00')
    })

    // Checkbox stays checked
    expect(fullPaymentCheckbox).toBeChecked()
  })

  it('envía amountPaidNowCents=0 cuando no se ingresa pago', async () => {
    mockCreateSaleAction.mockResolvedValueOnce({ success: true })
    const user = userEvent.setup()
    render(<SaleForm />)

    await user.click(screen.getByTestId('select-customer'))
    await user.click(screen.getByTestId('add-item'))

    // Don't touch payment field — submit with no payment
    await user.click(screen.getByTestId('submit-sale-btn'))

    await waitFor(() => {
      expect(mockCreateSaleAction).toHaveBeenCalled()
      const [_prevState, formData] = mockCreateSaleAction.mock.calls[0]
      // When no payment entered, amountPaidNowCents should be empty or "0"
      const val = formData.get('amountPaidNowCents')
      expect(val === '0' || val === '' || val === null).toBeTruthy()
    })
  })
})
