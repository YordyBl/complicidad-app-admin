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
 */

import { apiGet } from './api-fetch'
import type { ApiResult } from './api-fetch'
import {
  type LiquidityReport,
  type StockInvestmentReport,
  type SalesTotalReport,
  type FifoCogsReport,
  type GrossProfitReport,
  type ReinvestmentReport,
  type OperatingCapitalReport,
  type StockByProductReport,
  type LotsReport,
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
  StockByProductReport,
  LotsReport,
}

// ── API functions ──────────────────────────────────────────────────

export async function getLiquidity(): Promise<ApiResult<LiquidityReport>> {
  return apiGet<LiquidityReport>('/reports/liquidity')
}

export async function getStockInvestment(): Promise<ApiResult<StockInvestmentReport>> {
  return apiGet<StockInvestmentReport>('/reports/stock-investment')
}

export async function getSalesTotal(): Promise<ApiResult<SalesTotalReport>> {
  return apiGet<SalesTotalReport>('/reports/sales-total')
}

export async function getFifoCogs(): Promise<ApiResult<FifoCogsReport>> {
  return apiGet<FifoCogsReport>('/reports/fifo-cogs')
}

export async function getGrossProfit(): Promise<ApiResult<GrossProfitReport>> {
  return apiGet<GrossProfitReport>('/reports/gross-profit')
}

export async function getReinvestment(): Promise<ApiResult<ReinvestmentReport>> {
  return apiGet<ReinvestmentReport>('/reports/reinvestment')
}

export async function getOperatingCapital(): Promise<ApiResult<OperatingCapitalReport>> {
  return apiGet<OperatingCapitalReport>('/reports/operating-capital')
}

export async function getStockByProduct(): Promise<ApiResult<StockByProductReport>> {
  const result = await apiGet<unknown>('/reports/stock-by-product')
  if (!result.ok) return result

  // Normalize: backend returns { items: StockByProductItem[], totalInvestmentCents: number, currency: string }
  // but frontend expects a flat array. Defensively accept either shape.
  const raw = result.data
  let normalized: unknown[]
  if (Array.isArray(raw)) {
    normalized = raw
  } else if (raw && typeof raw === 'object' && 'items' in raw && Array.isArray((raw as Record<string, unknown>).items)) {
    normalized = (raw as Record<string, unknown>).items as unknown[]
  } else {
    normalized = []
  }
  return { ok: true, data: normalized as StockByProductReport, status: result.status }
}

export async function getLots(): Promise<ApiResult<LotsReport>> {
  const result = await apiGet<unknown>('/reports/lots')
  if (!result.ok) return result

  // Normalize: backend returns { open: LotReportItem[], exhausted: LotReportItem[], ... }
  // but frontend expects a flat array. Defensively accept either shape.
  const raw = result.data
  let normalized: unknown[]
  if (Array.isArray(raw)) {
    normalized = raw
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    const open = Array.isArray(obj.open) ? obj.open : []
    const exhausted = Array.isArray(obj.exhausted) ? obj.exhausted : []
    normalized = [...open, ...exhausted]
  } else {
    normalized = []
  }
  return { ok: true, data: normalized as LotsReport, status: result.status }
}
