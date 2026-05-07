'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Banknote, AlertTriangle, ArrowLeft } from 'lucide-react'

import { cashClosingFormSchema, type CashClosingFormData } from '@/shared/api/schemas'
import { closeCashAction } from './cash-actions'
import { formatDateTime } from '@/shared/api/formatters'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormFieldError } from '@/components/ui/form-field-error'
import { SuccessReceipt } from '@/components/ui/success-receipt'
import Link from 'next/link'

type FormValues = CashClosingFormData

export function CashClosingForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [resultData, setResultData] = useState<Record<string, unknown> | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(cashClosingFormSchema),
    defaultValues: { notes: '' },
  })

  function onConfirmRequest() {
    setShowConfirm(true)
    setServerError(null)
  }

  async function executeClosing(data: FormValues) {
    setServerError(null)
    setIsSubmitting(true)
    setShowConfirm(false)

    try {
      const formData = new FormData()
      if (data.notes) formData.set('notes', data.notes)

      const result = await closeCashAction(null, formData)

      if (!result.success) {
        setServerError(result.error || 'Error al realizar el cierre.')
        return
      }

      setIsSuccess(true)
      setResultData(result.data ?? null)
      router.refresh()
    } catch {
      setServerError('Error de conexión. Verifique su red.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="space-y-4">
        <SuccessReceipt title="Cierre de caja realizado">
          <p>El cierre manual de caja fue registrado exitosamente.</p>
          {resultData?.id != null ? (
            <p className="text-xs mt-1">ID de cierre: {String(resultData!.id as string)}</p>
          ) : null}
          {resultData?.closedAt != null ? (
            <p className="text-xs mt-1">
              Fecha: {formatDateTime(String(resultData!.closedAt as string))}
            </p>
          ) : null}
        </SuccessReceipt>
        <Button asChild variant="outline">
          <Link href="/cash">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a caja
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
            <Banknote className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Cierre manual de caja</CardTitle>
            <CardDescription>
              Confirmá para registrar un cierre manual de caja.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {serverError && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm mb-4" role="alert">
            {serverError}
          </div>
        )}

        {showConfirm ? (
          <div className="space-y-4">
            <div className="border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    ¿Confirmar cierre de caja?
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Esta acción registrará un cierre manual de caja. Es una
                    operación financiera importante. Verificá que los datos sean
                    correctos antes de continuar.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="default"
                onClick={handleSubmit(executeClosing)}
                disabled={isSubmitting}
                className="gap-2"
              >
                <Banknote className="w-4 h-4" />
                {isSubmitting ? 'Cerrando caja...' : 'Sí, cerrar caja'}
              </Button>
              <Button variant="outline" onClick={() => setShowConfirm(false)} type="button">
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onConfirmRequest)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Notas para este cierre de caja..."
                rows={3}
                disabled={isSubmitting}
                {...register('notes')}
              />
              <FormFieldError message={errors.notes?.message} />
            </div>

            <Button type="submit" className="gap-2" disabled={isSubmitting}>
              <Banknote className="w-4 h-4" />
              {isSubmitting ? 'Procesando...' : 'Cerrar caja'}
            </Button>
          </form>
        )}

        <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
          El cierre de caja es una operación manual. Una vez registrado, los datos
          del cierre se envían al backend y quedan registrados permanentemente.
        </p>
      </CardContent>
    </Card>
  )
}
