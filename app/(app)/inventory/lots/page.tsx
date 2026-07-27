import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Package, AlertCircle, Layers } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { listInventoryLots } from '@/shared/api/inventory'
import { InventoryLotsView } from '@/features/inventory/inventory-lots-view'

export const metadata: Metadata = {
  title: 'Stock en lotes — Complicidad',
}

// ── Page ───────────────────────────────────────────────────────

interface InventoryLotsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function InventoryLotsPage({ searchParams }: InventoryLotsPageProps) {
  const raw = await searchParams

  const productId = typeof raw.productId === 'string' ? raw.productId : undefined
  const variantId = typeof raw.variantId === 'string' ? raw.variantId : undefined

  const result = await listInventoryLots({ productId, variantId })

  // Anyone who can access the lots screen can adjust lots.
  // Action visibility is driven by backend allowedAction, not frontend role checks.
  const canAdjust = true

  // ── Error state ───────────────────────────────────────────
  if (!result.ok) {
    return (
      <div className="space-y-6">
        <Link
          href="/inventory"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock en lotes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión de lotes y ajustes de inventario.
          </p>
        </div>

        <Separator />

        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Error al cargar lotes</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.error.message}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { data } = result

  // ── Operational summary (computed from real data) ──────────
  const allLots = data.variants.flatMap((v) => v.lots)
  const totalLots = allLots.length
  const intactLots = allLots.filter((l) => l.state === 'INTACT').length
  const historicalLots = allLots.filter((l) => l.state === 'HISTORICAL').length
  const exhaustedLots = allLots.filter((l) => l.state === 'EXHAUSTED').length
  const totalUnits = allLots.reduce((sum, l) => sum + l.remainingQuantity, 0)

  // ── Empty state ───────────────────────────────────────────
  if (data.variants.length === 0) {
    return (
      <div className="space-y-6">
        <Link
          href="/inventory"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock en lotes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión de lotes y ajustes de inventario.
          </p>
        </div>

        <Separator />

        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm font-medium text-muted-foreground">
                No hay lotes
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                No se encontraron lotes para los filtros seleccionados.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Data state ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <Link
        href="/inventory"
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a inventario
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock en lotes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestión y trazabilidad de lotes de inventario con ajustes operativos.
        </p>
      </div>

      <Separator />

      {/* ── Operational summary bar ───────────────────── */}
      {totalLots > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Resumen de lotes
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card>
              <CardContent className="p-3 flex flex-col justify-center h-full">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total lotes
                </p>
                <p className="text-lg font-bold tabular-nums mt-0.5">{totalLots}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex flex-col justify-center h-full">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Intactos
                </p>
                <p className="text-lg font-bold tabular-nums mt-0.5 text-green-600 dark:text-green-400">
                  {intactLots}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex flex-col justify-center h-full">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Históricos
                </p>
                <p className="text-lg font-bold tabular-nums mt-0.5 text-amber-600 dark:text-amber-400">
                  {historicalLots}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex flex-col justify-center h-full">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Agotados
                </p>
                <p className="text-lg font-bold tabular-nums mt-0.5 text-muted-foreground">
                  {exhaustedLots}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex flex-col justify-center h-full">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Unidades
                </p>
                <p className="text-lg font-bold tabular-nums mt-0.5">{totalUnits}</p>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      <InventoryLotsView
        productId={productId}
        variantId={variantId}
        data={data}
        canAdjust={canAdjust}
      />

      {/* Product context hint */}
      {data.product && (
        <p className="text-xs text-muted-foreground text-center">
          Lotes de{' '}
          <span className="font-medium">{data.product.name}</span>
        </p>
      )}
    </div>
  )
}
