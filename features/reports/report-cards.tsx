import { Suspense } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  Wallet,
  Banknote,
  PiggyBank,
  BarChart3,
  Package,
  Search,
  Percent,
  ShoppingCart,
  Layers,
  ArrowRightLeft,
  Boxes,
} from 'lucide-react'

import {
  getStockByProduct,
  getLots,
  type SalesTotalReport,
  type LiquidityReport,
  type OperatingCapitalReport,
  type GrossProfitReport,
  type FifoCogsReport,
  type StockInvestmentReport,
  type ReinvestmentReport,
  type StockByProductResponse,
  type LotsResponse,
} from '@/shared/api/reports'
import { formatCurrency, formatDate } from '@/shared/api/formatters'
import { KpiCard } from '@/features/dashboard/kpi-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import type { ReportCardQuery, ReportsQueryResult } from '@/app/(app)/reports/page-helpers'
import { buildCardUrl } from '@/app/(app)/reports/page-helpers'

// ── Pure helpers (exported for testing) ────────────────────────────

export function parsePage(raw?: string): number {
  const n = parseInt(raw ?? '', 10)
  return Number.isFinite(n) && n >= 1 ? n : 1
}

export function parsePageSize(raw?: string): number {
  const n = parseInt(raw ?? '', 10)
  return Number.isFinite(n) && n >= 1 ? n : 5
}

export function parseSearch(raw?: string): string {
  return (raw ?? '').trim()
}

// ── Safe formatting for nullable monetary values ───────────────────

function safeFormat(cents: number | undefined | null): string {
  if (cents == null) return '—'
  return formatCurrency(cents)
}

// ── Section header ─────────────────────────────────────────────────

function SectionHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {description && (
        <p className="text-xs text-muted-foreground/70">{description}</p>
      )}
    </div>
  )
}

// ── Secondary metric card (compact, supporting role) ──────────────

