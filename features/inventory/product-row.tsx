'use client'

import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/shared/api/formatters'

import type { ProductListItem } from '@/shared/api/schemas'

interface ProductRowProps {
  product: ProductListItem
}

export function ProductRow({ product }: ProductRowProps) {
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0)

  return (
    <AccordionItem value={product.id} className="border-b last:border-0">
      <AccordionTrigger className="px-4 py-3 hover:no-underline data-[state=open]:bg-muted/30">
        <div className="flex w-full items-center gap-4 text-sm">
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground" />

          {/* Name */}
          <div className="flex-1 min-w-0">
            <Link
              href={`/inventory/products/${product.id}`}
              className="font-medium hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {product.name}
            </Link>
            {product.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {product.description}
              </p>
            )}
          </div>

          {/* Price */}
          <span className="hidden sm:inline w-24 text-right text-muted-foreground tabular-nums">
            {formatPrice(product.salePrice)}
          </span>

          {/* Total stock */}
          <span className="hidden md:inline w-12 text-right text-muted-foreground tabular-nums">
            {totalStock}
          </span>

          {/* Status */}
          <span className="hidden md:inline w-16 text-right">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                product.isActive
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {product.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </span>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-4 pb-4 pt-0">
        {product.variants.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            Sin variantes
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">SKU</th>
                  <th className="pb-2 font-medium hidden sm:table-cell">Atributos</th>
                  <th className="pb-2 font-medium text-right">Stock</th>
                  <th className="pb-2 font-medium text-right">Precio venta</th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((variant) => (
                  <tr key={variant.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <span className="font-mono font-medium">{variant.sku}</span>
                      {!variant.isActive && (
                        <span className="ml-2 text-muted-foreground">(inactivo)</span>
                      )}
                    </td>
                    <td className="py-2 hidden sm:table-cell">
                      {Object.entries(variant.attributes).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(variant.attributes).map(([key, value]) => (
                            <span
                              key={key}
                              className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium"
                            >
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 text-right tabular-nums font-medium">
                      {variant.stock}
                    </td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">
                      {formatPrice(product.salePrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}
