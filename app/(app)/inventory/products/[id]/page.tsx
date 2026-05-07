import type { Metadata } from 'next'
import Link from 'next/link'
import { Package, ArrowLeft, AlertCircle, AlertTriangle } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/shared/api/formatters'

import { getProductById } from '@/shared/api/inventory'

export const metadata: Metadata = {
  title: 'Detalle de producto — Complicidad',
}

// ── Page ─────────────────────────────────────────────────────

interface ProductDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params
  const result = await getProductById(id)

  // ── Error state (API failure) ───────────────────────────
  if (!result.ok) {
    const isNotFound = result.error.status === 404

    if (isNotFound) {
      return (
        <div className="space-y-6">
          <Link
            href="/inventory"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a productos
          </Link>

          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col items-center text-center gap-3">
                <AlertTriangle className="w-10 h-10 text-amber-500" />
                <div>
                  <p className="font-semibold text-amber-800">Producto no encontrado</p>
                  <p className="text-sm text-amber-700 mt-1">
                    El producto que buscás no existe o fue eliminado.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <Link
          href="/inventory"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a productos
        </Link>

        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Error al cargar el producto</p>
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

  const product = result.data

  // ── Success — Product detail ────────────────────────────
  return (
    <div className="space-y-6">
      <Link
        href="/inventory"
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a productos
      </Link>

      {/* Product info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{product.name}</CardTitle>
              {product.description && (
                <CardDescription className="mt-1">{product.description}</CardDescription>
              )}
            </div>
            <Badge
              className={cn(
                product.isActive
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {product.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">SKU Base</span>
              <p className="font-medium">{product.baseSku || '—'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Precio de venta</span>
              <p className="font-medium">{formatPrice(product.salePrice)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Precio de preventa</span>
              <p className="font-medium">
                {product.presalePrice !== null && product.presalePrice !== undefined
                  ? formatPrice(product.presalePrice)
                  : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variants table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Variantes</CardTitle>
          <CardDescription>
            {product.variants.length === 0
              ? 'No hay variantes registradas para este producto.'
              : `${product.variants.length} variante${product.variants.length !== 1 ? 's' : ''} registrada${product.variants.length !== 1 ? 's' : ''}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {product.variants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="w-10 h-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No hay variantes registradas para este producto.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">SKU</th>
                    <th className="pb-3 font-medium text-muted-foreground">Atributos</th>
                    <th className="pb-3 font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants.map((variant) => (
                    <tr key={variant.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{variant.sku}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(variant.attributes).map(([key, value]) => (
                            <span
                              key={key}
                              className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
                            >
                              {key}: {value}
                            </span>
                          ))}
                          {Object.keys(variant.attributes).length === 0 && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            variant.isActive
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {variant.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