function SecondaryMetricCard({
  label,
  value,
  subtitle,
  icon: Icon,
  emphasis = 'default',
}: {
  label: string
  value: string
  subtitle?: string
  icon?: React.ComponentType<{ className?: string }>
  emphasis?: 'default' | 'positive' | 'negative'
}) {
  const valueColor =
    emphasis === 'positive'
      ? 'text-green-600 dark:text-green-400'
      : emphasis === 'negative'
        ? 'text-red-600 dark:text-red-400'
        : 'text-foreground'

  return (
    <Card>
      <CardContent className="p-4 flex flex-col justify-center h-full">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className={`text-lg font-bold tabular-nums mt-1 ${valueColor}`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {Icon && (
            <div className="shrink-0 text-muted-foreground/50 mt-0.5">
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Legacy ReportCard wrapper (kept for list cards' error/empty states) ──

function ReportCardWrapper({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

// ── Skeletons ──────────────────────────────────────────────────────

function ReportCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-24" />
      </CardContent>
    </Card>
  )
}

function ListCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <Skeleton className="h-6 w-40 mb-2" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-10 w-full mb-3" />
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-6 w-32" />
      </CardContent>
    </Card>
  )
}

// ── List card shared components ────────────────────────────────────

function ListSearchForm({
  currentSearch,
  namespace,
  allQueries,
}: {
  currentSearch: string
  namespace: 'stock' | 'lots'
  allQueries: ReportsQueryResult
}) {
  const cardQuery = allQueries[namespace]

  return (
    <form action={buildCardUrl(namespace, allQueries, { page: '1', search: undefined })} method="GET" className="flex gap-2 mb-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          name={`${namespace}_search`}
          defaultValue={currentSearch}
          placeholder="Buscar..."
          className="pl-9"
        />
      </div>
      {cardQuery.pageSize ? (
        <input type="hidden" name={`${namespace}_pageSize`} value={cardQuery.pageSize} />
      ) : null}
    </form>
  )
}

function ListPagination({
  page,
  totalPages,
  namespace,
  allQueries,
}: {
  page: number
  totalPages: number
  namespace: 'stock' | 'lots'
  allQueries: ReportsQueryResult
}) {
  if (totalPages <= 1) return null

  const pages: number[] = []
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i)
  }

  return (
    <nav className="flex items-center justify-center gap-1 mt-4" aria-label="Paginación">
      {page > 1 ? (
        <Link
          href={buildCardUrl(namespace, allQueries, { page: String(page - 1) })}
          className="px-3 py-1.5 text-sm rounded-md border hover:bg-accent"
        >
          Anterior
        </Link>
      ) : (
        <span className="px-3 py-1.5 text-sm rounded-md border text-muted-foreground opacity-50">
          Anterior
        </span>
      )}

      {pages.map((p) => (
        <Link
          key={p}
          href={buildCardUrl(namespace, allQueries, { page: String(p) })}
          className={`px-3 py-1.5 text-sm rounded-md border ${
            p === page
              ? 'bg-primary text-primary-foreground border-primary'
              : 'hover:bg-accent'
          }`}
        >
          {p}
        </Link>
      ))}

      {page < totalPages ? (
        <Link
          href={buildCardUrl(namespace, allQueries, { page: String(page + 1) })}
          className="px-3 py-1.5 text-sm rounded-md border hover:bg-accent"
        >
          Siguiente
        </Link>
      ) : (
        <span className="px-3 py-1.5 text-sm rounded-md border text-muted-foreground opacity-50">
          Siguiente
        </span>
      )}
    </nav>
  )
}

// ── Async list card components (keep server-side data fetching) ────

interface ListCardProps {
  query: ReportCardQuery
  allQueries: ReportsQueryResult
  namespace: 'stock' | 'lots'
}

async function StockByProductCard({ query, allQueries, namespace }: ListCardProps) {
  const page = parsePage(query.page)
  const pageSize = parsePageSize(query.pageSize)
  const search = parseSearch(query.search)

  const result = await getStockByProduct({ page, pageSize, search })

  if (!result.ok) {
    return (
      <ReportCardWrapper title="Stock por producto" description="Desglose de stock por producto" icon={Boxes}>
        <ErrorState title="Error" message={result.error.message} />
      </ReportCardWrapper>
    )
  }

  const data = result.data
  const items = data.items

  return (
    <ReportCardWrapper title="Stock por producto" description="Desglose de stock por producto" icon={Boxes}>
      <ListSearchForm currentSearch={search} namespace={namespace} allQueries={allQueries} />

      {/* Summary row — real data context */}
      {data.totalItems > 0 && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 pb-2 border-b border-border/50">
          <span className="inline-flex items-center gap-1">
            <Layers className="w-3 h-3" />
            {data.totalItems} producto{data.totalItems !== 1 ? 's' : ''}
          </span>
          <span>Pág. {data.page} de {data.totalPages || 1}</span>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState title="Sin stock" description="No hay productos con stock registrado." />
      ) : (
        <>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.variantId}`}
                className="flex items-center justify-between py-2 border-b border-muted last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">{item.sku}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium tabular-nums">{item.totalRemainingQty} un.</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatCurrency(item.investmentCents)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <ListPagination
            page={data.page}
            totalPages={data.totalPages}
            namespace={namespace}
            allQueries={allQueries}
          />
        </>
      )}
    </ReportCardWrapper>
  )
}

async function LotsCard({ query, allQueries, namespace }: ListCardProps) {
  const page = parsePage(query.page)
  const pageSize = parsePageSize(query.pageSize)
  const search = parseSearch(query.search)

  const result = await getLots({ page, pageSize, search })

  if (!result.ok) {
    return (
      <ReportCardWrapper title="Lotes" description="Registro de lotes de compra" icon={ShoppingCart}>
        <ErrorState title="Error" message={result.error.message} />
      </ReportCardWrapper>
    )
  }

  const data = result.data
  const lotsItems = data.items

  // Derive OPEN vs EXHAUSTED count from real data
  const openCount = lotsItems.filter((l) => l.status === 'OPEN').length
  const exhaustedCount = lotsItems.filter((l) => l.status === 'EXHAUSTED').length

  return (
    <ReportCardWrapper title="Lotes" description="Registro de lotes de compra" icon={ShoppingCart}>
      <ListSearchForm currentSearch={search} namespace={namespace} allQueries={allQueries} />

      {/* Summary row — real data context */}
      {data.totalItems > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3 pb-2 border-b border-border/50">
          <span className="inline-flex items-center gap-1">
            <Layers className="w-3 h-3" />
            {data.totalItems} lote{data.totalItems !== 1 ? 's' : ''}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            {openCount} abierto{openCount !== 1 ? 's' : ''}
          </span>
          {exhaustedCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
              {exhaustedCount} agotado{exhaustedCount !== 1 ? 's' : ''}
            </span>
          )}
          <span>Pág. {data.page} de {data.totalPages || 1}</span>
        </div>
      )}

      {lotsItems.length === 0 ? (
        <EmptyState title="Sin lotes" description="No hay lotes de compra registrados." />
      ) : (
        <>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {lotsItems.map((lot) => (
              <div
                key={lot.lotId}
                className="flex items-center justify-between py-2 border-b border-muted last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{lot.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {lot.sku} — Comprado {formatDate(lot.purchaseDate)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm tabular-nums">
                    {lot.remainingQuantity}/{lot.purchasedQuantity} un.
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatCurrency(lot.unitCostCents)} c/u
                  </p>
                </div>
              </div>
            ))}
          </div>
          <ListPagination
            page={data.page}
            totalPages={data.totalPages}
            namespace={namespace}
            allQueries={allQueries}
          />
        </>
      )}
    </ReportCardWrapper>
  )
}

// ── Main exported component ────────────────────────────────────────

export function ReportCards({
  stockQuery = {},
  lotsQuery = {},
  salesTotal,
  liquidity,
  operatingCapital,
  grossProfit,
  cogs,
  stockInvestment,
  reinvestment,
}: {
  stockQuery?: ReportCardQuery
  lotsQuery?: ReportCardQuery
  salesTotal: SalesTotalReport | null
  liquidity: LiquidityReport | null
  operatingCapital: OperatingCapitalReport | null
  grossProfit: GrossProfitReport | null
  cogs: FifoCogsReport | null
  stockInvestment: StockInvestmentReport | null
  reinvestment: ReinvestmentReport | null
}) {
  const allQueries: ReportsQueryResult = { stock: stockQuery, lots: lotsQuery }

  // ── Derived insights from REAL data (no fabrication) ────────────

  /** Gross margin as percentage of sales — only when both datasets are available. */
  const grossMarginPercent =
    salesTotal && grossProfit && salesTotal.totalSalesCents > 0
      ? ((grossProfit.grossProfitCents / salesTotal.totalSalesCents) * 100).toFixed(1)
      : null

  /** Stock investment as percentage of operating capital — gives context to capital allocation. */
  const stockVsOpCapitalPercent =
    stockInvestment && operatingCapital && operatingCapital.operatingCapitalCents > 0
      ? ((stockInvestment.totalInvestmentCents / operatingCapital.operatingCapitalCents) * 100).toFixed(1)
      : null

  // ── Render ──────────────────────────────────────────────────────

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════
          SECTION 1: Salud del negocio — Executive Pulse
          Primary KPIs that answer "how is the business doing right now?"
          ═══════════════════════════════════════════════════════════ */}
      <SectionHeader
        title="Salud del negocio"
        description="Métricas principales de rendimiento y liquidez operativa."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Ventas totales"
          value={safeFormat(salesTotal?.totalSalesCents)}
          subtitle={
            salesTotal
              ? `${salesTotal.activeSaleCount} ventas activas`
              : undefined
          }
          emphasis="positive"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <KpiCard
          label="Liquidez"
          value={safeFormat(liquidity?.liquidityCents)}
          emphasis={liquidity && liquidity.liquidityCents >= 0 ? 'neutral' : 'negative'}
          icon={<Wallet className="w-4 h-4" />}
        />
        <KpiCard
          label="Capital operativo"
          value={safeFormat(operatingCapital?.operatingCapitalCents)}
          emphasis="default"
          icon={<Banknote className="w-4 h-4" />}
        />
        <KpiCard
          label="Ganancia bruta"
          value={safeFormat(grossProfit?.grossProfitCents)}
          emphasis={grossProfit && grossProfit.grossProfitCents >= 0 ? 'positive' : 'negative'}
          icon={<PiggyBank className="w-4 h-4" />}
        />
      </div>

      <Separator />

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2: Rentabilidad — Profitability
          Cost structure and margin analysis.
          ═══════════════════════════════════════════════════════════ */}
      <SectionHeader
        title="Rentabilidad"
        description="Estructura de costos y margen sobre ventas."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <SecondaryMetricCard
          label="Costo de venta (COGS)"
          value={safeFormat(cogs?.totalCogsCents)}
          subtitle="Costo de mercadería vendida (FIFO)"
          emphasis="negative"
          icon={BarChart3}
        />

        <SecondaryMetricCard
          label="Margen bruto"
          value={grossMarginPercent !== null ? `${grossMarginPercent}%` : '—'}
          subtitle={
            grossMarginPercent !== null
              ? 'Sobre ventas totales'
              : salesTotal && grossProfit
                ? 'Ventas sin margen calculable'
                : 'Datos insuficientes'
          }
          emphasis={
            grossMarginPercent !== null && Number(grossMarginPercent) >= 0
              ? 'positive'
              : grossMarginPercent !== null
                ? 'negative'
                : 'default'
          }
          icon={Percent}
        />

        <SecondaryMetricCard
          label="Ventas activas"
          value={salesTotal ? String(salesTotal.activeSaleCount) : '—'}
          subtitle="Ventas sin cancelar ni devolver"
          icon={TrendingUp}
        />
      </div>

      <Separator />

      {/* ═══════════════════════════════════════════════════════════
          SECTION 3: Capital e inversión — Capital & Investment
          Where capital is allocated — stock and reinvestment.
          ═══════════════════════════════════════════════════════════ */}
      <SectionHeader
        title="Capital e inversión"
        description="Asignación de capital: inventario y reinversión."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <SecondaryMetricCard
          label="Inversión en stock"
          value={safeFormat(stockInvestment?.totalInvestmentCents)}
          subtitle={
            stockVsOpCapitalPercent !== null
              ? `${stockVsOpCapitalPercent}% del capital operativo`
              : 'Capital invertido en inventario'
          }
          icon={Package}
        />

        <SecondaryMetricCard
          label="Reinversión"
          value={safeFormat(reinvestment?.reinvestmentCents)}
          subtitle="Capital reinvertido en el negocio"
          icon={ArrowRightLeft}
        />
      </div>

      <Separator />

      {/* ═══════════════════════════════════════════════════════════
          SECTION 4: Detalle operativo — Operational Details
          Inventory and purchase lot follow-up. Not appendices —
          operational data that drives restocking decisions.
          ═══════════════════════════════════════════════════════════ */}
      <SectionHeader
        title="Detalle operativo"
        description="Seguimiento de inventario y lotes de compra. Datos que informan decisiones de reposición."
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Suspense fallback={<ListCardSkeleton />}>
          <StockByProductCard query={stockQuery} allQueries={allQueries} namespace="stock" />
        </Suspense>
        <Suspense fallback={<ListCardSkeleton />}>
          <LotsCard query={lotsQuery} allQueries={allQueries} namespace="lots" />
        </Suspense>
      </div>
    </>
  )
}
