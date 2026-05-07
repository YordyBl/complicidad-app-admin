import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function InventoryLoading() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventario</h1>
        <p className="text-muted-foreground">Gestión de productos, búsqueda y compras.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Action card skeletons */}
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
            <div className="h-5 bg-muted rounded w-32 mb-2 animate-pulse" />
            <div className="h-4 bg-muted rounded w-56 animate-pulse" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
            <div className="h-5 bg-muted rounded w-40 mb-2 animate-pulse" />
            <div className="h-4 bg-muted rounded w-52 animate-pulse" />
          </CardContent>
        </Card>
      </div>

      {/* Product list skeleton */}
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
            <span className="ml-3 text-muted-foreground">Cargando productos...</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
