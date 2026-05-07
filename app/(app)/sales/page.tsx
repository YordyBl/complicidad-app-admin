import type { Metadata } from 'next'
import Link from 'next/link'
import { ShoppingCart, XCircle, Undo2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ReversalForm } from '@/features/sales/reversal-form'
import { SaleList } from '@/features/sales/sale-list'

export const metadata: Metadata = {
  title: 'Ventas — Complicidad',
}

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ventas</h1>
        <p className="text-muted-foreground">
          Nueva venta, cancelación, devolución y listado de ventas.
        </p>
      </div>

      {/* New sale card */}
      <Link href="/sales/new">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ReversalForm action="cancel" />
        <ReversalForm action="return" />
      </div>

      {/* Sale list */}
      <SaleList />
    </div>
  )
}
