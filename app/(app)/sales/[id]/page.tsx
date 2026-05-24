import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getSale, listSaleConstanciaEmissions } from '@/shared/api/sales'
import { ErrorState } from '@/components/ui/error-state'
import { SaleDetailContent } from '@/features/sales/sale-detail-content'

export const metadata: Metadata = {
  title: 'Detalle de venta — Complicidad',
}

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [saleResult, emissionsResult] = await Promise.all([
    getSale(id),
    listSaleConstanciaEmissions(id),
  ])

  if (!saleResult.ok) {
    if (saleResult.error.status === 404) {
      notFound()
    }
    return (
      <ErrorState
        title="Error al cargar venta"
        message={saleResult.error.message}
      />
    )
  }

  const sale = saleResult.data
  const emissions = emissionsResult.ok ? emissionsResult.data : undefined

  return <SaleDetailContent sale={sale} emissions={emissions} />
}
