import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// ── Hoist fetch mock ─────────────────────────────────────────────

const { fetchImpl } = vi.hoisted(() => ({
  fetchImpl: vi.fn(),
}))

// ── Mocks ───────────────────────────────────────────────────────────

vi.mock('@/shared/config/env', () => ({
  env: {
    API_BASE_URL: 'http://localhost:3000',
    COOKIE_NAME: 'test_session',
    cookieOptions: { httpOnly: true, secure: false, sameSite: 'lax' as const, path: '/', maxAge: 432000 },
  },
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: () => ({ value: 'fake-token' }),
    set: () => {},
    delete: () => {},
    getAll: () => [],
    has: () => false,
  }),
}))

vi.stubGlobal('fetch', fetchImpl)

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, ...props }: Record<string, unknown>) =>
    require('react').createElement('a', props, children),
}))

// Mock client component to inspect props
vi.mock('@/features/cash/cash-page-client', () => ({
  CashPageClient: vi.fn((props: Record<string, unknown>) =>
    require('react').createElement('div', { 'data-testid': 'cash-page-client' }, JSON.stringify(props)),
  ),
}))

// ── Imports (after mocks) ───────────────────────────────────────────

import CashPage from './page'

// ── Helpers ─────────────────────────────────────────────────────────

function mockFetchOk(data: unknown, status = 200) {
  fetchImpl.mockResolvedValueOnce({
    ok: true,
    status,
    json: async () => data,
  } as Response)
}

function mockFetchError(status: number, error: string, message: string) {
  fetchImpl.mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({ error, message }),
  } as Response)
}

const currentBoxFixture = {
  id: 'cb-current',
  businessDate: '2026-05-16',
  status: 'OPEN',
  openingBalanceCents: 10000,
  currentBalanceCents: 15000,
  finalBalanceCents: null,
  closedAt: null,
  legacy: false,
  isCurrent: true,
  createdAt: '2026-05-16T10:00:00Z',
}

const boxesFixture = [
  { ...currentBoxFixture },
  {
    id: 'cb-past',
    businessDate: '2026-05-15',
    status: 'CLOSED',
    openingBalanceCents: 0,
    currentBalanceCents: 50000,
    finalBalanceCents: 50000,
    closedAt: '2026-05-15T20:00:00Z',
    legacy: false,
    isCurrent: false,
    createdAt: '2026-05-15T10:00:00Z',
  },
]

const summaryFixture = {
  cashBoxId: 'cb-current',
  businessDate: '2026-05-16',
  status: 'OPEN',
  openingBalanceCents: 10000,
  currentBalanceCents: 15000,
  grossSalesCents: 50000,
  purchaseOutflowCents: -30000,
  returnOutflowCents: -5000,
  manualAdjustmentsCents: 0,
  withdrawalsCents: -10000,
}

const movementsFixture = {
  cashBoxId: 'cb-current',
  businessDate: '2026-05-16',
  status: 'OPEN',
  entries: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchImpl.mockClear()
})

// ── Helper to parse client props ─────────────────────────────────────

function getClientProps(container: HTMLElement): Record<string, unknown> {
  const el = container.querySelector('[data-testid="cash-page-client"]')
  if (!el) throw new Error('CashPageClient not rendered')
  return JSON.parse(el.textContent!)
}

function assertClientRendered(container: HTMLElement) {
  expect(container.querySelector('[data-testid="cash-page-client"]')).toBeInTheDocument()
}

function assertErrorStateRendered() {
  expect(screen.getByText('Error al cargar caja')).toBeInTheDocument()
}

// ── Tests ───────────────────────────────────────────────────────────

describe('CashPage (server component)', () => {
  it('renders CashPageClient with current box data when all requests succeed', async () => {
    mockFetchOk(currentBoxFixture)
    mockFetchOk(boxesFixture)
    mockFetchOk(summaryFixture)
    mockFetchOk(movementsFixture)

    const { container } = render(await CashPage())
    assertClientRendered(container)

    const props = getClientProps(container)
    expect(props.currentBox).toBeTruthy()
    expect((props.currentBox as Record<string, unknown>).id).toBe('cb-current')
    expect(props.boxes).toHaveLength(2)
    expect(props.noCurrentBox).toBe(false)
    expect(props.initialSelectedBoxId).toBe('cb-current')
    expect(props.initialSummary).toBeTruthy()
    expect(props.initialMovements).toBeTruthy()
    expect(props.initialSummaryError).toBeNull()
    expect(props.initialMovementsError).toBeNull()
  })

  it('treats 404 from /current as valid no-current state, not fatal', async () => {
    mockFetchError(404, 'NotFoundError', 'No hay una caja abierta para hoy')
    mockFetchOk(boxesFixture)
    mockFetchOk(summaryFixture)
    mockFetchOk(movementsFixture)

    const { container } = render(await CashPage())
    assertClientRendered(container)

    const props = getClientProps(container)
    expect(props.currentBox).toBeNull()
    expect(props.noCurrentBox).toBe(true)
    expect(props.initialSelectedBoxId).toBe('cb-current') // falls back to first box
  })

  it('treats non-404 error from /current as fatal (renders error state)', async () => {
    mockFetchError(500, 'InternalError', 'Server crashed')

    render(await CashPage())
    assertErrorStateRendered()
    expect(screen.getByText('Server crashed')).toBeInTheDocument()
  })

  it('treats list fetch failure as fatal', async () => {
    mockFetchOk(currentBoxFixture)
    mockFetchError(500, 'InternalError', 'DB connection lost')

    render(await CashPage())
    assertErrorStateRendered()
  })

  it('handles summary fetch error gracefully (passes error to client, not fatal)', async () => {
    mockFetchOk(currentBoxFixture)
    mockFetchOk(boxesFixture)
    mockFetchError(500, 'InternalError', 'Summary computation failed')
    mockFetchOk(movementsFixture)

    const { container } = render(await CashPage())
    assertClientRendered(container)

    const props = getClientProps(container)
    expect(props.initialSummary).toBeNull()
    expect(props.initialSummaryError).toBe('Summary computation failed')
    expect(props.initialMovements).toBeTruthy()
  })

  it('selects first historical box when no current box and boxes exist', async () => {
    mockFetchError(404, 'NotFoundError', 'No hay una caja abierta para hoy')
    mockFetchOk([
      { ...boxesFixture[1], id: 'cb-past-1' },
      { ...boxesFixture[1], id: 'cb-past-2', businessDate: '2026-05-14' },
    ])
    mockFetchOk({ ...summaryFixture, cashBoxId: 'cb-past-1' })
    mockFetchOk({ ...movementsFixture, cashBoxId: 'cb-past-1' })

    const { container } = render(await CashPage())
    assertClientRendered(container)

    const props = getClientProps(container)
    expect(props.initialSelectedBoxId).toBe('cb-past-1')
  })
})
