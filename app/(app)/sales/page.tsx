import type { Metadata } from 'next'
import Link from 'next/link'
import { ShoppingCart, TrendingUp, Receipt, Users } from 'lucide-react'

import { getSalesTotal } from '@/shared/api/reports'
import { formatCurrency } from '@/shared/api/formatters'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { KpiCard } from '@/features/dashboard/kpi-card'
import { ReversalForm } from '@/features/sales/reversal-form'
import { SaleList } from '@/features/sales/sale-list'
import { normalizeSalesSearchParams } from './page-helpers'

export const metadata: Metadata = {
  title: 'Ventas — Complicidad',
}

interface SalesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SalesPage({ searchParams }: SalesPageProps) {
  const raw = await searchParams
  const query = normalizeSalesSearchParams(raw)

  // Fetch operational summary in parallel (the SaleList fetches itself internally)
  const salesTotalResult = await getSalesTotal()
  const salesTotal = salesTotalResult.ok ? salesTotalResult.data : null

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ventas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Nueva venta, cancelación, devolución y seguimiento comercial.
          Todos los valores en soles peruanos (PEN).
        </p>
      </div>

      <Separator />

      {/* ── Operational Summary ─────────────── */}
      {salesTotal && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Resumen operativo
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KpiCard
              label="Ventas activas"
              value={String(salesTotal.activeSaleCount)}
              emphasis="default"
              icon={<Receipt className="w-4 h-4" />}
            />
            <KpiCard
              label="Ingreso total"
              value={formatCurrency(salesTotal.totalSalesCents)}
              emphasis="positive"
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <KpiCard
              label="Moneda"
              value="PEN"
              subtitle="Soles peruanos"
              emphasis="neutral"
              icon={<Users className="w-4 h-4" />}
            />
          </div>
        </section>
      )}

      <Separator />

      {/* ── Quick Actions ───────────────────── */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Acciones
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* New sale card */}
          <Link href="/sales/new" className="h-full">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-base">Nueva venta</CardTitle>
                <CardDescription>
                  Seleccioná un cliente, buscá productos y registrá la venta.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          {/* Reversal actions */}
          <ReversalForm action="cancel" />
          <ReversalForm action="return" />
        </div>
      </section>

      <Separator />

      {/* ── Sale List ───────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Listado
        </h2>
        <SaleList query={query} />
      </section>
    </div>
  )
}
