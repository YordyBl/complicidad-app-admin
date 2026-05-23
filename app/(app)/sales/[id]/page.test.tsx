import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: Record<string, unknown>) =>
    require('react').createElement('div', { 'data-testid': 'card' }, children),
  CardContent: ({ children, className }: Record<string, unknown>) =>
    require('react').createElement('div', { 'data-testid': 'card-content', className }, children),
  CardDescription: ({ children }: Record<string, unknown>) =>
    require('react').createElement('p', { 'data-testid': 'card-description' }, children),
  CardHeader: ({ children, className }: Record<string, unknown>) =>
    require('react').createElement('div', { 'data-testid': 'card-header', className }, children),
  CardTitle: ({ children, className }: Record<string, unknown>) =>
    require('react').createElement('h3', { 'data-testid': 'card-title', className }, children),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: Record<string, unknown>) =>
    require('react').createElement('span', {
      'data-testid': 'badge',
      'data-variant': variant,
      className,
    }, children),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, variant, size }: Record<string, unknown>) => {
    const React = require('react')
    if (asChild) {
      return React.createElement('span', { 'data-testid': 'button-as-child' }, children)
    }
    return React.createElement('button', { 'data-testid': 'button' }, children)
  },
}))

vi.mock('@/components/ui/error-state', () => ({
  ErrorState: ({ title, message }: Record<string, unknown>) =>
    require('react').createElement('div', { 'data-testid': 'error-state' },
      require('react').createElement('h2', {}, title as string),
      require('react').createElement('p', {}, message as string),
    ),
}))

vi.mock('@/components/ui/loading-state', () => ({
  LoadingState: () =>
    require('react').createElement('div', { 'data-testid': 'loading-state' }, 'Loading...'),
}))

vi.mock('@/shared/api/formatters', () => ({
  formatCurrency: (cents: number) => `S/ ${(cents / 100).toFixed(2)}`,
  formatDateTime: (iso: string) => `Formatted: ${iso}`,
}))

vi.mock('@/shared/api/schemas', () => ({
  saleChannelLabels: {
    web: 'Web',
    tiktok: 'TikTok',
    facebook: 'Facebook',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
  },
}))

vi.mock('lucide-react', () => ({
  ArrowLeft: () => require('react').createElement('span', { 'data-testid': 'arrow-left-icon' }),
  ShoppingCart: () => require('react').createElement('span', { 'data-testid': 'cart-icon' }),
}))

import { SaleDetailContent } from '@/features/sales/sale-detail-content'
import type { SaleDetail } from '@/shared/api/sales'

function makeSale(overrides: Partial<SaleDetail> = {}): SaleDetail {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    customerId: 'cust-1',
    channelReference: null,
    channel: 'web',
    status: 'ACTIVE',
    totalRevenueCents: 150000,
    totalCostCents: 75000,
    grossProfitCents: 75000,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
    lines: [{
      id: 'line-1',
      variantId: 'var-1',
      quantity: 2,
      unitPriceCents: 75000,
      priceType: 'regular',
      totalPriceCents: 150000,
      totalCostCents: 75000,
      consumptions: [],
    }],
    paymentStatus: 'pending',
    amountPaidCents: 0,
    pendingBalanceCents: 150000,
    settledAt: null,
    ...overrides,
  }
}

describe('SaleDetailContent — payment snapshot', () => {
  it('muestra "Pendiente" cuando paymentStatus es pending', () => {
    const sale = makeSale({ paymentStatus: 'pending', amountPaidCents: 0, pendingBalanceCents: 150000 })
    render(<SaleDetailContent sale={sale} />)

    const badges = screen.getAllByTestId('badge')
    const pendingBadge = badges.find((b) => b.textContent === 'Pendiente')
    expect(pendingBadge).toBeTruthy()
  })

  it('muestra "Parcial" cuando paymentStatus es partial', () => {
    const sale = makeSale({ paymentStatus: 'partial', amountPaidCents: 50000, pendingBalanceCents: 100000 })
    render(<SaleDetailContent sale={sale} />)

    const badges = screen.getAllByTestId('badge')
    const partialBadge = badges.find((b) => b.textContent === 'Parcial')
    expect(partialBadge).toBeTruthy()
  })

  it('muestra "Pagado" cuando paymentStatus es paid', () => {
    const sale = makeSale({ paymentStatus: 'paid', amountPaidCents: 150000, pendingBalanceCents: 0, settledAt: '2026-01-01T12:00:00Z' })
    render(<SaleDetailContent sale={sale} />)

    const badges = screen.getAllByTestId('badge')
    const paidBadge = badges.find((b) => b.textContent === 'Pagado')
    expect(paidBadge).toBeTruthy()
  })

  it('muestra el monto pagado y saldo pendiente', () => {
    const sale = makeSale({ paymentStatus: 'partial', amountPaidCents: 50000, pendingBalanceCents: 100000 })
    render(<SaleDetailContent sale={sale} />)

    expect(screen.getByText('S/ 500.00')).toBeInTheDocument()
    expect(screen.getByText('S/ 1000.00')).toBeInTheDocument()
  })

  it('muestra el saldo como liquidado cuando pendingBalanceCents es 0', () => {
    const sale = makeSale({ paymentStatus: 'paid', amountPaidCents: 150000, pendingBalanceCents: 0 })
    render(<SaleDetailContent sale={sale} />)

    expect(screen.getByText('S/ 0.00')).toBeInTheDocument()
  })

  it('muestra la fecha de liquidación cuando hay settledAt', () => {
    const sale = makeSale({
      paymentStatus: 'paid',
      amountPaidCents: 150000,
      pendingBalanceCents: 0,
      settledAt: '2026-01-01T12:00:00Z',
    })
    render(<SaleDetailContent sale={sale} />)

    expect(screen.getByText('Formatted: 2026-01-01T12:00:00Z')).toBeInTheDocument()
  })
})
