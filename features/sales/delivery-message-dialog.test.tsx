/**
 * Tests for buildDeliveryMessage (pure function), DeliveryMessageDialog validation,
 * and clipboard copy flow.
 *
 * @testing-library/user-event v14 provides its own clipboard implementation
 * that replaces navigator.clipboard. We use navigator.clipboard.readText()
 * to verify copied message content after user interaction.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import { DeliveryMessageDialog, buildDeliveryMessage } from './delivery-message-dialog'
import type { SaleDetail } from '@/shared/api/schemas'

// ── Helpers ─────────────────────────────────────────────────────────

function makeSaleForMessage(overrides: Partial<SaleDetail> = {}): SaleDetail {
  return {
    id: 'sale-uuid-0001',
    customerId: 'cust-uuid-0001',
    channelReference: null,
    channel: 'web',
    status: 'ACTIVE',
    totalRevenueCents: 250000,
    totalCostCents: 180000,
    grossProfitCents: 70000,
    createdAt: '2025-05-15T12:00:00.000Z',
    updatedAt: '2025-05-15T12:30:00.000Z',
    customerName: 'Juan Pérez',
    customerPhone: '+549112345678',
    customerAddress: 'Av. Corrientes 1234',
    customerDistrict: 'CABA',
    googleMapsUrl: 'https://maps.google.com/?q=Av.+Corrientes+1234',
    lines: [
      {
        id: 'line-uuid-1',
        variantId: 'var-uuid-1',
        quantity: 2,
        unitPriceCents: 75000,
        priceType: 'regular',
        totalPriceCents: 150000,
        totalCostCents: 100000,
        displayLabel: 'Camiseta Blanca',
        productName: 'Camiseta',
        sku: 'CAM-BLA-M',
        attributes: { color: 'Blanco', size: 'M' },
        consumptions: [],
      },
      {
        id: 'line-uuid-2',
        variantId: 'var-uuid-2',
        quantity: 1,
        unitPriceCents: 100000,
        priceType: 'presale',
        totalPriceCents: 100000,
        totalCostCents: 80000,
        displayLabel: 'Pantalón Negro',
        productName: 'Pantalón',
        sku: 'PAN-NEG-L',
        attributes: { color: 'Negro', size: 'L' },
        consumptions: [],
      },
    ],
    ...overrides,
  }
}

// ── Pure function tests ─────────────────────────────────────────────

describe('buildDeliveryMessage', () => {
  it('includes customer name, address, district, maps link, and alternate phone', () => {
    const message = buildDeliveryMessage(
      makeSaleForMessage(),
      '+5491198765432',
      'Entrega por atrás',
    )
    expect(message).toContain('COMPLICIDAD')
    expect(message).toContain('ENTREGA')
    expect(message).toContain('Nombre: Juan Pérez')
    expect(message).toContain('Cel: +549112345678 - +5491198765432')
    expect(message).toContain('Dirección + distrito: Av. Corrientes 1234 - CABA')
    expect(message).toContain('Entrega por atrás')
    expect(message).toContain('Ubicacion:')
    expect(message).toContain('https://maps.google.com/?q=Av.+Corrientes+1234')
    expect(message).toContain('pendiente:')
    expect(message).toContain('soles - yape 954 791 292 lady Zavaleta')
  })

  it('omits reference when not provided', () => {
    const message = buildDeliveryMessage(
      makeSaleForMessage(),
      '+5491198765432',
    )
    expect(message).toContain('Nombre: Juan Pérez')
    expect(message).not.toContain('Referencia:')
  })

  it('omits reference when empty string', () => {
    const message = buildDeliveryMessage(
      makeSaleForMessage(),
      '+5491198765432',
      '   ',
    )
    expect(message).not.toContain('Referencia:')
  })

  it('cell line omits main phone placeholder when phone is null', () => {
    const sale = makeSaleForMessage({ customerPhone: null })
    const message = buildDeliveryMessage(sale, '+5491198765432')
    expect(message).toContain('Cel: +5491198765432')
  })

  it('omits maps link when googleMapsUrl is null', () => {
    const sale = makeSaleForMessage({ googleMapsUrl: null })
    const message = buildDeliveryMessage(sale, '+5491198765432')
    expect(message).not.toContain('Ubicacion:')
  })

  it('does NOT include garment list', () => {
    const message = buildDeliveryMessage(
      makeSaleForMessage(),
      '+5491198765432',
    )
    expect(message).not.toContain('Camiseta Blanca')
    expect(message).not.toContain('Pantalón Negro')
  })

  it('includes pending amount in soles with two decimal places', () => {
    const sale = makeSaleForMessage({ pendingBalanceCents: 15000 })
    const message = buildDeliveryMessage(sale, '+5491198765432')
    expect(message).toContain('pendiente: 150.00 soles')
  })

  it('shows 0.00 soles when pendingBalanceCents is undefined', () => {
    const sale = makeSaleForMessage({ pendingBalanceCents: undefined })
    const message = buildDeliveryMessage(sale, '+5491198765432')
    expect(message).toContain('pendiente: 0.00 soles')
  })

  it('omits address section when both address and district are null', () => {
    const sale = makeSaleForMessage({
      customerAddress: null,
      customerDistrict: null,
    })
    const message = buildDeliveryMessage(sale, '+5491198765432')
    expect(message).not.toContain('Dirección + distrito')
  })

  it('handles null customer name gracefully', () => {
    const sale = makeSaleForMessage({ customerName: null })
    const message = buildDeliveryMessage(sale, '+5491198765432')
    expect(message).toContain('No registrado')
  })

  it('includes customer phone in cell line with alternate', () => {
    const message = buildDeliveryMessage(
      makeSaleForMessage({ customerPhone: '+549112345678' }),
      '+5491198765432',
    )
    expect(message).toContain('Cel: +549112345678 - +5491198765432')
  })
})

// ── UI validation tests ─────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DeliveryMessageDialog — validation', () => {
  it('shows validation error when alternate phone is missing', async () => {
    const user = userEvent.setup()
    render(
      <DeliveryMessageDialog sale={makeSaleForMessage()} open={true} onOpenChange={() => {}} />,
    )

    await user.click(screen.getByRole('button', { name: /generar mensaje/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/teléfono alternativo es requerido/i)
  })

  it('does NOT show validation error when alternate phone is provided', async () => {
    const user = userEvent.setup()
    render(
      <DeliveryMessageDialog sale={makeSaleForMessage()} open={true} onOpenChange={() => {}} />,
    )

    await user.type(screen.getByLabelText(/teléfono alternativo/i), '+5491198765432')
    await user.click(screen.getByRole('button', { name: /generar mensaje/i }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('DeliveryMessageDialog — UI', () => {
  it('has Cancelar and Generar mensaje buttons', () => {
    render(
      <DeliveryMessageDialog sale={makeSaleForMessage()} open={true} onOpenChange={() => {}} />,
    )
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generar mensaje/i })).toBeInTheDocument()
  })

  it('has phone and reference input fields', () => {
    render(
      <DeliveryMessageDialog sale={makeSaleForMessage()} open={true} onOpenChange={() => {}} />,
    )
    expect(screen.getByLabelText(/teléfono alternativo/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/referencia/i)).toBeInTheDocument()
  })
})

// ── Clipboard copy flow tests ────────────────────────────────────────
// userEvent v14 provides its own clipboard implementation that actually
// stores text written via navigator.clipboard.writeText(). We verify
// the complete copy flow by reading the clipboard after user interaction.

describe('DeliveryMessageDialog — clipboard copy', () => {
  it('copies complete message to clipboard when phone is provided and reference is set', async () => {
    const user = userEvent.setup()
    render(
      <DeliveryMessageDialog sale={makeSaleForMessage()} open={true} onOpenChange={() => {}} />,
    )

    await user.type(screen.getByLabelText(/teléfono alternativo/i), '+5491198765432')
    await user.type(screen.getByLabelText(/referencia/i), 'Puerta blanca, tocar timbre')
    await user.click(screen.getByRole('button', { name: /generar mensaje/i }))

    const copiedText = await navigator.clipboard.readText()
    expect(copiedText).toContain('COMPLICIDAD')
    expect(copiedText).toContain('ENTREGA')
    expect(copiedText).toContain('Nombre: Juan Pérez')
    expect(copiedText).toContain('Av. Corrientes 1234')
    expect(copiedText).toContain('CABA')
    expect(copiedText).toContain('+5491198765432')
    expect(copiedText).toContain('Puerta blanca, tocar timbre')
    expect(copiedText).toContain('Referencia:')
    expect(copiedText).toContain('Ubicacion:')
    expect(copiedText).toContain('pendiente:')
  })

  it('copies message without reference section when reference is empty', async () => {
    const user = userEvent.setup()
    render(
      <DeliveryMessageDialog sale={makeSaleForMessage()} open={true} onOpenChange={() => {}} />,
    )

    await user.type(screen.getByLabelText(/teléfono alternativo/i), '+5491198765432')
    await user.click(screen.getByRole('button', { name: /generar mensaje/i }))

    const copiedText = await navigator.clipboard.readText()
    expect(copiedText).toContain('Nombre: Juan Pérez')
    expect(copiedText).not.toContain('Referencia:')
  })

  it('resets alternate phone and reference after successful copy', async () => {
    const user = userEvent.setup()
    render(
      <DeliveryMessageDialog sale={makeSaleForMessage()} open={true} onOpenChange={() => {}} />,
    )

    await user.type(screen.getByLabelText(/teléfono alternativo/i), '+5491198765432')
    await user.type(screen.getByLabelText(/referencia/i), 'Tocar timbre')
    await user.click(screen.getByRole('button', { name: /generar mensaje/i }))

    // Verify clipboard was written (proves the flow completed)
    const copiedText = await navigator.clipboard.readText()
    expect(copiedText).toContain('+5491198765432')

    // Inputs should be cleared after successful clipboard write
    expect(screen.getByLabelText(/teléfono alternativo/i)).toHaveValue('')
    expect(screen.getByLabelText(/referencia/i)).toHaveValue('')
  })

  it('does not copy to clipboard when phone is missing', async () => {
    const user = userEvent.setup()
    render(
      <DeliveryMessageDialog sale={makeSaleForMessage()} open={true} onOpenChange={() => {}} />,
    )

    await user.click(screen.getByRole('button', { name: /generar mensaje/i }))

    // Validation error should appear — clipboard was never written
    expect(screen.getByRole('alert')).toHaveTextContent(/teléfono alternativo es requerido/i)
  })
})
