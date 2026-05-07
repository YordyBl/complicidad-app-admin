'use client'

import { useState, useCallback } from 'react'
import { Search, Loader2 } from 'lucide-react'

import { type SearchResult } from '@/shared/api/schemas'
export type { SearchResult }
import { formatCurrency } from '@/shared/api/formatters'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'

interface ItemSearchProps {
  /** Called when an item is selected from results. */
  onSelect?: (item: SearchResult) => void
  /** Placeholder for the search input. */
  placeholder?: string
  /** Label for the search field. */
  label?: string
}

export function ItemSearch({
  onSelect,
  placeholder = 'Buscar por SKU o alias...',
  label = 'Buscar producto',
}: ItemSearchProps) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const doSearch = useCallback(async (search: string) => {
    const trimmed = search.trim()
    if (trimmed.length < 2) return

    setLoading(true)
    setError(null)
    setSearchTerm(trimmed)

    try {
      const response = await fetch(
        `/api/inventory/search?term=${encodeURIComponent(trimmed)}`,
        { cache: 'no-store' },
      )
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        setError(
          (body as Record<string, string>).message || 'Error al buscar.',
        )
        setResults([])
        return
      }
      const data = (await response.json()) as SearchResult[]
      setResults(data)
    } catch {
      setError('Error de conexión al buscar.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const hasSearched = searchTerm !== ''

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="item-search">{label}</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="item-search"
              className="pl-9"
              placeholder={placeholder}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && term.trim().length >= 2) {
                  e.preventDefault()
                  doSearch(term)
                }
              }}
            />
          </div>
          <Button
            type="button"
            disabled={loading || term.trim().length < 2}
            onClick={() => doSearch(term)}
          >
            {loading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" role="status" aria-label="Cargando" />
            )}
            Buscar
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm" role="alert">
          {error}
        </div>
      )}

      {hasSearched && results.length === 0 && !loading && !error && (
        <EmptyState
          title="Sin resultados"
          description="No se encontraron productos con ese término."
        />
      )}

      {results.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {results.map((item) => (
            <Card
              key={item.variantId}
              className={`hover:border-primary/50 transition-colors ${onSelect ? 'cursor-pointer' : ''}`}
              onClick={() => onSelect?.(item)}
            >
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">{item.sku}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {item.stock !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      Stock: {item.stock}
                    </Badge>
                  )}
                  <div className="text-right">
                    <span className="text-sm font-medium">
                      {formatCurrency(Math.round(item.salePrice * 100))}
                    </span>
                    {item.presalePrice !== null && (
                      <span className="block text-xs text-amber-600">
                        Prev: {formatCurrency(Math.round(item.presalePrice * 100))}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
