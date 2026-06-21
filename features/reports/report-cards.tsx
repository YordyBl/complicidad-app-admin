import { Suspense } from 'react'
import Link from 'next/link'
import { DollarSign, TrendingUp, Package, BarChart3, Search } from 'lucide-react'

import {
  getLiquidity,
  getStockInvestment,
  getSalesTotal,
  getFifoCogs,
  getGrossProfit,
  getReinvestment,
  getOperatingCapital,
  getStockByProduct,
  getLots,
  type LiquidityReport,
  type StockInvestmentReport,
  type SalesTotalReport,
  type FifoCogsReport,
  type GrossProfitReport,
  type ReinvestmentReport,
  type OperatingCapitalReport,
  type StockByProductResponse,
  type LotsResponse,
} from '@/shared/api/reports'
import { formatCurrency, formatDate } from '@/shared/api/formatters'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import type { ReportCardQuery, ReportsQueryResult } from '@/app/(app)/reports/page-helpers'
import { buildCardUrl } from '@/app/(app)/reports/page-helpers'

// ── Helpers ────────────────────────────────────────────────────────

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

// ── Report card wrapper ─────────────────────────────────────────────

function ReportCard({
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

// ── Amount display ──────────────────────────────────────────────────

function AmountDisplay({
  label,
  cents,
  variant = 'default',
}: {
  label: string
  cents: number
  variant?: 'default' | 'positive' | 'negative'
}) {
  const colorClass =
    variant === 'positive'
      ? 'text-green-600 dark:text-green-400'
      : variant === 'negative'
        ? 'text-red-600 dark:text-red-400'
        : 'text-foreground'

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>
        {formatCurrency(cents)}
      </p>
    </div>
  )
}

// ── Search form for list cards ─────────────────────────────────────

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
  const pageUrl = buildCardUrl(namespace, allQueries, { page: '1', search: undefined })

  return (
    <form action={pageUrl} method="GET" className="flex gap-2 mb-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          name={`${namespace}_search`}
          defaultValue={currentSearch}
          placeholder="Buscar..."
          className="pl-9"
        />
      </div>
      {/* Preserve pageSize across search submits */}
      {cardQuery.pageSize ? (
        <input type="hidden" name={`${namespace}_pageSize`} value={cardQuery.pageSize} />
      ) : null}
    </form>
  )
}

// ── Pagination for list cards ──────────────────────────────────────

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

// ── Async KPI card components ──────────────────────────────────────

async function LiquidityCard() {
  const result = await getLiquidity()

  if (!result.ok) {
    return (
      <ReportCard title="Liquidez" description="Saldo neto de caja" icon={DollarSign}>
        <ErrorState title="Error" message={result.error.message} />
      </ReportCard>
    )
  }

  const data = result.data
  if (data.liquidityCents === 0) {
    return (
      <ReportCard title="Liquidez" description="Saldo neto de caja" icon={DollarSign}>
        <EmptyState title="Sin datos" description="No hay movimientos de caja registrados." />
      </ReportCard>
    )
  }

  return (
    <ReportCard title="Liquidez" description="Saldo neto de caja" icon={DollarSign}>
      <AmountDisplay
        label="Saldo neto"
        cents={data.liquidityCents}
        variant={data.liquidityCents >= 0 ? 'positive' : 'negative'}
      />
    </ReportCard>
  )
}

async function StockInvestmentCard() {
  const result = await getStockInvestment()

  if (!result.ok) {
    return (
      <ReportCard title="Inversión en stock" description="Capital invertido en inventario" icon={Package}>
        <ErrorState title="Error" message={result.error.message} />
      </ReportCard>
    )
  }

  return (
    <ReportCard title="Inversión en stock" description="Capital invertido en inventario" icon={Package}>
      <AmountDisplay
        label="Total invertido"
        cents={result.data.totalInvestmentCents}
        variant="default"
      />
    </ReportCard>
  )
}

async function SalesTotalCard() {
  const result = await getSalesTotal()

  if (!result.ok) {
    return (
      <ReportCard title="Ventas totales" description="Total de ventas registradas" icon={TrendingUp}>
        <ErrorState title="Error" message={result.error.message} />
      </ReportCard>
    )
  }

  return (
    <ReportCard title="Ventas totales" description="Total de ventas registradas" icon={TrendingUp}>
      <AmountDisplay
        label="Total vendido"
        cents={result.data.totalSalesCents}
        variant="positive"
      />
    </ReportCard>
  )
}

async function CogsCard() {
  const result = await getFifoCogs()

  if (!result.ok) {
    return (
      <ReportCard title="COGS FIFO" description="Costo de mercadería vendida (FIFO)" icon={BarChart3}>
        <ErrorState title="Error" message={result.error.message} />
      </ReportCard>
    )
  }

  return (
    <ReportCard title="COGS FIFO" description="Costo de mercadería vendida (FIFO)" icon={BarChart3}>
      <AmountDisplay
        label="Costo total"
        cents={result.data.totalCogsCents}
        variant="negative"
      />
    </ReportCard>
  )
}

