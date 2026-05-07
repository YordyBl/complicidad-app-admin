/**
 * Integration tests for PurchaseForm cart model.
 *
 * Tests cart operations: add item, duplicate variant merge,
 * remove item, update quantity, update unit cost, running total,
 * and submit behavior.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Hoisted mocks ───────────────────────────────────────────────

const { mockRegisterPurchaseAction, mockHandleItemSelect } = vi.hoisted(() => ({
  mockRegisterPurchaseAction: vi.fn(),
  mockHandleItemSelect: vi.fn(),
}))

vi.mock('@/shared/api/formatters', () => ({
  formatCurrency: (cents: number) => `S/${(cents / 100).toFixed(2)}`,
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react').createElement('a', { href, ...props }, children)
  },
}))

// ── Mock UI components ─────────────────────────────────────────

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick, type, ...props }: Record<string, unknown>) => {
    const btnType = ((type as string) || 'button') as 'button' | 'reset' | 'submit'
    // Filter out shadcn-specific props that should not be passed to DOM
    const { asChild: _, variant: _v, size: _s, ...htmlProps } = props
    return (
      <button
        data-testid="button"
        disabled={disabled as boolean}
        onClick={onClick as () => void}
        type={btnType}
        {...htmlProps}
      >
        {children as React.ReactNode}
      </button>
    )
  },
  buttonVariants: () => '',
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => {
    const { 'data-testid': testId, ...rest } = props
    return <input data-testid={testId ? String(testId) : 'input'} {...rest} />
  },
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: Record<string, unknown>) => (
    <label {...props}>{children as React.ReactNode}</label>
  ),
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: Record<string, unknown>) => (
    <textarea data-testid="textarea" {...props} />
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: Record<string, unknown>) => (
    <div data-testid="card" {...props}>{children as React.ReactNode}</div>
  ),
  CardContent: ({ children, ...props }: Record<string, unknown>) => (
    <div data-testid="card-content" {...props}>{children as React.ReactNode}</div>
  ),
  CardHeader: ({ children, ...props }: Record<string, unknown>) => (
    <div data-testid="card-header" {...props}>{children as React.ReactNode}</div>
  ),
  CardTitle: ({ children }: Record<string, unknown>) => (
    <div data-testid="card-title">{children as React.ReactNode}</div>
  ),
  CardDescription: ({ children }: Record<string, unknown>) => (
    <div data-testid="card-description">{children as React.ReactNode}</div>
  ),
}))

vi.mock('@/components/ui/form-field-error', () => ({
  FormFieldError: ({ message }: { message?: string | null }) =>
    message ? <div data-testid="form-error" role="alert">{message}</div> : null,
}))

vi.mock('@/components/ui/success-receipt', () => ({
  SuccessReceipt: ({ title, children }: { title?: string; children?: React.ReactNode }) => (
    <div data-testid="success-receipt">
      <h3>{title}</h3>
      {children}
    </div>
  ),
}))

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react')
  return {
    ...(actual as Record<string, unknown>),
    Save: () => <span data-testid="save-icon" />,
    ArrowLeft: () => <span data-testid="arrow-left-icon" />,
    Trash2: () => <span data-testid="trash-icon" />,
    Plus: () => <span data-testid="plus-icon" />,
  }
})

// ── Mock ItemSearch ────────────────────────────────────────────

vi.mock('./item-search', () => ({
  ItemSearch: ({ onSelect }: { onSelect?: (item: Record<string, unknown>) => void }) => {
    // Expose onSelect for tests to trigger
    mockHandleItemSelect.mockImplementation(onSelect || (() => {}))
    return (
      <div data-testid="item-search">
        <button
          data-testid="mock-search-result"
          onClick={() =>
            onSelect?.({
              variantId: 'var-1',
              sku: 'REM-CLA-M',
              productName: 'Remera Classic',
              salePrice: 250,
              presalePrice: null,
              stock: 10,
            })
          }
        >
          Select Remera Classic
        </button>
        <button
          data-testid="mock-search-result-2"
          onClick={() =>
            onSelect?.({
              variantId: 'var-2',
              sku: 'PAN-JEA-40',
              productName: 'Pantalón Jean',
              salePrice: 450,
              presalePrice: null,
              stock: 5,
            })
          }
        >
          Select Pantalón Jean
        </button>
      </div>
    )
  },
}))

// ── Mock server action ─────────────────────────────────────────

vi.mock('./inventory-actions', () => ({
  registerPurchaseAction: mockRegisterPurchaseAction,
}))

// ── Import component under test ────────────────────────────────

import { PurchaseForm } from './purchase-form'

// ── Helpers ────────────────────────────────────────────────────

function mockSubmitSuccess() {
  mockRegisterPurchaseAction.mockResolvedValueOnce({
    success: true,
    data: { purchaseId: 'purch-1' },
  })
}

function mockSubmitError(message: string) {
  mockRegisterPurchaseAction.mockResolvedValueOnce({
    success: false,
    error: message,
  })
}

/** Helper to click the "Agregar al lote" button after item selection. */
async function clickAddToLot() {
  const addButton = screen.getByRole('button', { name: /agregar al lote/i })
  await userEvent.click(addButton)
}

