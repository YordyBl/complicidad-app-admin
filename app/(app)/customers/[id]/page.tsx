import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { CustomerDetail } from '@/features/customers/customer-detail'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Detalle de cliente — Complicidad',
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <CustomerDetail customerId={id} />
}
