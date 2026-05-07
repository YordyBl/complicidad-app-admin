import type { Metadata } from 'next'
import Link from 'next/link'
import { Banknote, AlertTriangle } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CashClosingForm } from '@/features/cash/closing-form'

export const metadata: Metadata = {
  title: 'Caja — Complicidad',
}

export default function CashPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Caja</h1>
        <p className="text-muted-foreground">Cierre manual de caja.</p>
      </div>

      <div className="max-w-2xl">
        <CashClosingForm />
      </div>

      {/* Info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información</CardTitle>
          <CardDescription>
            El cierre manual de caja registra un snapshot financiero del estado
            actual de la caja.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-4">
            <li>El cierre es una operación manual que debe realizarse con cuidado.</li>
            <li>Una vez confirmado, el cierre queda registrado permanentemente.</li>
            <li>Los reportes financieros reflejarán el estado posterior al cierre.</li>
            <li>Se requiere confirmación explícita antes de ejecutar la operación.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
