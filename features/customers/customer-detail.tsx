import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Pencil, ArrowLeft, ShoppingBag } from 'lucide-react'

import { getCustomer, getCustomerHistory } from '@/shared/api/customers'
import type { Customer, CustomerSaleSummary } from '@/shared/api/customers'
import { saleChannelLabels } from '@/shared/api/schemas'
import { formatCurrency, formatDate, formatDateTime } from '@/shared/api/formatters'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'

interface CustomerDetailProps {
  customerId: string
}

export function CustomerDetail({ customerId }: CustomerDetailProps) {
  return (
    <Suspense fallback={<LoadingState rows={5} title="Cargando cliente..." />}>
      <CustomerDetailContent customerId={customerId} />
    </Suspense>
  )
}

async function CustomerDetailContent({ customerId }: { customerId: string }) {
  const result = await getCustomer(customerId)

  if (!result.ok) {
    if (result.error.status === 404) {
      notFound()
    }
    return (
      <ErrorState
        title="Error al cargar cliente"
        message={result.error.message}
      />
    )
  }

  const customer = result.data

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/customers">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a clientes
          </Link>
        </Button>
      </div>

      {/* Customer header card */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl">{customer.name}</CardTitle>
            <CardDescription>
              Cliente desde {formatDate(customer.createdAt)}
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/customers/${customer.id}/edit`}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {customer.alias && (
            <DetailRow label="Alias" value={customer.alias} />
          )}
          {customer.email && (
            <DetailRow label="Email" value={customer.email} />
          )}
          {customer.phone && (
            <DetailRow label="Teléfono" value={customer.phone} />
          )}
          {customer.address && (
            <DetailRow label="Dirección" value={customer.address} />
          )}
          {customer.googleMapsUrl && (
            <DetailRow
              label="Google Maps"
              value={
                <a
                  href={customer.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm break-all"
                >
                  {customer.googleMapsUrl}
                </a>
              }
            />
          )}
          {customer.notes && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Notas</p>
              <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
            </div>
          )}
          {!customer.alias &&
            !customer.email &&
            !customer.phone &&
            !customer.address &&
            !customer.googleMapsUrl &&
            !customer.notes && (
              <p className="text-sm text-muted-foreground">
                No hay datos adicionales para este cliente.
              </p>
            )}
        </CardContent>
      </Card>

      {/* Purchase history */}
      <Suspense
        fallback={<LoadingState rows={3} title="Cargando historial de compras..." />}
      >
        <CustomerHistorySection customerId={customer.id} customerName={customer.name} />
      </Suspense>
    </div>
  )
}

async function CustomerHistorySection({
  customerId,
  customerName,
}: {
  customerId: string
  customerName: string
}) {
  const result = await getCustomerHistory(customerId)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          Historial de compras
        </CardTitle>
        <CardDescription>Compras realizadas por {customerName}</CardDescription>
      </CardHeader>
      <CardContent>
        {!result.ok ? (
          <ErrorState
            title="Error al cargar historial"
            message={result.error.message}
          />
        ) : result.data.sales.length === 0 ? (
          <EmptyState
            title="Sin historial"
            description="Este cliente no tiene compras registradas aún."
          />
        ) : (
          <div className="space-y-4">
            {result.data.sales.map((entry) => (
              <PurchaseHistoryCard key={entry.saleId} entry={entry} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PurchaseHistoryCard({ entry }: { entry: CustomerSaleSummary }) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Venta #{entry.saleId}</p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(entry.createdAt)}
          </p>
        </div>
        <Badge
          variant={
            entry.status === 'ACTIVE'
              ? 'default'
              : entry.status === 'CANCELLED'
                ? 'destructive'
                : 'secondary'
          }
        >
          {entry.status === 'ACTIVE'
            ? formatCurrency(entry.totalRevenueCents)
            : entry.status === 'CANCELLED'
              ? 'Cancelada'
              : 'Devuelta'}
        </Badge>
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>{saleChannelLabels[entry.channel as keyof typeof saleChannelLabels] ?? entry.channel}</span>
        {entry.channelReference && <span>Ref: {entry.channelReference}</span>}
        <span>{entry.lineCount} producto{entry.lineCount !== 1 ? 's' : ''}</span>
        {entry.status === 'ACTIVE' && (
          <>
            <span>Ganancia: {formatCurrency(entry.grossProfitCents)}</span>
          </>
        )}
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-muted-foreground font-medium min-w-[80px]">
        {label}
      </span>
      <span className="text-sm">{value}</span>
    </div>
  )
}

/** Re-export for convenience */
export type { Customer, CustomerSaleSummary }
