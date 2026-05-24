'use client'

import React, { useState } from 'react'
import { Copy, MessageSquare } from 'lucide-react'

import type { SaleDetail } from '@/shared/api/schemas'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface DeliveryMessageDialogProps {
  sale: SaleDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Builds the full delivery message text from sale data and transient inputs.
 * Pure function — no side effects.
 */
export function buildDeliveryMessage(
  sale: SaleDetail,
  alternatePhone: string,
  reference?: string,
): string {
  const lines: string[] = []

  lines.push('COMPLICIDAD')
  lines.push('ENTREGA')

  lines.push(`Nombre: ${sale.customerName ?? 'No registrado'}`)

  // Cel: main phone - alternate phone (alternate phone is required)
  const phoneParts = [sale.customerPhone, alternatePhone].filter(Boolean)
  lines.push(`Cel: ${phoneParts.join(' - ')}`)

  // Dirección + distrito
  if (sale.customerAddress || sale.customerDistrict) {
    const addressParts = [sale.customerAddress, sale.customerDistrict]
      .filter(Boolean)
      .join(' - ')
    lines.push(`Dirección + distrito: ${addressParts}`)
  }

  // Referencia (optional, transient)
  if (reference && reference.trim()) {
    lines.push(`Referencia: ${reference.trim()}`)
  }

  // Ubicación
  if (sale.googleMapsUrl) {
    lines.push(`Ubicacion: ${sale.googleMapsUrl}`)
  }

  // Pendiente: amount in soles
  const pendingSoles = (sale.pendingBalanceCents ?? 0) / 100
  lines.push(`pendiente: ${pendingSoles.toFixed(2)} soles - yape 954 791 292 lady Zavaleta`)

  return lines.join('\n')
}

export function DeliveryMessageDialog({
  sale,
  open,
  onOpenChange,
}: DeliveryMessageDialogProps) {
  const [alternatePhone, setAlternatePhone] = useState('')
  const [reference, setReference] = useState('')
  const [validationError, setValidationError] = useState('')

  function handleGenerate() {
    if (!alternatePhone.trim()) {
      setValidationError('El teléfono alternativo es requerido.')
      return
    }
    setValidationError('')

    const message = buildDeliveryMessage(sale, alternatePhone.trim(), reference)
    void navigator.clipboard.writeText(message).then(() => {
      // Reset transient inputs after successful copy
      setAlternatePhone('')
      setReference('')
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Mensaje de entrega
          </DialogTitle>
          <DialogDescription>
            Genera un mensaje copiable con los datos del cliente y la entrega.
            Los datos no se guardan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="alt-phone">Teléfono alternativo</Label>
            <Input
              id="alt-phone"
              placeholder="+51 9XX XXX XXX"
              value={alternatePhone}
              onChange={(e) => {
                setAlternatePhone(e.target.value)
                setValidationError('')
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Referencia (opcional)</Label>
            <Textarea
              id="reference"
              placeholder="Ej: Casa de portón negro, tocar timbre"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              rows={3}
            />
          </div>

          {/* Preview — shows what will be in the message */}
          <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">Datos a incluir:</p>
            <p>Nombre: {sale.customerName ?? 'No registrado'}</p>
            <p>Cel: {sale.customerPhone ?? '—'}</p>
            {sale.customerAddress && (
              <p>Direccion: {[sale.customerAddress, sale.customerDistrict].filter(Boolean).join(' - ')}</p>
            )}
            <p>Pendiente: {((sale.pendingBalanceCents ?? 0) / 100).toFixed(2)} soles</p>
          </div>

          {validationError && (
            <p className="text-sm text-destructive" role="alert">
              {validationError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} className="gap-2">
            <Copy className="w-4 h-4" />
            Generar mensaje
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
