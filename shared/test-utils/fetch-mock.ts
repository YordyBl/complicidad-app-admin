/**
 * Reusable fetch mock for tests.
 * Resolves with JSON-serialized response.
 */
import { vi } from 'vitest'

export interface MockFetchResponse {
  status?: number
  ok?: boolean
  data?: unknown
}

export type MockFetch = ReturnType<typeof vi.fn>

export function createFetchMock(): MockFetch {
  return vi.fn().mockImplementation(async (_url: string, _init?: RequestInit) => {
    return {
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response
  })
}

/**
 * Make a fetch mock return a specific response for the next call.
 */
export function mockFetchResponse(
  fetchMock: MockFetch,
  response: MockFetchResponse,
): void {
  fetchMock.mockResolvedValueOnce({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: async () => response.data ?? {},
  } as Response)
}

/**
 * Make a fetch mock throw an AbortError (timeout simulation).
 */
export function mockFetchTimeout(fetchMock: MockFetch): void {
  const error = new DOMException('The operation was aborted', 'AbortError')
  fetchMock.mockRejectedValueOnce(error)
}

/**
 * Make a fetch mock throw a network error.
 */
export function mockFetchNetworkError(fetchMock: MockFetch, message = 'fetch failed'): void {
  fetchMock.mockRejectedValueOnce(new Error(message))
}

/**
 * Reset fetch mock and set a default success behavior.
 */
export function resetFetchMock(fetchMock: MockFetch = vi.mocked(fetch) as MockFetch): void {
  fetchMock.mockReset()
  fetchMock.mockImplementation(async () => ({
    ok: true,
    status: 200,
    json: async () => ({}),
  } as Response))
}
