import type { Metadata } from 'next'
import { PurchaseForm } from '@/features/inventory/purchase-form'

export const metadata: Metadata = {
  title: 'Registrar compra — Complicidad',
}

export default function NewPurchasePage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Registrar compra</h1>
      <PurchaseForm />
    </div>
  )
}
