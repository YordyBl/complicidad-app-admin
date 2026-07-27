import type { Metadata } from 'next'
import { normalizeReportsSearchParams } from './page-helpers'
import { ReportCards } from '@/features/reports/report-cards'
import {
  getLiquidity,
  getStockInvestment,
  getSalesTotal,
  getFifoCogs,
  getGrossProfit,
  getReinvestment,
  getOperatingCapital,
  type LiquidityReport,
  type StockInvestmentReport,
  type SalesTotalReport,
  type FifoCogsReport,
  type GrossProfitReport,
  type ReinvestmentReport,
  type OperatingCapitalReport,
} from '@/shared/api/reports'

export const metadata: Metadata = {
  title: 'Reportes — Complicidad',
}

interface ReportsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const raw = await searchParams
  const queries = normalizeReportsSearchParams(raw)

  // Fetch ALL KPI endpoints in parallel — no waterfalls.
  // Each endpoint is a small integer response; the benefit of
  // cross-metric derived insights outweighs per-card streaming here.
  const [
    salesTotalResult,
    liquidityResult,
    opCapitalResult,
    grossProfitResult,
    cogsResult,
    stockInvestResult,
    reinvestResult,
  ] = await Promise.all([
    getSalesTotal(),
    getLiquidity(),
    getOperatingCapital(),
    getGrossProfit(),
    getFifoCogs(),
    getStockInvestment(),
    getReinvestment(),
  ])

  // Graceful unwrap — individual endpoint failures result in null,
  // not a full page crash. The UI renders fallback values per card.
  const salesTotal: SalesTotalReport | null = salesTotalResult.ok ? salesTotalResult.data : null
  const liquidity: LiquidityReport | null = liquidityResult.ok ? liquidityResult.data : null
  const opCapital: OperatingCapitalReport | null = opCapitalResult.ok ? opCapitalResult.data : null
  const grossProfit: GrossProfitReport | null = grossProfitResult.ok ? grossProfitResult.data : null
  const cogs: FifoCogsReport | null = cogsResult.ok ? cogsResult.data : null
  const stockInvest: StockInvestmentReport | null = stockInvestResult.ok ? stockInvestResult.data : null
  const reinvest: ReinvestmentReport | null = reinvestResult.ok ? reinvestResult.data : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Resumen financiero y operativo. Todos los valores en soles peruanos (PEN).
          Los datos se obtienen directamente del backend en tiempo real.
        </p>
      </div>

      <ReportCards
        stockQuery={queries.stock}
        lotsQuery={queries.lots}
        salesTotal={salesTotal}
        liquidity={liquidity}
        operatingCapital={opCapital}
        grossProfit={grossProfit}
        cogs={cogs}
        stockInvestment={stockInvest}
        reinvestment={reinvest}
      />
    </div>
  )
}