async function selectFirstItem() {
  await userEvent.click(screen.getByTestId('mock-search-result'))
}

async function selectSecondItem() {
  await userEvent.click(screen.getByTestId('mock-search-result-2'))
}

function getQuantityInput(cartItemIndex: number): HTMLInputElement {
  const inputs = screen.getAllByTestId(/cart-qty-/) as HTMLInputElement[]
  return inputs[cartItemIndex]
}

function getUnitCostInput(cartItemIndex: number): HTMLInputElement {
  const inputs = screen.getAllByTestId(/cart-cost-/) as HTMLInputElement[]
  return inputs[cartItemIndex]
}

/**
 * Helper: change a controlled input value.
 * Uses fireEvent.change pattern compatible with React controlled inputs.
 * userEvent.clear + type does not work reliably because the controlled
 * input re-renders the old value between clear and type events.
 */
function setInputValue(input: HTMLInputElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set
  nativeInputValueSetter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

// ═══════════════════════════════════════════════════════════════

describe('PurchaseForm — cart model', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Rendering ────────────────────────────────────────────────

  it('renders search section, empty cart message, and disabled submit', () => {
    render(<PurchaseForm />)

    expect(screen.getByTestId('item-search')).toBeInTheDocument()
    // Card title
    expect(screen.getByTestId('card-title')).toHaveTextContent(/registrar compra/i)
    // Empty cart message
    expect(screen.getByText(/buscá y agregá productos/i)).toBeInTheDocument()
    // Submit should be disabled when cart is empty
    const submitButton = screen.getByRole('button', { name: /registrar compra/i })
    expect(submitButton).toBeDisabled()
  })

  // ── Add item to cart ─────────────────────────────────────────

  it('adds an item to cart when item is selected and "Agregar al lote" is clicked', async () => {
    render(<PurchaseForm />)

    await selectFirstItem()
    await clickAddToLot()

    expect(screen.getByText('Remera Classic')).toBeInTheDocument()
    expect(screen.getByText('REM-CLA-M')).toBeInTheDocument()
  })

  // ── Duplicate variant merges quantity ────────────────────────

  it('merges quantity when same variant is added twice', async () => {
    render(<PurchaseForm />)

    await selectFirstItem()
    await clickAddToLot()
    await selectFirstItem()
    await clickAddToLot()

    // Should only have one cart item row
    const productLabels = screen.getAllByText('Remera Classic')
    expect(productLabels).toHaveLength(1)

    // Quantity should be 2 (1 + 1)
    const qtyInput = getQuantityInput(0)
    expect(Number(qtyInput.value)).toBe(2)
  })

  // ── Add multiple different variants ──────────────────────────

  it('shows multiple items when different variants are added', async () => {
    render(<PurchaseForm />)

    await selectFirstItem()
    await clickAddToLot()
    await selectSecondItem()
    await clickAddToLot()

    expect(screen.getByText('Remera Classic')).toBeInTheDocument()
    expect(screen.getByText('Pantalón Jean')).toBeInTheDocument()
  })

  // ── Remove item from cart ────────────────────────────────────

  it('removes an item from cart when remove button is clicked', async () => {
    render(<PurchaseForm />)

    await selectFirstItem()
    await clickAddToLot()
    await selectSecondItem()
    await clickAddToLot()

    expect(screen.getByText('Remera Classic')).toBeInTheDocument()
    expect(screen.getByText('Pantalón Jean')).toBeInTheDocument()

    // Remove first item (click first trash button)
    const removeButtons = screen.getAllByTestId('trash-icon')
    await userEvent.click(removeButtons[0])

    expect(screen.queryByText('Remera Classic')).not.toBeInTheDocument()
    expect(screen.getByText('Pantalón Jean')).toBeInTheDocument()
  })

  // ── Update quantity ──────────────────────────────────────────

  it('allows updating quantity per cart item', async () => {
    render(<PurchaseForm />)

    await selectFirstItem()
    await clickAddToLot()

    const qtyInput = getQuantityInput(0)
    setInputValue(qtyInput, '5')

    await waitFor(() => {
      expect(Number(qtyInput.value)).toBe(5)
    })
  })

  // ── Update unit cost ─────────────────────────────────────────

  it('allows updating unit cost per cart item', async () => {
    render(<PurchaseForm />)

    await selectFirstItem()
    await clickAddToLot()

    const costInput = getUnitCostInput(0)
    setInputValue(costInput, '350')

    await waitFor(() => {
      expect(Number(costInput.value)).toBe(350)
    })
  })

  // ── Running total ────────────────────────────────────────────

  it('calculates running total from cart items', async () => {
    render(<PurchaseForm />)

    // Add first item with default qty=1, unitCost=250
    await selectFirstItem()
    await clickAddToLot()

    // Set quantity=3, unitCost=500 → subtotal 1500
    const qtyInput1 = getQuantityInput(0)
    setInputValue(qtyInput1, '3')

    const costInput1 = getUnitCostInput(0)
    setInputValue(costInput1, '500')

    // Add second item
    await selectSecondItem()
    await clickAddToLot()

    // Set quantity=2, unitCost=300 → subtotal 600
    const qtyInput2 = getQuantityInput(1)
    setInputValue(qtyInput2, '2')

    const costInput2 = getUnitCostInput(1)
    setInputValue(costInput2, '300')

    // Total should be 1500 + 600 = 2100
    // formatCurrency(210000) = S/2100.00
    await waitFor(() => {
      expect(screen.getByText(/S\/2100\.00/)).toBeInTheDocument()
    })
  })

  // ── Empty cart blocks submit ─────────────────────────────────

  it('disables submit button when cart is empty', () => {
    render(<PurchaseForm />)

    const submitButton = screen.getByRole('button', { name: /registrar compra/i })
    expect(submitButton).toBeDisabled()
  })

  it('enables submit button when cart has items', async () => {
    render(<PurchaseForm />)

    await selectFirstItem()
    await clickAddToLot()

    const submitButton = screen.getByRole('button', { name: /registrar compra/i })
    expect(submitButton).not.toBeDisabled()
  })

  // ── Submit with valid cart ───────────────────────────────────

  it('submits cart items as JSON to server action', async () => {
    mockSubmitSuccess()
    render(<PurchaseForm />)

    await selectFirstItem()
    await clickAddToLot()

    // Set quantity=2, unitCost=500
    const qtyInput = getQuantityInput(0)
    setInputValue(qtyInput, '2')

    const costInput = getUnitCostInput(0)
    setInputValue(costInput, '500')

    // Submit
    const submitButton = screen.getByRole('button', { name: /registrar compra/i })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(mockRegisterPurchaseAction).toHaveBeenCalled()
    })

    const callArgs = mockRegisterPurchaseAction.mock.calls[0]
    expect(callArgs[0]).toBeNull()
    const formData = callArgs[1] as FormData
    const itemsJson = formData.get('items') as string
    const items = JSON.parse(itemsJson)
    expect(items).toEqual([
      { variantId: 'var-1', quantity: 2, unitCost: 500 },
    ])
  })

  // ── Shows success state after submission ─────────────────────

  it('shows success receipt after successful submission', async () => {
    mockSubmitSuccess()
    render(<PurchaseForm />)

    await selectFirstItem()
    await clickAddToLot()

    const submitButton = screen.getByRole('button', { name: /registrar compra/i })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByTestId('success-receipt')).toBeInTheDocument()
    })

    expect(screen.getByText('Compra registrada')).toBeInTheDocument()
  })

  // ── Shows error on server failure ────────────────────────────

  it('shows server error message on failed submission', async () => {
    mockSubmitError('El proveedor no existe.')
    render(<PurchaseForm />)

    await selectFirstItem()
    await clickAddToLot()

    const submitButton = screen.getByRole('button', { name: /registrar compra/i })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('El proveedor no existe.')
    })
  })

  // ── Duplicate submit protection ──────────────────────────────

  it('prevents duplicate submissions while submitting', async () => {
    // Create a promise that stays pending to keep submitting state active
    let resolvePromise!: (value: unknown) => void
    mockRegisterPurchaseAction.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve
      }),
    )

    render(<PurchaseForm />)

    await selectFirstItem()
    await clickAddToLot()

    const submitButton = screen.getByRole('button', { name: /registrar compra/i })
    expect(submitButton).not.toBeDisabled()

    await userEvent.click(submitButton)

    // Button should be disabled during submission (pending promise)
    await waitFor(() => {
      expect(submitButton).toBeDisabled()
    })

    // Resolve the promise — since registerPurchaseAction returns success,
    // the form transitions to the success receipt (form is replaced)
    resolvePromise({ success: true, data: {} })
    await waitFor(() => {
      expect(screen.getByTestId('success-receipt')).toBeInTheDocument()
    })
  })
})
