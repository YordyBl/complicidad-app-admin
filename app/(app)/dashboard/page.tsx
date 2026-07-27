import type { Metadata } from 'next'
import Link from 'next/link'
import { requireSession } from '@/shared/auth/session'
import { checkHealth } from '@/shared/api/health'
import { getCurrentCashBox } from '@/shared/api/cash'
import { getSalesTotal, getLiquidity, getGrossProfit, getOperatingCapital, getStockInvestment, getStockByProduct } from '@/shared/api/reports'
import { listSales } from '@/shared/api/sales'
import { formatCurrency, formatDateTime } from '@/shared/api/formatters'
import type { SalesTotalReport, LiquidityReport, GrossProfitReport, OperatingCapitalReport, StockByProductItem } from '@/shared/api/schemas'
import { KpiCard } from '@/features/dashboard/kpi-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Banknote,
  TrendingUp,
  Wallet,
  PiggyBank,
  ShoppingCart,
  PackagePlus,
  ArchiveRestore,
  AlertTriangle,
  CircleDot,
  ArrowRightLeft,
  Receipt,
  Clock,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Panel — Complicidad',
}

// ── Status indicator for values ────────────────────────────────

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-flex w-2 h-2 rounded-full shrink-0 ${
        ok ? 'bg-green-500' : 'bg-red-500'
      }`}
      aria-hidden="true"
    />
  )
}

// ── Helper to format a cents value safely ──────────────────────

function safeFormat(cents: number | undefined | null): string {
  if (cents == null) return '—'
  return formatCurrency(cents)
}

// ── Main Page ──────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await requireSession()

  // ── Parallel data fetch — no waterfalls ──────────────────────
  const [
    health,
    cashBoxResult,
    salesTotalResult,
    liquidityResult,
    grossProfitResult,
    opCapitalResult,
    stockInvestResult,
    recentSalesResult,
    stockByProductResult,
  ] = await Promise.all([
    checkHealth(),
    getCurrentCashBox(),
    getSalesTotal(),
    getLiquidity(),
    getGrossProfit(),
    getOperatingCapital(),
    getStockInvestment(),
    listSales({ page: '1', pageSize: '5', sortBy: 'createdAt', sortOrder: 'desc' }),
    getStockByProduct({ page: 1, pageSize: 5 }),
  ])

  // ── Unwrap and handle partial failures gracefully ────────────
  const cashBox = cashBoxResult.ok ? cashBoxResult.data : null
  const salesTotal: SalesTotalReport | null = salesTotalResult.ok ? salesTotalResult.data : null
  const liquidity: LiquidityReport | null = liquidityResult.ok ? liquidityResult.data : null
  const grossProfit: GrossProfitReport | null = grossProfitResult.ok ? grossProfitResult.data : null
  const opCapital: OperatingCapitalReport | null = opCapitalResult.ok ? opCapitalResult.data : null
  const stockInvest = stockInvestResult.ok ? stockInvestResult.data : null
  const recentSales = recentSalesResult.ok ? recentSalesResult.data : null
  const lowStockItems: StockByProductItem[] =
    stockByProductResult.ok && stockByProductResult.data?.items
      ? stockByProductResult.data.items.filter((i) => i.totalRemainingQty === 0)
      : []

  return (
    <div className="space-y-6">
      {/* ── Page Header — operational pulse ──────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Panel de control
          </h1>
          <p className="text-sm text-muted-foreground">
            {session.user.name || session.user.email}{' '}
            <span className="mx-1 text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1.5">
              <StatusDot ok={health.ok} />
              {health.ok ? 'Sistema operativo' : 'Backend no disponible'}
            </span>
          </p>
        </div>

        {/* Cash box status chip */}
        {cashBox && (
          <div className="flex items-center gap-2 text-sm rounded-lg border px-3 py-1.5 bg-background">
            <span className="text-muted-foreground">Caja</span>
            <Badge
              variant={cashBox.status === 'OPEN' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {cashBox.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
            </Badge>
            <span className="font-medium tabular-nums">
              {safeFormat(cashBox.currentBalanceCents)}
            </span>
          </div>
        )}
      </div>

      <Separator />

      {/* ── KPI Cards Row — real financial data ───────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
          label="Ganancia bruta"
          value={safeFormat(grossProfit?.grossProfitCents)}
          emphasis={grossProfit && grossProfit.grossProfitCents >= 0 ? 'positive' : 'negative'}
          icon={<PiggyBank className="w-4 h-4" />}
        />
        <KpiCard
          label="Liquidez disponible"
          value={safeFormat(liquidity?.liquidityCents)}
          emphasis="neutral"
          icon={<Wallet className="w-4 h-4" />}
        />
        <KpiCard
          label="Capital operativo"
          value={safeFormat(opCapital?.operatingCapitalCents)}
          emphasis="default"
          icon={<Banknote className="w-4 h-4" />}
        />
      </div>

      {/* ── Secondary metrics row ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Inversión en stock
            </p>
            <p className="text-lg font-bold tabular-nums mt-1">
              {safeFormat(stockInvest?.totalInvestmentCents)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Caja actual
            </p>
            <p className="text-lg font-bold tabular-nums mt-1">
              {cashBox ? safeFormat(cashBox.currentBalanceCents) : '—'}
            </p>
            {cashBox && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {cashBox.businessDate
                  ? new Date(cashBox.businessDate).toLocaleDateString('es-PE', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '—'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Margen bruto
            </p>
            <p className="text-lg font-bold tabular-nums mt-1">
              {salesTotal && grossProfit && salesTotal.totalSalesCents > 0
                ? `${((grossProfit.grossProfitCents / salesTotal.totalSalesCents) * 100).toFixed(1)}%`
                : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sobre ventas totales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Acciones rápidas
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/sales/new">
              <ShoppingCart className="w-4 h-4" />
              Nueva venta
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/inventory/purchases/new">
              <PackagePlus className="w-4 h-4" />
              Registrar compra
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/cash/closings/new">
              <ArchiveRestore className="w-4 h-4" />
              Cerrar caja
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/customers/new">
              <CircleDot className="w-4 h-4" />
              Nuevo cliente
            </Link>
          </Button>
        </div>
      </section>

      {/* ── Main content: Recent Activity + Alerts ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales — 2/3 width on large screens */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Actividad reciente
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sales">
                Ver todas
                <ArrowRightLeft className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>

          <Card>
            {recentSales && recentSales.items.length > 0 ? (
              <div className="divide-y divide-border">
                {recentSales.items.map((sale) => (
                  <Link
                    key={sale.saleId}
                    href={`/sales/${sale.saleId}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0">
                        <Receipt className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {sale.customerName || 'Cliente'}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          {sale.createdAt
                            ? formatDateTime(sale.createdAt)
                            : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold tabular-nums">
                        {safeFormat(sale.totalRevenueCents)}
                      </p>
                      <Badge
                        variant={
                          sale.paymentStatus === 'paid'
                            ? 'default'
                            : sale.paymentStatus === 'partial'
                              ? 'secondary'
                              : 'outline'
                        }
                        className="text-[10px] mt-0.5"
                      >
                        {sale.paymentStatus === 'paid'
                          ? 'Pagado'
                          : sale.paymentStatus === 'partial'
                            ? 'Parcial'
                            : 'Pendiente'}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No hay ventas recientes</p>
                <p className="text-xs mt-1">
                  Las ventas registradas aparecerán aquí
                </p>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Low Stock Alerts — 1/3 width on large screens */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Alertas de stock
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/inventory">
                Inventario
                <ArrowRightLeft className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>

          <Card>
            {lowStockItems.length > 0 ? (
              <div className="divide-y divide-border">
                {lowStockItems.map((item) => (
                  <Link
                    key={item.variantId}
                    href={`/inventory/products/${item.productId}`}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="shrink-0 mt-0.5">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {item.productName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        SKU: {item.sku} · Stock agotado
                      </p>
                    </div>
                    <span className="text-xs font-medium text-red-600 dark:text-red-400 shrink-0 tabular-nums">
                      {safeFormat(item.investmentCents)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>Sin alertas de stock bajo</p>
                <p className="text-xs mt-1">
                  Todos los productos tienen stock disponible
                </p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
