import 'server-only'

/**
 * Reports API client — financial and operational reports.
 *
 * Nine GET endpoints under /api/v1/reports/*:
 *   liquidity, stock-investment, sales-total, fifo-cogs,
 *   gross-profit, reinvestment, operating-capital,
 *   stock-by-product, lots.
 *
 * All report values are integer cents in ARS currency.
 * All GETs use cache: 'no-store' — financial data is sensitive/mutable.
 *
 * Every response is validated through Zod schemas before returning.
 * Contract drift is detected and returned as a safe error instead of
 * passing `undefined` or `NaN` into the UI.
 */

import { apiGet } from './api-fetch'
import type { ApiResult } from './api-fetch'
import {
  liquidityReportSchema,
  stockInvestmentReportSchema,
  salesTotalReportSchema,
  fifoCogsReportSchema,
  grossProfitReportSchema,
  reinvestmentReportSchema,
  operatingCapitalReportSchema,
  stockByProductResponseSchema,
  lotsResponseSchema,
  type LiquidityReport,
  type StockInvestmentReport,
  type SalesTotalReport,
  type FifoCogsReport,
  type GrossProfitReport,
  type ReinvestmentReport,
  type OperatingCapitalReport,
  type StockByProductResponse,
  type LotsResponse,
} from './schemas'

// Re-export types for server-side consumers
export type {
  LiquidityReport,
  StockInvestmentReport,
  SalesTotalReport,
  FifoCogsReport,
  GrossProfitReport,
  ReinvestmentReport,
  OperatingCapitalReport,
  StockByProductResponse,
  LotsResponse,
}

// ── Internal helpers ────────────────────────────────────────────────

/**
 * Parse a raw JSON response with a Zod schema.
 * On success returns `ok: true` with the parsed data.
 * On failure returns `ok: false` with a ContractError.
 */
function parseWith<T>(
  result: ApiResult<unknown>,
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: unknown } },
  endpoint: string,
): ApiResult<T> {
  if (!result.ok) return result

  const parsed = schema.safeParse(result.data)
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        error: 'ContractError',
        message: `La respuesta de ${endpoint} no coincide con el contrato esperado`,
        status: 502,
      },
    }
  }

  return { ok: true, data: parsed.data as T, status: result.status }
}

// ── API functions ──────────────────────────────────────────────────

export async function getLiquidity(): Promise<ApiResult<LiquidityReport>> {
  const result = await apiGet<unknown>('/reports/liquidity')
  return parseWith(result, liquidityReportSchema, '/reports/liquidity')
}

export async function getStockInvestment(): Promise<ApiResult<StockInvestmentReport>> {
  const result = await apiGet<unknown>('/reports/stock-investment')
  return parseWith(result, stockInvestmentReportSchema, '/reports/stock-investment')
}

export async function getSalesTotal(): Promise<ApiResult<SalesTotalReport>> {
  const result = await apiGet<unknown>('/reports/sales-total')
  return parseWith(result, salesTotalReportSchema, '/reports/sales-total')
}

export async function getFifoCogs(): Promise<ApiResult<FifoCogsReport>> {
  const result = await apiGet<unknown>('/reports/fifo-cogs')
  return parseWith(result, fifoCogsReportSchema, '/reports/fifo-cogs')
}

export async function getGrossProfit(): Promise<ApiResult<GrossProfitReport>> {
  const result = await apiGet<unknown>('/reports/gross-profit')
  return parseWith(result, grossProfitReportSchema, '/reports/gross-profit')
}

export async function getReinvestment(): Promise<ApiResult<ReinvestmentReport>> {
  const result = await apiGet<unknown>('/reports/reinvestment')
  return parseWith(result, reinvestmentReportSchema, '/reports/reinvestment')
}

export async function getOperatingCapital(): Promise<ApiResult<OperatingCapitalReport>> {
  const result = await apiGet<unknown>('/reports/operating-capital')
  return parseWith(result, operatingCapitalReportSchema, '/reports/operating-capital')
}

/**
 * Fetch stock-by-product with optional query params.
 * Defaults: page=1, pageSize=5, search=''
 */
export async function getStockByProduct(
  opts?: { page?: number; pageSize?: number; search?: string },
): Promise<ApiResult<StockByProductResponse>> {
  const params = new URLSearchParams()
  if (opts?.page) params.set('page', String(opts.page))
  if (opts?.pageSize) params.set('pageSize', String(opts.pageSize))
  if (opts?.search) params.set('search', opts.search)

  const qs = params.toString()
  const path = qs ? `/reports/stock-by-product?${qs}` : '/reports/stock-by-product'

  const result = await apiGet<unknown>(path)
  return parseWith(result, stockByProductResponseSchema, '/reports/stock-by-product')
}

/**
 * Fetch lots with optional query params.
 * Defaults: page=1, pageSize=5, search=''
 */
export async function getLots(
  opts?: { page?: number; pageSize?: number; search?: string },
): Promise<ApiResult<LotsResponse>> {
  const params = new URLSearchParams()
  if (opts?.page) params.set('page', String(opts.page))
  if (opts?.pageSize) params.set('pageSize', String(opts.pageSize))
  if (opts?.search) params.set('search', opts.search)

  const qs = params.toString()
  const path = qs ? `/reports/lots?${qs}` : '/reports/lots'

  const result = await apiGet<unknown>(path)
  return parseWith(result, lotsResponseSchema, '/reports/lots')
}
