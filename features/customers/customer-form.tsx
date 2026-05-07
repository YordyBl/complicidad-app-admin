'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save, ArrowLeft } from 'lucide-react'

import {
  customerFormSchema,
  type CustomerFormData,
  type Customer,
} from '@/shared/api/schemas'
import { createCustomerAction, updateCustomerAction } from './customers-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormFieldError } from '@/components/ui/form-field-error'
import { SuccessReceipt } from '@/components/ui/success-receipt'
import Link from 'next/link'

interface CustomerFormProps {
  /** If provided, form is in edit mode and pre-filled with customer data. */
  customer?: Customer
}

type FormValues = CustomerFormData

export function CustomerForm({ customer }: CustomerFormProps) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [successId, setSuccessId] = useState<string | null>(null)

  const isEdit = !!customer

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: customer?.name ?? '',
      email: customer?.email ?? '',
      phone: customer?.phone ?? '',
      alias: customer?.alias ?? '',
      address: customer?.address ?? '',
      googleMapsUrl: customer?.googleMapsUrl ?? '',
      notes: customer?.notes ?? '',
    },
  })

  async function onSubmit(data: FormValues) {
    setServerError(null)
    setIsSubmitting(true)

    try {
      const formData = new FormData()

      if (customer?.id) {
        formData.set('id', customer.id)
      }

      // Only include non-empty/null values
      for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== '') {
          formData.set(key, value as string)
        }
      }

      const result = isEdit
        ? await updateCustomerAction(null, formData)
        : await createCustomerAction(null, formData)

      if (!result.success) {
        setServerError(result.error || 'Error al guardar.')
        return
      }

      setIsSuccess(true)
      if (result.data?.id) {
        setSuccessId(String(result.data.id))
      }

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
        <SuccessReceipt title={isEdit ? 'Cliente actualizado' : 'Cliente creado'}>
          <p>
            {isEdit
              ? 'Los datos del cliente fueron actualizados correctamente.'
              : 'El cliente fue registrado exitosamente.'}
          </p>
        </SuccessReceipt>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/customers">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a clientes
            </Link>
          </Button>
          {successId && (
            <Button asChild>
              <Link href={`/customers/${successId}`}>Ver detalle</Link>
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
        </CardTitle>
        <CardDescription>
          {isEdit
            ? 'Modificá los datos del cliente.'
            : 'Completá los datos para registrar un nuevo cliente.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div
              className="p-3 rounded-md bg-destructive/10 text-destructive text-sm"
              role="alert"
            >
              {serverError}
            </div>
          )}

          {/* Name (required) */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Nombre y apellido"
              disabled={isSubmitting}
              {...register('name')}
            />
            <FormFieldError message={errors.name?.message} />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="cliente@email.com"
              disabled={isSubmitting}
              {...register('email')}
            />
            <FormFieldError message={errors.email?.message} />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              placeholder="+54 11 1234-5678"
              disabled={isSubmitting}
              {...register('phone')}
            />
            <FormFieldError message={errors.phone?.message} />
          </div>

          {/* Alias */}
          <div className="space-y-2">
            <Label htmlFor="alias">Alias</Label>
            <Input
              id="alias"
              placeholder="Nombre corto para búsquedas"
              disabled={isSubmitting}
              {...register('alias')}
            />
            <FormFieldError message={errors.alias?.message} />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              placeholder="Calle, número, ciudad"
              disabled={isSubmitting}
              {...register('address')}
            />
            <FormFieldError message={errors.address?.message} />
          </div>

          {/* Google Maps URL */}
          <div className="space-y-2">
            <Label htmlFor="googleMapsUrl">Google Maps URL</Label>
            <Input
              id="googleMapsUrl"
              type="url"
              placeholder="https://maps.google.com/..."
              disabled={isSubmitting}
              {...register('googleMapsUrl')}
            />
            <FormFieldError message={errors.googleMapsUrl?.message} />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Notas sobre el cliente..."
              rows={3}
              disabled={isSubmitting}
              {...register('notes')}
            />
            <FormFieldError message={errors.notes?.message} />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="gap-2" disabled={isSubmitting}>
              <Save className="w-4 h-4" />
              {isSubmitting
                ? 'Guardando...'
                : isEdit
                  ? 'Actualizar cliente'
                  : 'Crear cliente'}
            </Button>
            <Button asChild variant="outline" type="button">
              <Link href={isEdit ? `/customers/${customer?.id}` : '/customers'}>
                Cancelar
              </Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