async function GrossProfitCard() {
  const result = await getGrossProfit()

  if (!result.ok) {
    return (
      <ReportCard title="Ganancia bruta" description="Diferencia entre ventas y costo" icon={TrendingUp}>
        <ErrorState title="Error" message={result.error.message} />
      </ReportCard>
    )
  }

  const data = result.data
  const variant = data.grossProfitCents >= 0 ? 'positive' : 'negative'

  return (
    <ReportCard title="Ganancia bruta" description="Diferencia entre ventas y costo" icon={TrendingUp}>
      <AmountDisplay
        label="Ganancia bruta"
        cents={data.grossProfitCents}
        variant={variant}
      />
    </ReportCard>
  )
}

async function ReinvestmentCard() {
  const result = await getReinvestment()

  if (!result.ok) {
    return (
      <ReportCard title="Reinversión" description="Capital reinvertido" icon={DollarSign}>
        <ErrorState title="Error" message={result.error.message} />
      </ReportCard>
    )
  }

  return (
    <ReportCard title="Reinversión" description="Capital reinvertido" icon={DollarSign}>
      <AmountDisplay
        label="Total reinvertido"
        cents={result.data.reinvestmentCents}
        variant="default"
      />
    </ReportCard>
  )
}

async function OperatingCapitalCard() {
  const result = await getOperatingCapital()

  if (!result.ok) {
    return (
      <ReportCard title="Capital operativo" description="Capital disponible para operar" icon={DollarSign}>
        <ErrorState title="Error" message={result.error.message} />
      </ReportCard>
    )
  }

  return (
    <ReportCard title="Capital operativo" description="Capital disponible para operar" icon={DollarSign}>
      <AmountDisplay
        label="Capital operativo"
        cents={result.data.operatingCapitalCents}
        variant="positive"
      />
    </ReportCard>
  )
}

// ── List card components ───────────────────────────────────────────

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
      <ReportCard title="Stock por producto" description="Desglose de stock por producto" icon={Package}>
        <ErrorState title="Error" message={result.error.message} />
      </ReportCard>
    )
  }

  const data = result.data
  const items = data.items

  return (
    <ReportCard title="Stock por producto" description="Desglose de stock por producto" icon={Package}>
      <ListSearchForm currentSearch={search} namespace={namespace} allQueries={allQueries} />

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
                  <p className="text-sm font-medium">{item.totalRemainingQty} un.</p>
                  <p className="text-xs text-muted-foreground">
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
    </ReportCard>
  )
}

async function LotsCard({ query, allQueries, namespace }: ListCardProps) {
  const page = parsePage(query.page)
  const pageSize = parsePageSize(query.pageSize)
  const search = parseSearch(query.search)

  const result = await getLots({ page, pageSize, search })

  if (!result.ok) {
    return (
      <ReportCard title="Lotes" description="Registro de lotes de compra" icon={Package}>
        <ErrorState title="Error" message={result.error.message} />
      </ReportCard>
    )
  }

  const data = result.data
  const lotsItems = data.items

  return (
    <ReportCard title="Lotes" description="Registro de lotes de compra" icon={Package}>
      <ListSearchForm currentSearch={search} namespace={namespace} allQueries={allQueries} />

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
                  <p className="text-sm">
                    {lot.remainingQuantity}/{lot.purchasedQuantity} un.
                  </p>
                  <p className="text-xs text-muted-foreground">
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
    </ReportCard>
  )
}

// ── Exported component ──────────────────────────────────────────────

export function ReportCards({
  stockQuery = {},
  lotsQuery = {},
}: {
  stockQuery?: ReportCardQuery
  lotsQuery?: ReportCardQuery
}) {
  const allQueries: ReportsQueryResult = { stock: stockQuery, lots: lotsQuery }

  return (
    <>
      {/* ── KPI cards — first ──────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Indicadores clave</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Suspense fallback={<ReportCardSkeleton />}>
            <LiquidityCard />
          </Suspense>
          <Suspense fallback={<ReportCardSkeleton />}>
            <StockInvestmentCard />
          </Suspense>
          <Suspense fallback={<ReportCardSkeleton />}>
            <SalesTotalCard />
          </Suspense>
          <Suspense fallback={<ReportCardSkeleton />}>
            <CogsCard />
          </Suspense>
          <Suspense fallback={<ReportCardSkeleton />}>
            <GrossProfitCard />
          </Suspense>
          <Suspense fallback={<ReportCardSkeleton />}>
            <ReinvestmentCard />
          </Suspense>
          <Suspense fallback={<ReportCardSkeleton />}>
            <OperatingCapitalCard />
          </Suspense>
        </div>
      </section>

      {/* ── List cards — second, wider ─────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Listados</h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Suspense fallback={<ListCardSkeleton />}>
            <StockByProductCard query={stockQuery} allQueries={allQueries} namespace="stock" />
          </Suspense>
          <Suspense fallback={<ListCardSkeleton />}>
            <LotsCard query={lotsQuery} allQueries={allQueries} namespace="lots" />
          </Suspense>
        </div>
      </section>
    </>
  )
}
