import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCustomer } from '@/shared/api/customers'
import { CustomerForm } from '@/features/customers/customer-form'

export const metadata: Metadata = {
  title: 'Editar cliente — Complicidad',
}

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const result = await getCustomer(id)

  if (!result.ok) {
    if (result.error.status === 404) {
      notFound()
    }
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Editar cliente</h1>
        <p className="text-destructive">Error al cargar cliente: {result.error.message}</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Editar cliente</h1>
      <CustomerForm customer={result.data} />
    </div>
  )
}
