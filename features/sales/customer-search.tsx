'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Loader2 } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

interface CustomerSearchResult {
  id: string
  name: string
  email?: string | null
  alias?: string | null
}

interface CustomerSearchProps {
  /** Called when a customer is selected from results. */
  onSelect?: (customer: CustomerSearchResult) => void
  /** Placeholder for the search input. */
  placeholder?: string
  /** Label for the search field. */
  label?: string
}

export function CustomerSearch({
  onSelect,
  placeholder = 'Buscar cliente por nombre, email o alias...',
  label = 'Cliente',
}: CustomerSearchProps) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<CustomerSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState<CustomerSearchResult | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setResults([])
      setSearched(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    setSearched(true)

    try {
      const response = await fetch(
        `/api/customers/search?term=${encodeURIComponent(searchTerm)}`,
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
      const data = (await response.json()) as CustomerSearchResult[]
      setResults(data)
    } catch {
      setError('Error de conexión al buscar.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(() => {
      if (term.length >= 2) {
        doSearch(term)
      } else {
        setResults([])
        setSearched(false)
        setError(null)
      }
    }, 400)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [term, doSearch])

  function handleSelect(customer: CustomerSearchResult) {
    setSelected(customer)
    onSelect?.(customer)
    setResults([])
  }

  if (selected) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
          <div className="flex-1">
            <p className="text-sm font-medium">{selected.name}</p>
            <p className="text-xs text-muted-foreground">
              {selected.alias ? `@${selected.alias}` : selected.email}
            </p>
          </div>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSelected(null)
              setTerm('')
            }}
          >
            Cambiar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="customer-search">{label}</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="customer-search"
            className="pl-9"
            placeholder={placeholder}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm" role="alert">
          {error}
        </div>
      )}

      {searched && results.length === 0 && !loading && !error && (
        <EmptyState
          title="Sin resultados"
          description="No se encontraron clientes con ese término."
        />
      )}

      {results.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {results.map((customer) => (
            <Card
              key={customer.id}
              className="hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => handleSelect(customer)}
            >
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {customer.alias ? `@${customer.alias}` : customer.email || 'Sin email'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
