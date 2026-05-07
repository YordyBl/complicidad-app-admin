import type { Metadata } from 'next'
import Link from 'next/link'
import { Package, Search, ShoppingCart, Plus, AlertTriangle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

import { Input } from '@/components/ui/input'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { listProducts } from '@/shared/api/inventory'

import { normalizeSearchParams, buildPageUrl } from './page-helpers'
import { InventoryTree } from './inventory-tree'

export const metadata: Metadata = {
  title: 'Inventario — Complicidad',
}

// ── Page ─────────────────────────────────────────────────────

interface InventoryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const raw = await searchParams

  // Normalize query params from URL (Next.js searchParams can be string or string[])
  const query = normalizeSearchParams(raw)

  const result = await listProducts(query)

  // ── Error state ──────────────────────────────────────────
  if (!result.ok) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Inventario</h1>
          <p className="text-muted-foreground">Gestión de productos, búsqueda y compras.</p>
        </div>

        {/* Action cards still visible */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/inventory/products/new">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-base">Nuevo producto</CardTitle>
                <CardDescription>
                Registrar un nuevo producto con talles y precios de venta.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/inventory/purchases/new">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-base">Registrar compra</CardTitle>
                <CardDescription>
                  Registrar una nueva compra de inventario asociada a una variante.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Error card */}
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Error al cargar productos</p>
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

  const { data: items, meta } = result.data
  const currentPage = meta.page
  const totalPages = meta.totalPages

  // ── Build pagination page numbers ────────────────────────
  const pageNumbers: (number | 'ellipsis')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i)
  } else {
    pageNumbers.push(1)
    if (currentPage > 3) pageNumbers.push('ellipsis')
    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)
    for (let i = start; i <= end; i++) pageNumbers.push(i)
    if (currentPage < totalPages - 2) pageNumbers.push('ellipsis')
    pageNumbers.push(totalPages)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventario</h1>
        <p className="text-muted-foreground">Gestión de productos, búsqueda y compras.</p>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/inventory/products/new">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-base">Nuevo producto</CardTitle>
              <CardDescription>
                Registrar un nuevo producto con su variante inicial, SKU y precio base.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/inventory/purchases/new">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-base">Registrar compra</CardTitle>
              <CardDescription>
                Registrar una nueva compra de inventario asociada a una variante.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* ── Search and filter controls ────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search form */}
        <form
          role="search"
          method="GET"
          action="/inventory"
          className="flex gap-2 w-full sm:w-auto"
        >
          <Input
            type="text"
            name="search"
            placeholder="Buscar productos..."
            defaultValue={query.search ?? ''}
            className="w-full sm:w-64"
          />
          <button
            type="submit"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1 shrink-0')}
            aria-label="Buscar"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Buscar</span>
          </button>
        </form>

        {/* Status filter */}
        <nav className="flex items-center gap-1" aria-label="Filtro de estado">
          <Link
            href={buildPageUrl(query, { status: undefined, page: undefined })}
            className={cn(
              buttonVariants({ variant: query.status === undefined ? 'default' : 'outline', size: 'sm' }),
            )}
            aria-current={query.status === undefined ? 'page' : undefined}
            scroll={false}
          >
            Todos
          </Link>
          <Link
            href={buildPageUrl(query, { status: 'active', page: undefined })}
            className={cn(
              buttonVariants({ variant: query.status === 'active' ? 'default' : 'outline', size: 'sm' }),
            )}
            aria-current={query.status === 'active' ? 'page' : undefined}
            scroll={false}
          >
            Activo
          </Link>
          <Link
            href={buildPageUrl(query, { status: 'inactive', page: undefined })}
            className={cn(
              buttonVariants({ variant: query.status === 'inactive' ? 'default' : 'outline', size: 'sm' }),
            )}
            aria-current={query.status === 'inactive' ? 'page' : undefined}
            scroll={false}
          >
            Inactivo
          </Link>
        </nav>
      </div>

      {/* Product list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Lista de productos</CardTitle>
              <CardDescription>
                {meta.totalItems === 0
                  ? 'No se encontraron productos.'
                  : `${meta.totalItems} producto${meta.totalItems !== 1 ? 's' : ''} encontrado${meta.totalItems !== 1 ? 's' : ''}.`}
              </CardDescription>
            </div>
            <Link
              href="/inventory/products/new"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo</span>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="pb-0">
          {/* ── Empty state ────────────────────────────── */}
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm font-medium text-muted-foreground">
                No se encontraron productos
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {query.search
                  ? `No hay resultados para "${query.search}".`
                  : 'Comenzá registrando tu primer producto.'}
              </p>
              <Link
                href="/inventory/products/new"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4')}
              >
                <Plus className="w-4 h-4 mr-1" />
                Registrar producto
              </Link>
            </div>
          )}

          {/* ── Expandable product tree ───────────────── */}
          {items.length > 0 && <InventoryTree items={items} />}
        </CardContent>

        {/* ── Pagination ──────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <p className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </p>
            <nav className="flex items-center gap-1" aria-label="Paginación de productos">
              {/* Previous */}
              {meta.hasPreviousPage ? (
                <Link
                  href={buildPageUrl(query, { page: String(currentPage - 1) })}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </Link>
              ) : (
                <span
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1 opacity-50 cursor-not-allowed')}
                  aria-label="Página anterior"
                  aria-disabled="true"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </span>
              )}

              {/* Page numbers */}
              <div className="hidden sm:flex items-center gap-1">
                {pageNumbers.map((p, i) =>
                  p === 'ellipsis' ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">...</span>
                  ) : (
                    <Link
                      key={p}
                      href={buildPageUrl(query, { page: String(p) })}
                      className={cn(
                        buttonVariants({
                          variant: p === currentPage ? 'default' : 'outline',
                          size: 'sm',
                        }),
                        'min-w-[2.25rem]',
                      )}
                      aria-current={p === currentPage ? 'page' : undefined}
                    >
                      {p}
                    </Link>
                  ),
                )}
              </div>

              {/* Next */}
              {meta.hasNextPage ? (
                <Link
                  href={buildPageUrl(query, { page: String(currentPage + 1) })}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
                  aria-label="Página siguiente"
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <span
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1 opacity-50 cursor-not-allowed')}
                  aria-label="Página siguiente"
                  aria-disabled="true"
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              )}
            </nav>
          </div>
        )}
      </Card>
    </div>
  )
}
