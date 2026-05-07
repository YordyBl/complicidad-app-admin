'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save, ArrowLeft } from 'lucide-react'

import { z } from 'zod'
import { createProductAction } from './inventory-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormFieldError } from '@/components/ui/form-field-error'
import { SuccessReceipt } from '@/components/ui/success-receipt'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const productFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  baseSku: z.string().min(1, 'El SKU base es requerido'),
  salePrice: z.coerce.number().positive('El precio de venta debe ser positivo'),
  presalePrice: z.coerce.number().min(0).optional().or(z.literal('')),
  sizesRaw: z.string().min(1, 'Al menos un talle es requerido'),
  aliasesRaw: z.string().optional(),
})

type FormValues = z.infer<typeof productFormSchema>

function generatePreviewSku(baseSku: string, size: string): string {
  const base = baseSku.trim().toLowerCase().replace(/[^a-z0-9áéíóúüñ]+/g, '-').replace(/^-+|-+$/g, '')
  const sizePart = size.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `${base}-${sizePart}`
}

export function ProductForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [productId, setProductId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      description: '',
      baseSku: '',
      salePrice: undefined,
      presalePrice: undefined,
      sizesRaw: '',
      aliasesRaw: '',
    },
  })

  const baseSku = useWatch({ control, name: 'baseSku' }) ?? ''
  const sizesRaw = useWatch({ control, name: 'sizesRaw' }) ?? ''

  const previewSkus = useMemo(() => {
    if (!baseSku.trim() || !sizesRaw.trim()) return []
    const sizes = sizesRaw.split(',').map((s) => s.trim()).filter(Boolean)
    return sizes.map((size) => generatePreviewSku(baseSku, size))
  }, [baseSku, sizesRaw])

  async function onSubmit(data: FormValues) {
    setServerError(null)
    setIsSubmitting(true)

    try {
      const sizes = data.sizesRaw.split(',').map((s) => s.trim()).filter(Boolean)

      const formData = new FormData()
      formData.set('name', data.name)
      if (data.description) formData.set('description', data.description)
      formData.set('baseSku', data.baseSku)
      formData.set('salePrice', String(data.salePrice))
      if (data.presalePrice) formData.set('presalePrice', String(data.presalePrice))
      formData.set('sizes', JSON.stringify(sizes))
      if (data.aliasesRaw) formData.set('aliases', data.aliasesRaw)

      const result = await createProductAction(null, formData)

      if (!result.success) {
        setServerError(result.error || 'Error al crear el producto.')
        return
      }

      setIsSuccess(true)
      if (result.data?.productId) {
        setProductId(String(result.data.productId))
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
        <SuccessReceipt title="Producto creado">
          <p>El producto fue registrado exitosamente con sus variantes.</p>
          {productId && (
            <p className="text-xs mt-1">ID: {productId}</p>
          )}
        </SuccessReceipt>
        <Button asChild variant="outline">
          <Link href="/inventory">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a inventario
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Nuevo producto</CardTitle>
        <CardDescription>
          Registrá un nuevo producto. Los SKU se generan automáticamente a partir del SKU base y los talles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm" role="alert">
              {serverError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre <span className="text-destructive">*</span></Label>
              <Input id="name" placeholder="Nombre del producto" disabled={isSubmitting} {...register('name')} />
              <FormFieldError message={errors.name?.message} />
            </div>

            {/* Base SKU */}
            <div className="space-y-2">
              <Label htmlFor="baseSku">SKU Base <span className="text-destructive">*</span></Label>
              <Input id="baseSku" placeholder="Ej: zapato" disabled={isSubmitting} {...register('baseSku')} />
              <FormFieldError message={errors.baseSku?.message} />
            </div>
          </div>

          {/* SKU Preview */}
          {previewSkus.length > 0 && (
            <div className="p-3 rounded-md bg-muted/50 border space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Vista previa de SKUs:</p>
              <div className="flex flex-wrap gap-1">
                {previewSkus.map((sku) => (
                  <Badge key={sku} variant="secondary" className="text-xs font-mono">{sku}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sizes */}
            <div className="space-y-2">
              <Label htmlFor="sizesRaw">Talles <span className="text-destructive">*</span></Label>
              <Input id="sizesRaw" placeholder="S, M, L, XL" disabled={isSubmitting} {...register('sizesRaw')} />
              <p className="text-xs text-muted-foreground">Separados por coma. Se genera un SKU por talle.</p>
              <FormFieldError message={errors.sizesRaw?.message} />
            </div>

            <div /> {/* spacer */}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" placeholder="Descripción del producto..." rows={2} disabled={isSubmitting} {...register('description')} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sale Price */}
            <div className="space-y-2">
              <Label htmlFor="salePrice">Precio de venta ($) <span className="text-destructive">*</span></Label>
              <Input id="salePrice" type="number" min="0" step="0.01" placeholder="Ej: 1500.00" disabled={isSubmitting} {...register('salePrice', { valueAsNumber: true })} />
              <FormFieldError message={errors.salePrice?.message} />
            </div>

            {/* Presale Price (optional) */}
            <div className="space-y-2">
              <Label htmlFor="presalePrice">Precio de preventa ($) (opcional)</Label>
              <Input id="presalePrice" type="number" min="0" step="0.01" placeholder="Ej: 1200.00" disabled={isSubmitting} {...register('presalePrice', { valueAsNumber: true })} />
            </div>
          </div>

          {/* Aliases */}
          <div className="space-y-2">
            <Label htmlFor="aliasesRaw">Alias (separados por coma)</Label>
            <Input id="aliasesRaw" placeholder="alias1, alias2, alias3" disabled={isSubmitting} {...register('aliasesRaw')} />
            <p className="text-xs text-muted-foreground">Nombres alternativos para búsquedas rápidas.</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" className="gap-2" disabled={isSubmitting}>
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Creando...' : 'Crear producto'}
            </Button>
            <Button asChild variant="outline" type="button">
              <Link href="/inventory">Cancelar</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
