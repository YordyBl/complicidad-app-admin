import type { Metadata } from 'next'
import { CashClosingForm } from '@/features/cash/closing-form'

export const metadata: Metadata = {
  title: 'Nuevo cierre — Complicidad',
}

export default function NewCashClosingPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Nuevo cierre de caja</h1>
      <CashClosingForm />
    </div>
  )
}
