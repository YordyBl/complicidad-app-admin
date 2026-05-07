import { Suspense } from 'react'
import { DollarSign, TrendingUp, Package, BarChart3, AlertTriangle } from 'lucide-react'

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
  type StockByProductReport,
  type LotsReport,
} from '@/shared/api/reports'
import { formatCurrency, formatDate } from '@/shared/api/formatters'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'

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

// ── Async report sections ───────────────────────────────────────────

async function LiquidityCard() {
  const result = await getLiquidity()

  if (!result.ok) {
    return (
      <ReportCard title="Liquidez" description="Entradas y salidas de caja" icon={DollarSign}>
        <ErrorState title="Error" message={result.error.message} />
      </ReportCard>
    )
  }

  const data = result.data
  if (data.totalCashInCents === 0 && data.totalCashOutCents === 0) {
    return (
      <ReportCard title="Liquidez" description="Entradas y salidas de caja" icon={DollarSign}>
        <EmptyState title="Sin datos" description="No hay movimientos de caja registrados." />
      </ReportCard>
    )
  }

  return (
    <ReportCard title="Liquidez" description="Entradas y salidas de caja" icon={DollarSign}>
      <div className="space-y-3">
        <AmountDisplay label="Total entradas" cents={data.totalCashInCents} variant="positive" />
        <AmountDisplay label="Total salidas" cents={data.totalCashOutCents} variant="negative" />
        <div className="pt-3 border-t">
          <AmountDisplay
            label="Balance"
            cents={data.balanceCents}
            variant={data.balanceCents >= 0 ? 'positive' : 'negative'}
          />
        </div>
      </div>
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

async function StockByProductCard() {
  const result = await getStockByProduct()

  if (!result.ok) {
    return (
      <ReportCard title="Stock por producto" description="Desglose de stock por producto" icon={Package}>
        <ErrorState title="Error" message={result.error.message} />
      </ReportCard>
    )
  }

  const data = result.data
  // Defense-in-depth: ensure data is an array before .length/.map
  const items = Array.isArray(data) ? data : []
  if (items.length === 0) {
    return (
      <ReportCard title="Stock por producto" description="Desglose de stock por producto" icon={Package}>
        <EmptyState title="Sin stock" description="No hay productos con stock registrado." />
      </ReportCard>
    )
  }

  return (
    <ReportCard title="Stock por producto" description="Desglose de stock por producto" icon={Package}>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between py-2 border-b border-muted last:border-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{item.productName}</p>
              <p className="text-xs text-muted-foreground">{item.sku}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-medium">{item.totalRemainingQty ?? item.stockQuantity} un.</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(item.investmentCents)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ReportCard>
  )
}

async function LotsCard() {
  const result = await getLots()

  if (!result.ok) {
    return (
      <ReportCard title="Lotes" description="Registro de lotes de compra" icon={Package}>
        <ErrorState title="Error" message={result.error.message} />
      </ReportCard>
    )
  }

  const data = result.data
  // Defense-in-depth: ensure data is an array before .length/.map
  const lotsItems = Array.isArray(data) ? data : []
  if (lotsItems.length === 0) {
    return (
      <ReportCard title="Lotes" description="Registro de lotes de compra" icon={Package}>
        <EmptyState title="Sin lotes" description="No hay lotes de compra registrados." />
      </ReportCard>
    )
  }

  return (
    <ReportCard title="Lotes" description="Registro de lotes de compra" icon={Package}>
      <div className="space-y-2 max-h-64 overflow-y-auto">
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
                {lot.remainingQuantity}/{lot.purchasedQuantity ?? lot.quantity} un.
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(Math.round(lot.unitCost * 100))} c/u
              </p>
            </div>
          </div>
        ))}
      </div>
    </ReportCard>
  )
}

// ── Exported component ──────────────────────────────────────────────

export function ReportCards() {
  return (
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
      <Suspense fallback={<ReportCardSkeleton />}>
        <StockByProductCard />
      </Suspense>
      <Suspense fallback={<ReportCardSkeleton />}>
        <LotsCard />
      </Suspense>
    </div>
  )
}
