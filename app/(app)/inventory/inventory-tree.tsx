'use client'

import Link from 'next/link'
import { Accordion } from '@/components/ui/accordion'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { ProductListItem } from '@/shared/api/schemas'

import { ProductRow } from '@/features/inventory/product-row'

interface InventoryTreeProps {
  items: ProductListItem[]
}

export function InventoryTree({ items }: InventoryTreeProps) {
  return (
    <div className="w-full">
      {/* Column header */}
      <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
        <span className="w-4 shrink-0" />
        <span className="flex-1">Nombre</span>
        <span className="hidden sm:inline w-24 text-right">Precio venta</span>
        <span className="hidden md:inline w-12 text-right">Stock</span>
        <span className="hidden md:inline w-16 text-right">Estado</span>
      </div>

      <Accordion type="multiple">
        {items.map((product) => (
          <ProductRow key={product.id} product={product} />
        ))}
      </Accordion>
    </div>
  )
}
