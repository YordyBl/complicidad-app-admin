import type { Metadata } from 'next'
import { CustomerForm } from '@/features/customers/customer-form'

export const metadata: Metadata = {
  title: 'Nuevo cliente — Complicidad',
}

export default function NewCustomerPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Nuevo cliente</h1>
      <CustomerForm />
    </div>
  )
}
