import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Hoisted mocks ─────────────────────────────────────────────────

const { fetchImpl } = vi.hoisted(() => ({
  fetchImpl: vi.fn(),
}))

vi.stubGlobal('fetch', fetchImpl)

// ── Mock dummies ───────────────────────────────────────────────────

vi.mock('@/components/ui/empty-state', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="empty-state">{title}: {description}</div>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: Record<string, unknown>) => (
    <span data-testid="badge" {...props}>{children as React.ReactNode}</span>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: Record<string, unknown>) => (
    <div data-testid="card" {...props}>{children as React.ReactNode}</div>
  ),
  CardContent: ({ children, ...props }: Record<string, unknown>) => (
    <div data-testid="card-content" {...props}>{children as React.ReactNode}</div>
  ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input data-testid="search-input" {...props} />,
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: Record<string, unknown>) => (
    <label {...props}>{children as React.ReactNode}</label>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick, ...props }: Record<string, unknown>) => (
    <button
      data-testid="search-button"
      disabled={disabled as boolean}
      onClick={onClick as () => void}
      {...props}
    >
      {children as React.ReactNode}
    </button>
  ),
}))

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react')
  return {
    ...(actual as Record<string, unknown>),
    Search: ({ className }: { className?: string }) => (
      <span data-testid="search-icon" className={className} />
    ),
    Loader2: ({ className }: { className?: string }) => (
      <span data-testid="loader-icon" className={className} role="status" aria-label="Cargando" />
    ),
  }
})

// ── Import component ───────────────────────────────────────────────

import { ItemSearch } from './item-search'

// ── Helpers ────────────────────────────────────────────────────────

function mockFetchSuccess(data: unknown) {
  fetchImpl.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => data,
  } as Response)
}

function mockFetchError(message = 'Error al buscar') {
  fetchImpl.mockResolvedValueOnce({
    ok: false,
    status: 500,
    json: async () => ({ error: 'ServerError', message }),
  } as Response)
}

function mockFetchNetworkError() {
  fetchImpl.mockRejectedValueOnce(new Error('Connection failed'))
}

function getBuscarButton(): HTMLElement {
  return screen.getByRole('button', { name: /buscar/i })
}

// ── Tests ──────────────────────────────────────────────────────────

