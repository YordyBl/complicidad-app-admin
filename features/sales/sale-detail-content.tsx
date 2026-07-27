'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, MessageSquare, ShoppingCart, User } from 'lucide-react'

import type { SaleDetail } from '@/shared/api/sales'
import type { SaleConstanciaEmissionSummary } from '@/shared/api/schemas'
import { saleChannelLabels } from '@/shared/api/schemas'
import { formatCurrency, formatDateTime } from '@/shared/api/formatters'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SaleDocumentsCard } from '@/features/sales/sale-documents-card'
import { DeliveryMessageDialog } from '@/features/sales/delivery-message-dialog'
import { SaleSettlementButton } from '@/features/sales/sale-settlement-button'

export function SaleDetailContent({
  sale,
  emissions,
}: {
  sale: SaleDetail
  emissions?: SaleConstanciaEmissionSummary[]
}) {
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false)

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

      {/* Sale header — KPI-style money */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              Venta #{sale.id.slice(0, 8)}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <span>{formatDateTime(sale.createdAt)}</span>
              <span className="text-muted-foreground/40">·</span>
              <span>{saleChannelLabels[sale.channel as keyof typeof saleChannelLabels] ?? sale.channel}</span>
            </CardDescription>
          </div>
          <StatusBadge status={sale.status} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ingreso</p>
              <p className="text-xl sm:text-2xl font-bold tracking-tight tabular-nums mt-0.5">
                {formatCurrency(sale.totalRevenueCents)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Costo</p>
              <p className="text-xl sm:text-2xl font-bold tracking-tight tabular-nums mt-0.5 text-muted-foreground">
                {formatCurrency(sale.totalCostCents)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ganancia</p>
              <p className={`text-xl sm:text-2xl font-bold tracking-tight tabular-nums mt-0.5 ${
                sale.grossProfitCents >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {formatCurrency(sale.grossProfitCents)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Líneas</p>
              <p className="text-xl sm:text-2xl font-bold tracking-tight tabular-nums mt-0.5">
                {sale.lines.length}
              </p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            ID: <span className="font-mono">{sale.id}</span>
          </div>
        </CardContent>
      </Card>

      {/* Customer info */}
      {(sale.customerName || sale.customerPhone || sale.customerAddress || sale.customerDistrict || sale.googleMapsUrl) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {sale.customerName && (
                <DetailItem label="Nombre" value={sale.customerName} />
              )}
              {sale.customerPhone && (
                <DetailItem label="Teléfono" value={sale.customerPhone} />
              )}
              {sale.customerAddress && (
                <DetailItem label="Dirección" value={sale.customerAddress} />
              )}
              {sale.customerDistrict && (
                <DetailItem label="Distrito" value={sale.customerDistrict} />
              )}
              {sale.googleMapsUrl && (
                <DetailItem label="Google Maps" value={sale.googleMapsUrl} />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment snapshot — prominent when pending */}
      <Card className={(sale.pendingBalanceCents ?? 0) > 0 ? 'border-amber-200 dark:border-amber-900' : ''}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Estado de pago</CardTitle>
          <PaymentStatusBadge status={sale.paymentStatus ?? 'pending'} />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pagado</p>
              <p className="text-lg font-bold tabular-nums mt-0.5">
                {formatCurrency(sale.amountPaidCents ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pendiente</p>
              <p className={`text-lg font-bold tabular-nums mt-0.5 ${
                (sale.pendingBalanceCents ?? 0) === 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}>
                {formatCurrency(sale.pendingBalanceCents ?? 0)}
              </p>
            </div>
            {(sale.pendingBalanceCents ?? 0) > 0 && (
              <div className="col-span-2 flex items-center">
                <SaleSettlementButton
                  saleId={sale.id}
                  canSettleBalance={true}
                  pendingBalanceCents={sale.pendingBalanceCents ?? 0}
                />
              </div>
            )}
            {sale.settledAt && (
              <DetailItem label="Liquidado el" value={formatDateTime(sale.settledAt)} />
            )}
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
                      {line.displayLabel ? (
                        <p className="text-sm">{line.displayLabel}</p>
                      ) : (
                        <p className="text-sm font-mono">{line.variantId.slice(0, 8)}...</p>
                      )}
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

      {/* Emission history */}
      {emissions && emissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Constancias ({emissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-3 px-4 font-medium">Emisión</th>
                    <th className="text-left py-3 px-4 font-medium">Fecha</th>
                    <th className="text-left py-3 px-4 font-medium">Versión</th>
                  </tr>
                </thead>
                <tbody>
                  {emissions.map((emission) => (
                    <tr
                      key={emission.id}
                      className="border-b last:border-b-0 hover:bg-muted/50"
                    >
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium">
                          Constancia #{emission.emissionNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {formatDateTime(emission.issuedAt)}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {emission.templateVersion}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document actions */}
      <SaleDocumentsCard
        sale={sale}
        emissions={emissions ?? []}
      />

      {/* Delivery message trigger */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Mensaje de entrega
          </CardTitle>
          <CardDescription>
            Genera un mensaje copiable con los datos del cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setDeliveryDialogOpen(true)}
            className="w-full"
            variant="outline"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Generar mensaje de entrega
          </Button>
        </CardContent>
      </Card>

      <DeliveryMessageDialog
        sale={sale}
        open={deliveryDialogOpen}
        onOpenChange={setDeliveryDialogOpen}
      />
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
  value: string | React.ReactNode
  valueClass?: string
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm mt-0.5 ${valueClass ?? ''}`}>{value}</p>
    </div>
  )
}

function PaymentStatusBadge({ status }: { status: string }) {
  const variant =
    status === 'paid'
      ? 'default'
      : status === 'partial'
        ? 'secondary'
        : 'outline'

  const label =
    status === 'paid'
      ? 'Pagado'
      : status === 'partial'
        ? 'Parcial'
        : 'Pendiente'

  return (
    <Badge variant={variant as 'default' | 'destructive' | 'secondary' | 'outline'}>
      {label}
    </Badge>
  )
}
