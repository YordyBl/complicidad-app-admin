'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react'

import { type SearchResult } from '@/shared/api/schemas'
import { registerPurchaseAction } from './inventory-actions'
import { ItemSearch } from './item-search'
import { formatCurrency } from '@/shared/api/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormFieldError } from '@/components/ui/form-field-error'
import { SuccessReceipt } from '@/components/ui/success-receipt'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

/** Cart item with resolved display data from search. */
interface CartItem {
  variantId: string
  sku: string
  productName: string
  quantity: number
  unitCost: number
  stock?: number
}

type FormValues = {
  supplierId: string
  notes: string
  purchaseDate: string
}

export function PurchaseForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null)

  const {
    register,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      supplierId: '',
      notes: '',
      purchaseDate: new Date().toISOString().split('T')[0],
    },
  })

  function handleItemSelect(item: SearchResult) {
    setSelectedItem(item)
  }

  function handleAddToLot() {
    if (!selectedItem) return

    const existing = cartItems.find((i) => i.variantId === selectedItem.variantId)
    if (existing) {
      setCartItems(
        cartItems.map((i) =>
          i.variantId === selectedItem.variantId
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        ),
      )
    } else {
      setCartItems([
        ...cartItems,
        {
          variantId: selectedItem.variantId,
          sku: selectedItem.sku,
          productName: selectedItem.productName,
          quantity: 1,
          unitCost: selectedItem.salePrice,
          stock: selectedItem.stock,
        },
      ])
    }
    setSelectedItem(null)
  }

  function removeItem(variantId: string) {
    setCartItems(cartItems.filter((i) => i.variantId !== variantId))
  }

  function updateItemQuantity(variantId: string, quantity: number) {
    if (quantity < 1) return
    setCartItems(
      cartItems.map((i) =>
        i.variantId === variantId ? { ...i, quantity } : i,
      ),
    )
  }

  function updateItemUnitCost(variantId: string, unitCost: number) {
    setCartItems(
      cartItems.map((i) =>
        i.variantId === variantId ? { ...i, unitCost } : i,
      ),
    )
  }

  const totalSoles = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0,
  )

  const totalCents = Math.round(totalSoles * 100)

  async function onSubmit() {
    setServerError(null)
    setIsSubmitting(true)

    try {
      const formData = new FormData()

      const items = cartItems.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        unitCost: i.unitCost,
      }))
      formData.set('items', JSON.stringify(items))

      const supplierId = watch('supplierId')
      if (supplierId) formData.set('supplierId', supplierId)

      const notes = watch('notes')
      if (notes) formData.set('notes', notes)

      const purchaseDate = watch('purchaseDate')
      if (purchaseDate) formData.set('purchaseDate', purchaseDate)

      const result = await registerPurchaseAction(null, formData)

      if (!result.success) {
        setServerError(result.error || 'Error al registrar la compra.')
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

  if (isSuccess) {
    return (
      <div className="space-y-4">
        <SuccessReceipt title="Compra registrada">
          <p>La compra fue registrada exitosamente en el inventario.</p>
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
        <CardTitle className="text-lg">Registrar compra</CardTitle>
        <CardDescription>
          Buscá productos y agregalos al lote de compra. Cada producto se registra como un ítem.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {serverError && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm" role="alert">
            {serverError}
          </div>
        )}

        {/* Item search */}
        <ItemSearch onSelect={handleItemSelect} />

        {/* Selected item — Add to lot */}
        {selectedItem && (
          <div className="p-4 border rounded-lg space-y-3">
            <p className="text-sm font-medium">
              Producto seleccionado: {selectedItem.productName} ({selectedItem.sku})
            </p>
            <div className="flex items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="add-qty">Cantidad</Label>
                <Input
                  id="add-qty"
                  type="number"
                  min="1"
                  value={1}
                  readOnly
                  className="w-20 h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-cost">Costo unitario (soles)</Label>
                <Input
                  id="add-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={selectedItem.salePrice}
                  readOnly
                  className="w-28 h-8 text-sm"
                />
              </div>
              <Button type="button" onClick={handleAddToLot} className="gap-1">
                <Plus className="w-4 h-4" />
                Agregar al lote
              </Button>
            </div>
          </div>
        )}

        {/* Cart */}
        <div className="space-y-3">
          <Label>Productos en el lote de compra</Label>
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
                  </div>
                  <div className="flex items-center gap-2">
                    <div>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItemQuantity(item.variantId, Number(e.target.value))
                        }
                        className="w-20 h-8 text-sm"
                        disabled={isSubmitting}
                        data-testid={`cart-qty-${item.variantId}`}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitCost}
                        onChange={(e) =>
                          updateItemUnitCost(item.variantId, Number(e.target.value))
                        }
                        className="w-24 h-8 text-sm"
                        disabled={isSubmitting}
                        data-testid={`cart-cost-${item.variantId}`}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive shrink-0"
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

        {/* Supplier ID */}
        <div className="space-y-2">
          <Label htmlFor="supplierId">ID de proveedor</Label>
          <Input
            id="supplierId"
            placeholder="ID del proveedor (opcional)"
            disabled={isSubmitting}
            {...register('supplierId')}
          />
          <FormFieldError message={errors.supplierId?.message} />
        </div>

        {/* Purchase Date */}
        <div className="space-y-2">
          <Label htmlFor="purchaseDate">Fecha de compra</Label>
          <Input
            id="purchaseDate"
            type="date"
            disabled={isSubmitting}
            {...register('purchaseDate')}
          />
          <FormFieldError message={errors.purchaseDate?.message} />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notas</Label>
          <Textarea
            id="notes"
            placeholder="Notas sobre la compra..."
            rows={2}
            disabled={isSubmitting}
            {...register('notes')}
          />
          <FormFieldError message={errors.notes?.message} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            className="gap-2"
            onClick={onSubmit}
            disabled={isSubmitting || cartItems.length === 0}
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Registrando...' : 'Registrar compra'}
          </Button>
          <Button asChild variant="outline" type="button">
            <Link href="/inventory">Cancelar</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
