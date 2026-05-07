import type { Metadata } from 'next'
import { ReportCards } from '@/features/reports/report-cards'

export const metadata: Metadata = {
  title: 'Reportes — Complicidad',
}

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reportes</h1>
        <p className="text-muted-foreground">
          Reportes financieros y operativos. Todos los valores en pesos argentinos (ARS).
          Los datos se cargan directamente del backend sin caché.
        </p>
      </div>

      <ReportCards />
    </div>
  )
}
