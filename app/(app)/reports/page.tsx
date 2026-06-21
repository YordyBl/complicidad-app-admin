import type { Metadata } from 'next'
import { normalizeReportsSearchParams } from './page-helpers'
import { ReportCards } from '@/features/reports/report-cards'

export const metadata: Metadata = {
  title: 'Reportes — Complicidad',
}

interface ReportsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const raw = await searchParams
  const queries = normalizeReportsSearchParams(raw)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reportes</h1>
        <p className="text-muted-foreground">
          Reportes financieros y operativos. Todos los valores en pesos argentinos (ARS).
          Los datos se cargan directamente del backend sin caché.
        </p>
      </div>

      <ReportCards stockQuery={queries.stock} lotsQuery={queries.lots} />
    </div>
  )
}
