/**
 * Integration tests for the dashboard page (Phase 4.2).
 *
 * Verifies that the security warning notice is removed from the UI
 * while the rest of the dashboard (welcome, health, nav cards)
 * renders correctly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// ── Hoisted mocks ────────────────────────────────────────────

const { mockRequireSession } = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
}))

const { mockCheckHealth } = vi.hoisted(() => ({
  mockCheckHealth: vi.fn(),
}))

vi.mock('@/shared/auth/session', () => ({
  requireSession: mockRequireSession,
}))

vi.mock('@/shared/api/health', () => ({
  checkHealth: mockCheckHealth,
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react').createElement('a', { href, ...props }, children)
  },
}))

// ── Import page ──────────────────────────────────────────────

import DashboardPage from './page'

// ── Factories ────────────────────────────────────────────────

function validSession() {
  return {
    token: 'jwt-token',
    user: { id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'admin' },
  }
}

function healthOk() {
  return {
    ok: true as const,
    data: { status: 'ok', timestamp: '2026-05-05T20:00:00.000Z' },
  }
}

function healthFail() {
  return {
    ok: false as const,
    error: 'Connection refused',
  }
}

// ── Render helper ────────────────────────────────────────────

async function renderPage() {
  const jsx = await DashboardPage()
  return render(jsx)
}

// ═══════════════════════════════════════════════════════════════

describe('DashboardPage — Phase 4.2', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireSession.mockResolvedValue(validSession())
    mockCheckHealth.mockResolvedValue(healthOk())
  })

  // ── Security notice removed (core requirement) ──────────────

  it('does NOT show the backend security warning', async () => {
    await renderPage()

    expect(screen.queryByText(/aviso de seguridad/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/protección de rutas/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/backend actualmente no implementa/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/no trates.*seguridad/i)).not.toBeInTheDocument()
  })

  // ── Welcome message still renders ──────────────────────────

  it('renders welcome message with user name', async () => {
    await renderPage()

    expect(screen.getByText('Panel de control')).toBeInTheDocument()
    expect(screen.getByText(/bienvenido.*admin/i)).toBeInTheDocument()
  })

  it('renders welcome with email when name is missing', async () => {
    mockRequireSession.mockResolvedValue({
      token: 'jwt-token',
      user: { id: 'user-2', email: 'test@example.com', name: '', role: 'user' },
    })

    await renderPage()

    expect(screen.getByText(/bienvenido.*test@example.com/i)).toBeInTheDocument()
  })

  // ── Health status card ─────────────────────────────────────

  it('renders backend operational when health is ok', async () => {
    await renderPage()

    expect(screen.getByText('Estado del sistema')).toBeInTheDocument()
    expect(screen.getByText('Backend operativo')).toBeInTheDocument()
  })

  it('renders backend unavailable when health fails', async () => {
    mockCheckHealth.mockResolvedValue(healthFail())

    await renderPage()

    expect(screen.getByText('Backend no disponible')).toBeInTheDocument()
    expect(screen.getByText('Connection refused')).toBeInTheDocument()
  })

  // ── Navigation cards still render ──────────────────────────

  it('renders all navigation quick-link cards', async () => {
    await renderPage()

    expect(screen.getByText('Clientes')).toBeInTheDocument()
    expect(screen.getByText('Inventario')).toBeInTheDocument()
    expect(screen.getByText('Ventas')).toBeInTheDocument()
    expect(screen.getByText('Reportes')).toBeInTheDocument()
    expect(screen.getByText('Caja')).toBeInTheDocument()
  })

  it('each nav card links to the correct route', async () => {
    await renderPage()

    expect(screen.getByRole('link', { name: /clientes/i })).toHaveAttribute('href', '/customers')
    expect(screen.getByRole('link', { name: /inventario/i })).toHaveAttribute('href', '/inventory')
    expect(screen.getByRole('link', { name: /ventas/i })).toHaveAttribute('href', '/sales')
    expect(screen.getByRole('link', { name: /reportes/i })).toHaveAttribute('href', '/reports')
    expect(screen.getByRole('link', { name: /caja/i })).toHaveAttribute('href', '/cash')
  })
})
