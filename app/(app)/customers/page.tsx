import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Plus, User2 } from 'lucide-react'

import { listCustomers } from '@/shared/api/customers'
import type { Customer } from '@/shared/api/customers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Clientes — Complicidad',
}

export default function CustomersPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button asChild>
          <Link href="/customers/new">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo cliente
          </Link>
        </Button>
      </div>

      <Suspense fallback={<LoadingState rows={5} title="Cargando clientes..." />}>
        <CustomerList />
      </Suspense>
    </div>
  )
}

async function CustomerList() {
  const result = await listCustomers()

  if (!result.ok) {
    if (result.error.error === 'NetworkError') {
      return (
        <ErrorState
          title="Servidor no disponible"
          message="No se pudo conectar con el backend. Intente más tarde."
        />
      )
    }
    return (
      <ErrorState
        title="Error al cargar clientes"
        message={result.error.message}
      />
    )
  }

  const customers = result.data

  if (customers.length === 0) {
    return (
      <EmptyState
        title="Sin clientes"
        description="Todavía no hay clientes registrados. Creá el primero para comenzar."
        action={
          <Button asChild>
            <Link href="/customers/new">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo cliente
            </Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="grid gap-3">
      {customers.map((customer: Customer) => (
        <Link key={customer.id} href={`/customers/${customer.id}`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <User2 className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{customer.name}</p>
                  <div className="flex gap-2 flex-wrap">
                    {customer.alias && (
                      <span className="text-xs text-muted-foreground">
                        @{customer.alias}
                      </span>
                    )}
                    {customer.email && (
                      <span className="text-xs text-muted-foreground truncate">
                        {customer.email}
                      </span>
                    )}
                    {customer.phone && (
                      <span className="text-xs text-muted-foreground">
                        {customer.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="shrink-0">
                Ver detalle
              </Badge>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
