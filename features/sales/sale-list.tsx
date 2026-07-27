import { Suspense } from 'react'
import Link from 'next/link'
import { ShoppingCart, Search, X, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

import { listSales, type SalesListQuery, type SalesListRow } from '@/shared/api/sales'
import { saleChannelLabels } from '@/shared/api/schemas'
import { formatCurrency, formatDateTime } from '@/shared/api/formatters'
import { buildSalesPageUrl } from '@/app/(app)/sales/page-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button, buttonVariants } from '@/components/ui/button'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { cn } from '@/lib/utils'

import { GarmentCell } from './sale-garment-cell'
import { SaleSettlementButton } from './sale-settlement-button'

interface SaleListProps {
  query?: SalesListQuery
}

export function SaleList({ query }: SaleListProps) {
  return (
    <Suspense fallback={<LoadingState rows={5} title="Cargando ventas..." />}>
      <SaleListContent query={query} />
    </Suspense>
  )
}

/** Compute next sort state for a given field using three-state toggle. */
function toggleSort(currentQuery: SalesListQuery, field: string): Partial<SalesListQuery> {
  if (currentQuery.sortBy === field) {
    if (currentQuery.sortOrder === 'asc') return { sortOrder: 'desc' }
    // Already desc → remove sort
    return { sortBy: undefined, sortOrder: undefined }
  }
  return { sortBy: field as SalesListQuery['sortBy'], sortOrder: 'asc' }
}

/** Sort indicator icon for a column header. */
function SortIcon({ query, field }: { query: SalesListQuery; field: string }) {
  if (query.sortBy !== field) {
    return <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/50" />
  }
  if (query.sortOrder === 'asc') {
    return <ArrowUp className="w-3.5 h-3.5 text-primary" />
  }
  return <ArrowDown className="w-3.5 h-3.5 text-primary" />
}

/** Returns true when any filter or sort is active — used to show the clear-filters action. */
function hasActiveFilters(query: SalesListQuery): boolean {
  return Boolean(
    query.search || query.status || query.paymentStatus || query.sortBy || query.sortOrder,
  )
}

/** Exported for testing — renders the sale table from fetched data. */
export async function SaleListContent({ query }: { query?: SalesListQuery }) {
  const result = await listSales(query)

  if (!result.ok) {
    return (
      <ErrorState
        title="Error al cargar ventas"
        message={result.error.message}
      />
    )
  }

  const { items: sales, total, page, pageSize, totalPages } = result.data

  const currentQuery = query ?? {}

  return (
    <div className="space-y-4">
      {/* ── Filter controls ───────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search form — preserves active filters/sort via hidden inputs */}
        <form
          role="search"
          method="GET"
          action="/sales"
          className="flex gap-2 w-full sm:w-auto"
        >
          <Input
            type="text"
            name="search"
            placeholder="Buscar por cliente..."
            defaultValue={(currentQuery.search as string) ?? ''}
            className="w-full sm:w-64"
          />
          <button
            type="submit"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1 shrink-0')}
            aria-label="Buscar"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Buscar</span>
          </button>
          {/* Hidden inputs preserve current filter + sort state on submit */}
          {currentQuery.status && <input type="hidden" name="status" value={currentQuery.status} />}
          {currentQuery.paymentStatus && <input type="hidden" name="paymentStatus" value={currentQuery.paymentStatus} />}
          {currentQuery.sortBy && <input type="hidden" name="sortBy" value={currentQuery.sortBy} />}
          {currentQuery.sortOrder && <input type="hidden" name="sortOrder" value={currentQuery.sortOrder} />}
        </form>

        {/* Status filter */}
        <nav className="flex items-center gap-1" aria-label="Filtro de estado">
          <Link
            href={buildSalesPageUrl(currentQuery, { status: undefined, page: undefined })}
            className={cn(
              buttonVariants({ variant: currentQuery.status === undefined ? 'default' : 'outline', size: 'sm' }),
            )}
            scroll={false}
          >
            Todos
          </Link>
          <Link
            href={buildSalesPageUrl(currentQuery, { status: 'ACTIVE', page: undefined })}
            className={cn(
              buttonVariants({ variant: currentQuery.status === 'ACTIVE' ? 'default' : 'outline', size: 'sm' }),
            )}
            scroll={false}
          >
            Activas
          </Link>
          <Link
            href={buildSalesPageUrl(currentQuery, { status: 'CANCELLED', page: undefined })}
            className={cn(
              buttonVariants({ variant: currentQuery.status === 'CANCELLED' ? 'default' : 'outline', size: 'sm' }),
            )}
            scroll={false}
          >
            Canceladas
          </Link>
        </nav>

        {/* Payment status filter */}
        <nav className="flex items-center gap-1" aria-label="Filtro de pago">
          <Link
            href={buildSalesPageUrl(currentQuery, { paymentStatus: undefined, page: undefined })}
            className={cn(
              buttonVariants({ variant: currentQuery.paymentStatus === undefined ? 'default' : 'outline', size: 'sm' }),
            )}
            scroll={false}
          >
            Todos
          </Link>
          <Link
            href={buildSalesPageUrl(currentQuery, { paymentStatus: 'pending', page: undefined })}
            className={cn(
              buttonVariants({ variant: currentQuery.paymentStatus === 'pending' ? 'default' : 'outline', size: 'sm' }),
            )}
            scroll={false}
          >
            Pendientes
          </Link>
          <Link
            href={buildSalesPageUrl(currentQuery, { paymentStatus: 'partial', page: undefined })}
            className={cn(
              buttonVariants({ variant: currentQuery.paymentStatus === 'partial' ? 'default' : 'outline', size: 'sm' }),
            )}
            scroll={false}
          >
            Parciales
          </Link>
          <Link
            href={buildSalesPageUrl(currentQuery, { paymentStatus: 'paid', page: undefined })}
            className={cn(
              buttonVariants({ variant: currentQuery.paymentStatus === 'paid' ? 'default' : 'outline', size: 'sm' }),
            )}
            scroll={false}
          >
            Pagadas
          </Link>
        </nav>

        {/* Clear filters — visible only when at least one filter is active */}
        {hasActiveFilters(currentQuery) && (
          <Link
            href="/sales"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1 shrink-0')}
            scroll={false}
            aria-label="Limpiar filtros"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Limpiar filtros</span>
          </Link>
        )}
      </div>

      {sales.length === 0 ? (
        <EmptyState
          title="Sin ventas"
          description="No se encontraron ventas con los filtros actuales."
        />
      ) : (
        /* ── Sales table ────────────────────── */
        <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Listado de ventas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-right py-3 px-4 font-medium">
                    <Link
                      href={buildSalesPageUrl(currentQuery, toggleSort(currentQuery, 'createdAt'))}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      aria-label="Ordenar por fecha"
                      scroll={false}
                    >
                      Fecha
                      <SortIcon query={currentQuery} field="createdAt" />
                    </Link>
                  </th>
                  <th className="text-left py-3 px-4 font-medium">Cliente</th>
                  <th className="text-left py-3 px-4 font-medium">Canal</th>
                  <th className="text-left py-3 px-4 font-medium">Estado</th>
                  <th className="text-right py-3 px-4 font-medium">
                    <Link
                      href={buildSalesPageUrl(currentQuery, toggleSort(currentQuery, 'totalRevenueCents'))}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      aria-label="Ordenar por ingreso"
                      scroll={false}
                    >
                      Ingreso
                      <SortIcon query={currentQuery} field="totalRevenueCents" />
                    </Link>
                  </th>
                  <th className="text-right py-3 px-4 font-medium">
                    <Link
                      href={buildSalesPageUrl(currentQuery, toggleSort(currentQuery, 'totalCostCents'))}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      aria-label="Ordenar por costo"
                      scroll={false}
                    >
                      Costo
                      <SortIcon query={currentQuery} field="totalCostCents" />
                    </Link>
                  </th>
                  <th className="text-right py-3 px-4 font-medium">
                    <Link
                      href={buildSalesPageUrl(currentQuery, toggleSort(currentQuery, 'grossProfitCents'))}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      aria-label="Ordenar por ganancia"
                      scroll={false}
                    >
                      Ganancia
                      <SortIcon query={currentQuery} field="grossProfitCents" />
                    </Link>
                  </th>
                  <th className="text-right py-3 px-4 font-medium">Líneas</th>
                  <th className="text-left py-3 px-4 font-medium">Prenda</th>
                  <th className="text-left py-3 px-4 font-medium">Estado Pago</th>
                  <th className="text-right py-3 px-4 font-medium">Pagado</th>
                  <th className="text-right py-3 px-4 font-medium">Pendiente</th>
                  <th className="text-left py-3 px-4 font-medium">ID</th>
                  <th className="text-right py-3 px-4 font-medium" />
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr
                    key={sale.saleId}
                    className="border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-xs text-right text-muted-foreground whitespace-nowrap tabular-nums">
                      {formatDateTime(sale.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/sales/${sale.saleId}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {sale.customerName || '—'}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-sm">{saleChannelLabels[sale.channel as keyof typeof saleChannelLabels] ?? sale.channel}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={sale.status} />
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium tabular-nums">
                      {formatCurrency(sale.totalRevenueCents)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-muted-foreground tabular-nums">
                      {formatCurrency(sale.totalCostCents)}
                    </td>
                    <td className={cn(
                      'py-3 px-4 text-sm text-right font-semibold tabular-nums',
                      sale.grossProfitCents >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                    )}>
                      {formatCurrency(sale.grossProfitCents)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right tabular-nums">
                      {sale.lineCount}
                    </td>
                    <td className="py-3 px-4">
                      <GarmentCell items={sale.items} />
                    </td>
                    <td className="py-3 px-4">
                      <PaymentStatusBadge status={sale.paymentStatus} />
                    </td>
                    <td className="py-3 px-4 text-sm text-right tabular-nums">
                      {formatCurrency(sale.amountPaidCents)}
                    </td>
                    <td className={cn(
                      'py-3 px-4 text-sm text-right font-medium tabular-nums',
                      sale.pendingBalanceCents > 0 && 'text-amber-600 dark:text-amber-400',
                    )}>
                      {formatCurrency(sale.pendingBalanceCents)}
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/sales/${sale.saleId}`}
                        className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
                      >
                        {sale.saleId.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <SaleSettlementButton
                        saleId={sale.saleId}
                        canSettleBalance={sale.canSettleBalance}
                        pendingBalanceCents={sale.pendingBalanceCents}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>

        {/* ── Pagination ───────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages} ({total} ventas)
            </p>
            <nav className="flex items-center gap-1" aria-label="Paginación de ventas">
              {page > 1 ? (
                <Link
                  href={buildSalesPageUrl(currentQuery, { page: String(page - 1) })}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
                  aria-label="Página anterior"
                  scroll={false}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </Link>
              ) : (
                <span
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1 opacity-50 cursor-not-allowed')}
                  aria-label="Página anterior"
                  aria-disabled="true"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </span>
              )}

              {page < totalPages ? (
                <Link
                  href={buildSalesPageUrl(currentQuery, { page: String(page + 1) })}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
                  aria-label="Página siguiente"
                  scroll={false}
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <span
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1 opacity-50 cursor-not-allowed')}
                  aria-label="Página siguiente"
                  aria-disabled="true"
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              )}
            </nav>
          </div>
        )}
      </Card>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'ACTIVE'
      ? 'default'
      : status === 'CANCELLED'
        ? 'destructive'
        : 'secondary'

  const label =
    status === 'ACTIVE'
      ? 'Activa'
      : status === 'CANCELLED'
        ? 'Cancelada'
        : 'Devuelta'

  return (
    <Badge variant={variant as 'default' | 'destructive' | 'secondary'} className="text-xs">
      {label}
    </Badge>
  )
}

function PaymentStatusBadge({ status }: { status: string }) {
  const variant =
    status === 'paid'
      ? 'default'
      : status === 'pending'
        ? 'secondary'
        : 'outline'

  const label =
    status === 'paid'
      ? 'Pagado'
      : status === 'pending'
        ? 'Pendiente'
        : 'Parcial'

  return (
    <Badge variant={variant} className="text-xs">
      {label}
    </Badge>
  )
}
