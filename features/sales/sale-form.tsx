'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save, ArrowLeft, Plus, Trash2, AlertTriangle } from 'lucide-react'

import { saleFormSchema, type SaleItem, SALE_CHANNELS, saleChannelLabels } from '@/shared/api/schemas'
import { createSaleAction } from './sales-actions'
import { CustomerSearch } from './customer-search'
import { ItemSearch } from '@/features/inventory/item-search'
import { formatCurrency } from '@/shared/api/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormFieldError } from '@/components/ui/form-field-error'
import { SuccessReceipt } from '@/components/ui/success-receipt'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'

import type { SaleChannel } from '@/shared/api/schemas'

type FormValues = {
  customerId: string
  channel: SaleChannel
  items: SaleItem[]
}

/** Extended cart item with display data resolved from search. */
interface CartItem {
  variantId: string
  sku: string
  productName: string
  quantity: number
  priceType: 'regular' | 'presale'
  salePrice: number
  presalePrice: number | null
  /** Resolved price in soles based on priceType selection */
  resolvedPrice: number
  /** Available stock from search, undefined if unknown */
  stock?: number
}

export function SaleForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [showPresaleConfirm, setShowPresaleConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      customerId: '',
      channel: 'web' as SaleChannel,
      items: [],
    },
  })

  const customerId = watch('customerId')

  function handleCustomerSelect(customer: { id: string; name: string }) {
    setValue('customerId', customer.id)
  }

  function handleItemSelect(item: {
    variantId: string
    sku: string
    productName: string
    salePrice: number
    presalePrice: number | null
    stock?: number
  }) {
    const existing = cartItems.find((i) => i.variantId === item.variantId)
    if (existing) {
      const maxQty = existing.stock !== undefined ? existing.stock : Infinity
      setCartItems(
        cartItems.map((i) =>
          i.variantId === item.variantId
            ? { ...i, quantity: Math.min(i.quantity + 1, maxQty) }
            : i,
        ),
      )
    } else {
      // Default to regular price; user can switch to presale per item
      const newItem: CartItem = {
        variantId: item.variantId,
        sku: item.sku,
        productName: item.productName,
        quantity: 1,
        priceType: 'regular',
        salePrice: item.salePrice,
        presalePrice: item.presalePrice,
        resolvedPrice: item.salePrice,
        stock: item.stock,
      }
      setCartItems([...cartItems, newItem])
    }
    syncItemsToForm()
  }

  function togglePriceType(variantId: string) {
    const updated = cartItems.map((i) => {
      if (i.variantId !== variantId) return i
      const newType: CartItem['priceType'] = i.priceType === 'regular' ? 'presale' : 'regular'
      return {
        ...i,
        priceType: newType,
        resolvedPrice: newType === 'presale' && i.presalePrice
          ? i.presalePrice
          : i.salePrice,
      }
    })
    setCartItems(updated)
    syncItemsToForm()
  }

  function removeItem(variantId: string) {
    const updated = cartItems.filter((i) => i.variantId !== variantId)
    setCartItems(updated)
    syncItemsToForm()
  }

  function updateItemQuantity(variantId: string, quantity: number) {
    if (quantity < 1) return
    const updated = cartItems.map((i) => {
      if (i.variantId !== variantId) return i
      const clamped = i.stock !== undefined ? Math.min(quantity, i.stock) : quantity
      return { ...i, quantity: clamped }
    })
    setCartItems(updated)
    syncItemsToForm()
  }

  function syncItemsToForm() {
    const items: SaleItem[] = cartItems.map((i) => ({
      variantId: i.variantId,
      quantity: i.quantity,
      priceType: i.priceType,
    }))
    setValue('items', items)
  }

  async function onSubmit() {
    // Check if any item uses presale and confirm
    const hasPresale = cartItems.some((i) => i.priceType === 'presale')
    if (hasPresale && !showPresaleConfirm) {
      setShowPresaleConfirm(true)
      return
    }

    setServerError(null)
    setShowPresaleConfirm(false)
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.set('customerId', customerId)
      formData.set('channel', watch('channel'))

      const items: SaleItem[] = cartItems.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        priceType: i.priceType,
      }))
      formData.set('items', JSON.stringify(items))

      const result = await createSaleAction(null, formData)

      if (!result.success) {
        setServerError(result.error || 'Error al crear la venta.')
        return
      }

      setIsSuccess(true)
      router.refresh()
    } catch {
      setServerError('Error de conexión. Verifique su red.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalSoles = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.resolvedPrice,
    0,
  )

  // Convert soles to cents for formatCurrency (which expects integer cents)
  const totalCents = Math.round(totalSoles * 100)

  if (isSuccess) {
    return (
      <div className="space-y-4">
        <SuccessReceipt title="Venta creada">
          <p>La venta fue registrada exitosamente.</p>
        </SuccessReceipt>
        <Button asChild variant="outline">
          <Link href="/sales">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a ventas
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Nueva venta</CardTitle>
        <CardDescription>
          Seleccioná un cliente y agregá productos. El precio lo determina el sistema según el tipo (regular/preventa).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {serverError && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm" role="alert">
            {serverError}
          </div>
        )}

        {/* Presale confirmation dialog */}
        {showPresaleConfirm && (
          <div className="p-4 rounded-md bg-amber-50 border border-amber-200 space-y-3" role="alert">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Confirmar precio de preventa</span>
            </div>
            <p className="text-sm text-amber-700">
              Hay productos con precio de preventa en esta venta. ¿Estás seguro de registrar la venta con estos precios?
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowPresaleConfirm(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700"
                onClick={onSubmit}
                disabled={isSubmitting}
              >
                Sí, usar precio de preventa
              </Button>
            </div>
          </div>
        )}

        {/* Customer search */}
        <CustomerSearch onSelect={handleCustomerSelect} />

        {/* Channel selector */}
        <div className="space-y-2">
          <Label htmlFor="channel">
            Canal de venta <span className="text-destructive">*</span>
          </Label>
          <Select
            value={watch('channel')}
            onValueChange={(value) => setValue('channel', value as SaleChannel)}
            disabled={isSubmitting}
          >
            <SelectTrigger id="channel">
              <SelectValue placeholder="Seleccioná un canal" />
            </SelectTrigger>
            <SelectContent>
              {SALE_CHANNELS.map((ch) => (
                <SelectItem key={ch} value={ch}>
                  {saleChannelLabels[ch]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormFieldError message={errors.channel?.message} />
        </div>

        {/* Item search */}
        <ItemSearch onSelect={handleItemSelect} />

        {/* Cart */}
        <div className="space-y-3">
          <Label>Productos en la venta</Label>
          {cartItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
              Buscá y agregá productos usando el buscador de arriba.
            </p>
          ) : (
            <div className="space-y-2">
              {cartItems.map((item) => (
                <div
                  key={item.variantId}
                  className="flex items-center gap-3 border rounded-lg p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {item.productName}
                      </p>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {item.sku}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(Math.round(item.resolvedPrice * 100))} c/u
                      </span>
                      {/* Price type toggle */}
                      {item.presalePrice !== null && (
                        <button
                          type="button"
                          onClick={() => togglePriceType(item.variantId)}
                          className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
                            item.priceType === 'presale'
                              ? 'border-amber-400 bg-amber-50 text-amber-700'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                          disabled={isSubmitting}
                        >
                          {item.priceType === 'presale' ? 'PREVENTA' : 'Regular'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max={item.stock}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItemQuantity(item.variantId, Number(e.target.value))
                      }
                      className="w-20 h-8 text-sm"
                      disabled={isSubmitting}
                    />
                    {item.stock !== undefined && (
                      <span className={`text-xs ${item.quantity >= item.stock ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                        {item.quantity >= item.stock ? `Stock máx. ${item.stock}` : `${item.stock} disp.`}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeItem(item.variantId)}
                      disabled={isSubmitting}
                      type="button"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="font-medium">Total</span>
                <span className="text-lg font-bold">
                  {formatCurrency(totalCents)}
                </span>
              </div>
            </div>
          )}
        </div>

        <FormFieldError message={errors.items?.message} />

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            className="gap-2"
            onClick={onSubmit}
            disabled={isSubmitting || cartItems.length === 0}
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Creando...' : 'Crear venta'}
          </Button>
          <Button asChild variant="outline" type="button">
            <Link href="/sales">Cancelar</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
