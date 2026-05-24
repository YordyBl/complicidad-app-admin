'use client'

import React, { useState } from 'react'
import { FileText, Download } from 'lucide-react'
import { toast } from 'sonner'

import type { SaleDetail } from '@/shared/api/schemas'
import type { SaleConstanciaEmissionSummary } from '@/shared/api/schemas'
import { createConstanciaEmissionAction } from '@/features/sales/sales-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/shared/api/formatters'

interface SaleDocumentsCardProps {
  sale: SaleDetail
  emissions: SaleConstanciaEmissionSummary[]
}

/**
 * Client component: constancia emission actions and download links.
 *
 * Displays a card with an "Emitir constancia" button and lists
 * existing emissions with download links. Handles loading and
 * error states via sonner toast notifications.
 */
export function SaleDocumentsCard({ sale, emissions }: SaleDocumentsCardProps) {
  const [emitting, setEmitting] = useState(false)

  const handleEmit = async () => {
    setEmitting(true)
    try {
      const result = await createConstanciaEmissionAction(sale.id, sale as unknown as Record<string, unknown>)
      if (result.success) {
        toast.success('Constancia emitida correctamente')
      } else {
        toast.error(result.error ?? 'Error al emitir constancia')
      }
    } catch {
      toast.error('Error al emitir la constancia')
    } finally {
      setEmitting(false)
    }
  }

  const downloadUrl = (emissionId: string) =>
    `/api/sales/${sale.id}/constancia-emissions/${emissionId}/pdf`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Documentos
        </CardTitle>
        <CardDescription>
          Emití constancias y descargá los PDFs generados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Emit Button */}
        <Button
          onClick={handleEmit}
          disabled={emitting}
          className="w-full"
        >
          <FileText className="w-4 h-4 mr-2" />
          {emitting ? 'Emitiendo...' : 'Emitir constancia'}
        </Button>

        {/* Existing Emissions */}
        {emissions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Historial</p>
            {emissions.map((emission) => (
              <div
                key={emission.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      #{emission.emissionNumber}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {emission.templateVersion}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(emission.issuedAt)}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <a href={downloadUrl(emission.id)} download>
                    <Download className="w-3.5 h-3.5 mr-1" />
                    PDF
                  </a>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
