import type { Metadata } from 'next'
import { ProductForm } from '@/features/inventory/product-form'

export const metadata: Metadata = {
  title: 'Nuevo producto — Complicidad',
}

export default function NewProductPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Nuevo producto</h1>
      <ProductForm />
    </div>
  )
}
