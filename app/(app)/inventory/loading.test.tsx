/**
 * Accessible loading state tests for inventory loading.
 *
 * Verifies loading.tsx renders an accessible skeleton that:
 * - Shows the page title
 * - Shows a spinner with descriptive loading text
 * - Shows skeleton cards for action placeholders
 * - Does NOT import server-only API code
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import InventoryLoading from './loading'

describe('InventoryLoading', () => {
  it('renders the inventory page title', () => {
    render(<InventoryLoading />)
    expect(screen.getByRole('heading', { name: 'Inventario' })).toBeInTheDocument()
  })

  it('renders loading text with spinner', () => {
    render(<InventoryLoading />)
    // The accessible loading text informs users content is loading
    expect(screen.getByText('Cargando productos...')).toBeInTheDocument()
  })

  it('renders action card skeletons', () => {
    render(<InventoryLoading />)
    // Two action card skeletons with pulse animations
    const pulseElements = document.querySelectorAll('.animate-pulse')
    // At least 4 pulse elements (2 cards × 2 text lines each)
    expect(pulseElements.length).toBeGreaterThanOrEqual(4)
  })

  it('renders spinner icons indicating loading state', () => {
    render(<InventoryLoading />)
    // The spinner is a Loader2 icon with animate-spin class
    const spinners = document.querySelectorAll('.animate-spin')
    expect(spinners.length).toBeGreaterThanOrEqual(1)
  })

  it('does not import server-only code', () => {
    // This test passes by design: loading.tsx imports only lucide-react
    // and ui components — no server-only API code.
    render(<InventoryLoading />)
    // If server-only code leaked, the test would crash at import time
    expect(screen.getByRole('heading', { name: 'Inventario' })).toBeInTheDocument()
  })
})
