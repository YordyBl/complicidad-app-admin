'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { XCircle, Undo2, AlertTriangle } from 'lucide-react'

import { saleIdFormSchema } from '@/shared/api/schemas'
import { cancelSaleAction, returnSaleAction } from './sales-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormFieldError } from '@/components/ui/form-field-error'
import { SuccessReceipt } from '@/components/ui/success-receipt'

type FormValues = {
  saleId: string
}

interface ReversalFormProps {
  /** "cancel" or "return" */
  action: 'cancel' | 'return'
}

const config = {
  cancel: {
    title: 'Cancelar venta',
    description: 'Ingresá el ID de la venta que querés cancelar.',
    icon: XCircle,
    submitLabel: 'Cancelar venta',
    submittingLabel: 'Cancelando...',
    successTitle: 'Venta cancelada',
    successDescription: 'La venta fue cancelada exitosamente.',
    confirmTitle: '¿Confirmar cancelación?',
    confirmDescription:
      'Esta acción cancelará la venta. No se puede deshacer.',
  },
  return: {
    title: 'Devolver venta',
    description: 'Ingresá el ID de la venta que querés devolver.',
    icon: Undo2,
    submitLabel: 'Devolver venta',
    submittingLabel: 'Devolviendo...',
    successTitle: 'Venta devuelta',
    successDescription: 'La venta fue devuelta exitosamente.',
    confirmTitle: '¿Confirmar devolución?',
    confirmDescription:
      'Esta acción devolverá la venta. No se puede deshacer.',
  },
}

export function ReversalForm({ action }: ReversalFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingSaleId, setPendingSaleId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<FormValues>({
    resolver: zodResolver(saleIdFormSchema),
    defaultValues: { saleId: '' },
  })

  const { title, description, icon: Icon, submitLabel, submittingLabel, successTitle, successDescription, confirmTitle, confirmDescription } = config[action]

  function onConfirmRequest() {
    const saleId = getValues('saleId')
    if (!saleId) return
    setPendingSaleId(saleId)
    setShowConfirm(true)
  }

  async function executeAction() {
    if (!pendingSaleId) return

    setServerError(null)
    setIsSubmitting(true)
    setShowConfirm(false)

    try {
      const formData = new FormData()
      formData.set('saleId', pendingSaleId)

      const result =
        action === 'cancel'
          ? await cancelSaleAction(null, formData)
          : await returnSaleAction(null, formData)

      if (!result.success) {
        setServerError(result.error || 'Error al procesar.')
        return
      }

      setIsSuccess(true)
    } catch {
      setServerError('Error de conexión. Verifique su red.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <SuccessReceipt title={successTitle}>
        <p>{successDescription}</p>
        {pendingSaleId && (
          <p className="text-xs mt-1">Venta ID: {pendingSaleId}</p>
        )}
      </SuccessReceipt>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-destructive/10 rounded-lg flex items-center justify-center">
            <Icon className="w-4 h-4 text-destructive" />
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
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
                    {confirmTitle}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {confirmDescription}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    Venta ID: <strong>{pendingSaleId}</strong>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={executeAction} disabled={isSubmitting} className="gap-2">
                <Icon className="w-4 h-4" />
                {isSubmitting ? submittingLabel : `Sí, ${submitLabel.toLowerCase()}`}
              </Button>
              <Button variant="outline" onClick={() => setShowConfirm(false)} type="button">
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onConfirmRequest)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="saleId">
                ID de venta <span className="text-destructive">*</span>
              </Label>
              <Input
                id="saleId"
                placeholder="Ingresá el ID de la venta"
                disabled={isSubmitting}
                {...register('saleId')}
              />
              <FormFieldError message={errors.saleId?.message} />
            </div>

            <Button type="submit" variant="destructive" className="gap-2" disabled={isSubmitting}>
              <Icon className="w-4 h-4" />
              {isSubmitting ? submittingLabel : submitLabel}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
