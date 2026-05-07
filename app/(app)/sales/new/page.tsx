import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SaleForm } from '@/features/sales/sale-form'
import { PageLoading } from '@/components/ui/loading-state'

export const metadata: Metadata = {
  title: 'Nueva venta — Complicidad',
}

export default function NewSalePage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Nueva venta</h1>
      <Suspense fallback={<PageLoading />}>
        <SaleForm />
      </Suspense>
    </div>
  )
}
