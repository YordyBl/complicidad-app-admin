import type { Metadata } from 'next'
import { requireSession } from '@/shared/auth/session'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { checkHealth } from '@/shared/api/health'

export const metadata: Metadata = {
  title: 'Panel — Complicidad',
}

export default async function DashboardPage() {
  const session = await requireSession()
  const health = await checkHealth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel de control</h1>
        <p className="text-muted-foreground">
          Bienvenido, {session.user.name || session.user.email}
        </p>
      </div>

      {/* System status card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estado del sistema</CardTitle>
          <CardDescription>Conectividad con el backend</CardDescription>
        </CardHeader>
        <CardContent>
          {health.ok ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm font-medium">Backend operativo</span>
              <span className="text-xs text-muted-foreground">
                {health.data?.timestamp
                  ? new Date(health.data.timestamp).toLocaleTimeString('es-AR')
                  : ''}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm font-medium">Backend no disponible</span>
              <span className="text-xs text-muted-foreground">{health.error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickLinkCard
          title="Clientes"
          description="Gestionar clientes, ver historial"
          href="/customers"
        />
        <QuickLinkCard
          title="Inventario"
          description="Productos, búsqueda, compras"
          href="/inventory"
        />
        <QuickLinkCard
          title="Ventas"
          description="Nueva venta, cancelaciones, devoluciones"
          href="/sales"
        />
        <QuickLinkCard
          title="Reportes"
          description="Liquidez, stock, ganancias, COGS"
          href="/reports"
        />
        <QuickLinkCard
          title="Caja"
          description="Cierre manual de caja"
          href="/cash"
        />
      </div>

    </div>
  )
}

function QuickLinkCard({
  title,
  description,
  href,
}: {
  title: string
  description: string
  href: string
}) {
  return (
    <a href={href}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </a>
  )
}
