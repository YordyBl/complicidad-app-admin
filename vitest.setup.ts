import '@testing-library/jest-dom'
import { vi } from 'vitest'

// ── Mock server-only (noop — allows importing server-only modules in tests) ──
vi.mock('server-only', () => ({}))

// ── Mock next/navigation ──────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}))

// ── Mock next/link ─────────────────────────────────────────────────
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: Record<string, unknown>) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').createElement('a', { href, ...props }, children),
}))

// ── Mock next/cache ────────────────────────────────────────────────
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// ── Mock next/headers cookies() ────────────────────────────────────
let cookieStore: Record<string, { value: string }> = {}

vi.mock('next/headers', () => {
  function cookies() {
    return {
      get: (name: string) => cookieStore[name] ?? undefined,
      set: (name: string, value: string) => { cookieStore[name] = { value } },
      delete: (name: string) => { delete cookieStore[name] },
      getAll: () => Object.entries(cookieStore).map(([name, { value }]) => ({ name, value })),
      has: (name: string) => name in cookieStore,
    }
  }
  return { cookies }
})

// Expose cookie store reset for tests
export function resetCookies(initial: Record<string, { value: string }> = {}) {
  cookieStore = { ...initial }
}

// ── Global fetch mock ──────────────────────────────────────────────
vi.stubGlobal(
  'fetch',
  vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({}),
  } as Response),
)
