import 'server-only'

/**
 * Customers API client.
 *
 * Endpoints:
 * - GET    /api/v1/customers          → Customer[]
 * - POST   /api/v1/customers          → Customer
 * - GET    /api/v1/customers/:id      → Customer
 * - PUT    /api/v1/customers/:id      → Customer
 * - GET    /api/v1/customers/:id/history → CustomerHistoryResponse
 */

import { apiGet, apiPost, apiPut } from './api-fetch'
import type { ApiResult } from './api-fetch'
import {
  customerFormSchema,
  customerListSchema,
  customerHistoryResponseSchema,
  type Customer,
  type CustomerFormData,
  type CustomerHistoryResponse,
  type CustomerSaleSummary,
} from './schemas'

// Re-export schemas and types for server-side consumers (server actions, server components)
export {
  customerFormSchema,
  customerListSchema,
  customerHistoryResponseSchema,
  type Customer,
  type CustomerFormData,
  type CustomerHistoryResponse,
  type CustomerSaleSummary,
}

// ── API functions ──────────────────────────────────────────────────

export async function listCustomers(): Promise<ApiResult<Customer[]>> {
  return apiGet<Customer[]>('/customers')
}

export async function getCustomer(id: string): Promise<ApiResult<Customer>> {
  return apiGet<Customer>(`/customers/${id}`)
}

export async function createCustomer(
  body: CustomerFormData,
): Promise<ApiResult<Customer>> {
  return apiPost<Customer>('/customers', body)
}

export async function updateCustomer(
  id: string,
  body: CustomerFormData,
): Promise<ApiResult<Customer>> {
  return apiPut<Customer>(`/customers/${id}`, body)
}

export async function getCustomerHistory(
  id: string,
): Promise<ApiResult<CustomerHistoryResponse>> {
  return apiGet<CustomerHistoryResponse>(`/customers/${id}/history`)
}
