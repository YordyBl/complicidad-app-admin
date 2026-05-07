import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ShoppingCart } from 'lucide-react'

import { getSale, type SaleDetail } from '@/shared/api/sales'
import { saleChannelLabels } from '@/shared/api/schemas'
import { formatCurrency, formatDateTime } from '@/shared/api/formatters'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'

export const metadata: Metadata = {
  title: 'Detalle de venta — Complicidad',
}

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const result = await getSale(id)

  if (!result.ok) {
    if (result.error.status === 404) {
      notFound()
    }
    return (
      <ErrorState
        title="Error al cargar venta"
        message={result.error.message}
      />
    )
  }

  const sale = result.data

  return <SaleDetailContent sale={sale} />
}

function SaleDetailContent({ sale }: { sale: SaleDetail }) {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/sales">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a ventas
          </Link>
        </Button>
      </div>

      {/* Sale header */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl">Venta #{sale.id.slice(0, 8)}</CardTitle>
            <CardDescription>
              {formatDateTime(sale.createdAt)}
            </CardDescription>
          </div>
          <StatusBadge status={sale.status} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DetailItem label="Canal" value={saleChannelLabels[sale.channel as keyof typeof saleChannelLabels] ?? sale.channel} />
            <DetailItem label="Ingreso total" value={formatCurrency(sale.totalRevenueCents)} />
            <DetailItem label="Costo total" value={formatCurrency(sale.totalCostCents)} />
            <DetailItem
              label="Ganancia bruta"
              value={formatCurrency(sale.grossProfitCents)}
              valueClass="font-medium text-green-600"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            ID: <span className="font-mono">{sale.id}</span>
          </div>
        </CardContent>
      </Card>

      {/* Line items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Líneas ({sale.lines.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-3 px-4 font-medium">Variante</th>
                  <th className="text-right py-3 px-4 font-medium">Cant.</th>
                  <th className="text-right py-3 px-4 font-medium">Precio unit.</th>
                  <th className="text-right py-3 px-4 font-medium">Total</th>
                  <th className="text-right py-3 px-4 font-medium">Costo</th>
                  <th className="text-center py-3 px-4 font-medium">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {sale.lines.map((line) => (
                  <tr
                    key={line.id}
                    className="border-b last:border-b-0 hover:bg-muted/50"
                  >
                    <td className="py-3 px-4">
                      <p className="text-sm font-mono">{line.variantId.slice(0, 8)}...</p>
                    </td>
                    <td className="py-3 px-4 text-sm text-right">{line.quantity}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      {formatCurrency(line.unitPriceCents)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium">
                      {formatCurrency(line.totalPriceCents)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-muted-foreground">
                      {formatCurrency(line.totalCostCents)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="outline" className="text-xs">
                        {line.priceType === 'regular' ? 'Regular' : 'Preventa'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
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
    <Badge variant={variant as 'default' | 'destructive' | 'secondary'}>
      {label}
    </Badge>
  )
}

function DetailItem({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm mt-0.5 ${valueClass ?? ''}`}>{value}</p>
    </div>
  )
}
