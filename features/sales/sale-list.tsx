import { Suspense } from 'react'
import Link from 'next/link'
import { ShoppingCart, ArrowUpDown } from 'lucide-react'

import { listSales, type ListSalesFilters, type SaleListItem } from '@/shared/api/sales'
import { saleChannelLabels } from '@/shared/api/schemas'
import { formatCurrency, formatDateTime } from '@/shared/api/formatters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'

interface SaleListProps {
  filters?: ListSalesFilters
}

export function SaleList({ filters }: SaleListProps) {
  return (
    <Suspense fallback={<LoadingState rows={5} title="Cargando ventas..." />}>
      <SaleListContent filters={filters} />
    </Suspense>
  )
}

async function SaleListContent({ filters }: { filters?: ListSalesFilters }) {
  const result = await listSales(filters)

  if (!result.ok) {
    return (
      <ErrorState
        title="Error al cargar ventas"
        message={result.error.message}
      />
    )
  }

  const sales = result.data

  if (sales.length === 0) {
    return (
      <EmptyState
        title="Sin ventas"
        description="No se encontraron ventas con los filtros actuales."
      />
    )
  }

  return (
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
                <th className="text-left py-3 px-4 font-medium">ID</th>
                <th className="text-left py-3 px-4 font-medium">Canal</th>
                <th className="text-left py-3 px-4 font-medium">Estado</th>
                <th className="text-right py-3 px-4 font-medium">Ingreso</th>
                <th className="text-right py-3 px-4 font-medium">Costo</th>
                <th className="text-right py-3 px-4 font-medium">Ganancia</th>
                <th className="text-right py-3 px-4 font-medium">Líneas</th>
                <th className="text-right py-3 px-4 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr
                  key={sale.saleId}
                  className="border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <Link
                      href={`/sales/${sale.saleId}`}
                      className="text-sm font-mono text-primary hover:underline"
                    >
                      {sale.saleId.slice(0, 8)}...
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-sm">{saleChannelLabels[sale.channel as keyof typeof saleChannelLabels] ?? sale.channel}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={sale.status} />
                  </td>
                  <td className="py-3 px-4 text-sm text-right">
                    {formatCurrency(sale.totalRevenueCents)}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-muted-foreground">
                    {formatCurrency(sale.totalCostCents)}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-medium">
                    {formatCurrency(sale.grossProfitCents)}
                  </td>
                  <td className="py-3 px-4 text-sm text-right">
                    {sale.lineCount}
                  </td>
                  <td className="py-3 px-4 text-xs text-right text-muted-foreground">
                    {formatDateTime(sale.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
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