describe('ItemSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Rendering ────────────────────────────────────────────────────

  it('renders search input with label and Buscar button', () => {
    render(<ItemSearch />)
    expect(screen.getByTestId('search-input')).toBeInTheDocument()
    expect(screen.getByText('Buscar producto')).toBeInTheDocument()
    expect(getBuscarButton()).toBeInTheDocument()
  })

  it('renders with custom label and placeholder', () => {
    render(<ItemSearch label="Custom Label" placeholder="Custom placeholder" />)
    expect(screen.getByText('Custom Label')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument()
  })

  // ── No auto-search: button is disabled with <2 chars ─────────────

  it('has button disabled when term has less than 2 characters', async () => {
    render(<ItemSearch />)
    const input = screen.getByTestId('search-input')

    // Initial state: empty input → button disabled
    expect(getBuscarButton()).toBeDisabled()

    // Single char → still disabled
    await userEvent.type(input, 'a')
    expect(getBuscarButton()).toBeDisabled()

    // No fetch should be called
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('does not fetch on button click when term < 2', async () => {
    render(<ItemSearch />)
    const input = screen.getByTestId('search-input')
    const button = getBuscarButton()

    await userEvent.type(input, 'a')
    expect(button).toBeDisabled()

    // Click disabled button should not trigger fetch
    await userEvent.click(button)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('enables button when term has 2 or more characters', async () => {
    render(<ItemSearch />)
    const input = screen.getByTestId('search-input')

    await userEvent.type(input, 'SK')
    expect(getBuscarButton()).not.toBeDisabled()
  })

  // ── Search on button click (R4a) ─────────────────────────────────

  it('triggers search on button click (R4a)', async () => {
    mockFetchSuccess([
      { variantId: 'v1', sku: 'SKU-001', productName: 'Test Product', salePrice: 500, presalePrice: null },
    ])

    render(<ItemSearch />)
    const input = screen.getByTestId('search-input')
    const button = getBuscarButton()

    await userEvent.type(input, 'SK')
    await userEvent.click(button)

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('/api/inventory/search?term=SK'),
      expect.objectContaining({ cache: 'no-store' }),
    )
  })

  // ── Search on Enter key (R4b) ────────────────────────────────────

  it('triggers search on Enter key press (R4b)', async () => {
    mockFetchSuccess([
      { variantId: 'v1', sku: 'SKU-001', productName: 'Test Product', salePrice: 500, presalePrice: null },
    ])

    render(<ItemSearch />)
    const input = screen.getByTestId('search-input')

    await userEvent.type(input, 'SK{enter}')

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('/api/inventory/search?term=SK'),
      expect.objectContaining({ cache: 'no-store' }),
    )
  })

  it('does not trigger search on Enter with <2 chars', async () => {
    render(<ItemSearch />)
    const input = screen.getByTestId('search-input')

    await userEvent.type(input, 'a{enter}')

    expect(fetchImpl).not.toHaveBeenCalled()
  })

  // ── Loading state (R7) ───────────────────────────────────────────

  it('shows loading spinner during fetch (R7)', async () => {
    // Create a pending promise that never resolves (keeps loading state active)
    let resolvePromise!: (data: unknown) => void
    const pendingPromise = new Promise<Response>((resolve) => {
      resolvePromise = (data: unknown) => resolve({
        ok: true,
        status: 200,
        json: async () => data,
      } as Response)
    })
    fetchImpl.mockReturnValueOnce(pendingPromise)

    render(<ItemSearch />)
    const input = screen.getByTestId('search-input')
    const button = getBuscarButton()

    await userEvent.type(input, 'SK')
    await userEvent.click(button)

    // Loader icon should be visible while fetch is pending
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument()

    // Button should be disabled during loading
    expect(button).toBeDisabled()

    // Resolve the promise to clean up
    resolvePromise([{ variantId: 'v1', sku: 'SKU-001', productName: 'A', salePrice: 10, presalePrice: null }])

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument()
    })
  })

  // ── Search results display ───────────────────────────────────────

  it('shows empty state when no results found', async () => {
    mockFetchSuccess([])

    render(<ItemSearch />)
    const input = screen.getByTestId('search-input')
    const button = getBuscarButton()

    await userEvent.type(input, 'zzz')
    await userEvent.click(button)

    const emptyEl = await screen.findByTestId('empty-state')
    expect(emptyEl).toHaveTextContent('Sin resultados')
  })

  it('shows error state when fetch fails', async () => {
    mockFetchError('Server error message')

    render(<ItemSearch />)
    const input = screen.getByTestId('search-input')
    const button = getBuscarButton()

    await userEvent.type(input, 'err')
    await userEvent.click(button)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Server error message')
  })

  it('shows error on network failure', async () => {
    mockFetchNetworkError()

    render(<ItemSearch />)
    const input = screen.getByTestId('search-input')
    const button = getBuscarButton()

    await userEvent.type(input, 'net')
    await userEvent.click(button)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Error de conexión')
  })

  it('shows search results with product name, SKU, and price', async () => {
    mockFetchSuccess([
      { variantId: 'v1', sku: 'SKU-001', productName: 'Product A', salePrice: 1500, presalePrice: null, stock: 10 },
    ])

    render(<ItemSearch />)
    const input = screen.getByTestId('search-input')
    const button = getBuscarButton()

    await userEvent.type(input, 'SKU')
    await userEvent.click(button)

    expect(await screen.findByText('Product A')).toBeInTheDocument()
    expect(await screen.findByText('SKU-001')).toBeInTheDocument()
    expect(await screen.findByText(/S\/\s*1[,.]500[,.]00/)).toBeInTheDocument()
  })

  it('replaces previous results on subsequent search', async () => {
    mockFetchSuccess([
      { variantId: 'v1', sku: 'SKU-001', productName: 'Product A', salePrice: 500, presalePrice: null },
    ])

    render(<ItemSearch />)
    const input = screen.getByTestId('search-input')
    const button = getBuscarButton()

    // First search
    await userEvent.type(input, 'SKU')
    await userEvent.click(button)
    expect(await screen.findByText('Product A')).toBeInTheDocument()

    // Second search with different term replaces results
    fetchImpl.mockClear()
    mockFetchSuccess([
      { variantId: 'v2', sku: 'SKU-002', productName: 'Product B', salePrice: 300, presalePrice: null },
    ])

    await userEvent.clear(input)
    await userEvent.type(input, 'XYZ')
    await userEvent.click(button)

    expect(await screen.findByText('Product B')).toBeInTheDocument()
    expect(screen.queryByText('Product A')).not.toBeInTheDocument()
  })

  // ── onSelect callback ────────────────────────────────────────────

  it('calls onSelect when a result card is clicked', async () => {
    const onSelect = vi.fn()
    mockFetchSuccess([
      { variantId: 'v1', sku: 'SKU-001', productName: 'Product A', salePrice: 500, presalePrice: null },
    ])

    render(<ItemSearch onSelect={onSelect} />)
    const input = screen.getByTestId('search-input')
    const button = getBuscarButton()

    await userEvent.type(input, 'SKU')
    await userEvent.click(button)

    const cards = await screen.findAllByTestId('card')
    await userEvent.click(cards[0]!)

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ variantId: 'v1', productName: 'Product A' }),
    )
  })

  // ── Error is cleared on successful subsequent search ─────────────

  it('clears previous error on successful search', async () => {
    mockFetchError('Initial error')

    render(<ItemSearch />)
    const input = screen.getByTestId('search-input')
    const button = getBuscarButton()

    await userEvent.type(input, 'err')
    await userEvent.click(button)

    expect(await screen.findByRole('alert')).toHaveTextContent('Initial error')

    // Successful search should clear error
    mockFetchSuccess([
      { variantId: 'v1', sku: 'SKU-001', productName: 'OK', salePrice: 10, presalePrice: null },
    ])

    await userEvent.clear(input)
    await userEvent.type(input, 'OK')
    await userEvent.click(button)

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
    expect(await screen.findByText('OK')).toBeInTheDocument()
  })
})
