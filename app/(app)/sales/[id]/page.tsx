import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getSale } from '@/shared/api/sales'
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
