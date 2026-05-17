import { describe, it, expect } from 'vitest'
import {
  loginRequestSchema,
  registerRequestSchema,
  loginResponseSchema,
  registerResponseSchema,
  customerFormSchema,
  customerListSchema,
  saleFormSchema,
  saleIdFormSchema,
  customerSaleSummarySchema,
  saleListSchema,
  saleDetailSchema,
  type SaleItem,
  productFormSchema,
  purchaseFormSchema,
  purchaseItemSchema,
  cashClosingFormSchema,
  manualMovementFormSchema,
  productListQuerySchema,
  productListResponseSchema,
  productListMetaSchema,
  saleListItemSchema,
  saleListEntrySchema,
  type SaleListEntry,
  type SaleListItemDisplay,
} from './schemas'

// ── Auth schemas ──────────────────────────────────────────────────

describe('loginRequestSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginRequestSchema.safeParse({
      email: 'test@example.com',
      password: 'secret123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing email', () => {
    const result = loginRequestSchema.safeParse({
      email: '',
      password: 'secret123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email format', () => {
    const result = loginRequestSchema.safeParse({
      email: 'notanemail',
      password: 'secret123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing password', () => {
    const result = loginRequestSchema.safeParse({
      email: 'test@example.com',
      password: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('registerRequestSchema', () => {
  it('accepts valid registration data', () => {
    const result = registerRequestSchema.safeParse({
      email: 'new@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects short password', () => {
    const result = registerRequestSchema.safeParse({
      email: 'new@example.com',
      password: '12345',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional role', () => {
    const result = registerRequestSchema.safeParse({
      email: 'new@example.com',
      password: 'password123',
      role: 'admin',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing email', () => {
    const result = registerRequestSchema.safeParse({
      email: '',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })
})

describe('loginResponseSchema', () => {
  it('validates a correct login response', () => {
    const result = loginResponseSchema.safeParse({
      token: 'jwt-token-123',
      user: {
        id: '1',
        email: 'user@test.com',
        name: 'Test User',
        role: 'operator',
      },
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing token', () => {
    const result = loginResponseSchema.safeParse({
      user: {
        id: '1',
        email: 'user@test.com',
        name: 'Test User',
        role: 'operator',
      },
    })
    expect(result.success).toBe(false)
  })
})

describe('registerResponseSchema', () => {
  it('validates a correct register response', () => {
    const result = registerResponseSchema.safeParse({
      user: {
        id: '1',
        email: 'new@test.com',
        name: 'New User',
        role: 'operator',
      },
    })
    expect(result.success).toBe(true)
  })
})

// ── Customer schemas ──────────────────────────────────────────────

describe('customerFormSchema', () => {
  it('accepts valid customer data with name', () => {
    const result = customerFormSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+541112345678',
      alias: 'johnd',
      address: 'Calle 123',
      googleMapsUrl: null,
      notes: null,
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty optional fields as null or empty string', () => {
    const result = customerFormSchema.safeParse({
      name: 'Jane Doe',
      email: '',
      phone: null,
      alias: '',
      address: null,
      googleMapsUrl: null,
      notes: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = customerFormSchema.safeParse({
      name: 'John',
      email: 'bademail',
      phone: null,
      alias: null,
      address: null,
      googleMapsUrl: null,
      notes: null,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid Google Maps URL', () => {
    const result = customerFormSchema.safeParse({
      name: 'John',
      email: null,
      phone: null,
      alias: null,
      address: null,
      googleMapsUrl: 'not-a-url',
      notes: null,
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid Google Maps URL', () => {
    const result = customerFormSchema.safeParse({
      name: 'John',
      email: null,
      phone: null,
      alias: null,
      address: null,
      googleMapsUrl: 'https://maps.google.com/?q=123',
      notes: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const result = customerFormSchema.safeParse({
      name: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('customerListSchema', () => {
  it('validates an empty array', () => {
    const result = customerListSchema.safeParse([])
    expect(result.success).toBe(true)
  })

  it('validates an array of customers', () => {
    const result = customerListSchema.safeParse([
      {
        id: '1',
        name: 'Customer A',
        email: 'a@test.com',
        phone: null,
        alias: null,
        address: null,
        googleMapsUrl: null,
        notes: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ])
    expect(result.success).toBe(true)
  })
})

// ── Sale schemas ──────────────────────────────────────────────────

describe('saleFormSchema', () => {
  const validItem: SaleItem = {
    variantId: 'var-1',
    quantity: 2,
    priceType: 'regular',
  }

  it('accepts valid sale data with channelReference', () => {
    const result = saleFormSchema.safeParse({
      customerId: 'cust-1',
      channel: 'web',
      channelReference: 'ML-12345',
      items: [validItem],
    })
    expect(result.success).toBe(true)
  })

  it('accepts sale data without channelReference', () => {
    const result = saleFormSchema.safeParse({
      customerId: 'cust-1',
      channel: 'web',
      items: [validItem],
    })
    expect(result.success).toBe(true)
  })

  it('accepts sale data with empty channelReference', () => {
    const result = saleFormSchema.safeParse({
      customerId: 'cust-1',
      channel: 'web',
      channelReference: '',
      items: [validItem],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty items array', () => {
    const result = saleFormSchema.safeParse({
      customerId: 'cust-1',
      channel: 'web',
      channelReference: 'ML-12345',
      items: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing customerId', () => {
    const result = saleFormSchema.safeParse({
      customerId: '',
      channel: 'web',
      items: [validItem],
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing channel', () => {
    const result = saleFormSchema.safeParse({
      customerId: 'cust-1',
      items: [validItem],
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid channel value', () => {
    const result = saleFormSchema.safeParse({
      customerId: 'cust-1',
      channel: 'mercadolibre',
      items: [validItem],
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid quantity (zero)', () => {
    const result = saleFormSchema.safeParse({
      customerId: 'cust-1',
      channel: 'whatsapp',
      items: [{ ...validItem, quantity: 0 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid priceType', () => {
    const result = saleFormSchema.safeParse({
      customerId: 'cust-1',
      channel: 'facebook',
      items: [{ ...validItem, priceType: 'invalid' }],
    })
    expect(result.success).toBe(false)
  })
})

describe('saleIdFormSchema', () => {
  it('accepts a non-empty sale ID', () => {
    const result = saleIdFormSchema.safeParse({ saleId: 'abc-123' })
    expect(result.success).toBe(true)
  })

  it('rejects empty sale ID', () => {
    const result = saleIdFormSchema.safeParse({ saleId: '' })
    expect(result.success).toBe(false)
  })
})

describe('manualMovementFormSchema', () => {
  it('accepts a positive amount in cents', () => {
    const result = manualMovementFormSchema.safeParse({
      concept: 'Retiro de prueba',
      amountCents: 1050,
      type: 'WITHDRAWAL',
    })

    expect(result.success).toBe(true)
  })

  it('rejects zero amount', () => {
    const result = manualMovementFormSchema.safeParse({
      concept: 'Retiro de prueba',
      amountCents: 0,
      type: 'WITHDRAWAL',
    })

    expect(result.success).toBe(false)
  })

  it('rejects negative amount', () => {
    const result = manualMovementFormSchema.safeParse({
      concept: 'Retiro de prueba',
      amountCents: -1050,
      type: 'WITHDRAWAL',
    })

    expect(result.success).toBe(false)
  })
})

// ── Inventory schemas ─────────────────────────────────────────────

describe('productFormSchema', () => {
  it('accepts valid product data', () => {
    const result = productFormSchema.safeParse({
      name: 'Test Product',
      description: 'A test product',
      baseSku: 'test-product',
      salePrice: 1000,
      sizes: ['S', 'M', 'L'],
      aliases: ['test', 'product'],
    })
    expect(result.success).toBe(true)
  })

  it('accepts product with optional presale price', () => {
    const result = productFormSchema.safeParse({
      name: 'Test Product',
      baseSku: 'test-product',
      salePrice: 1000,
      presalePrice: 800,
      sizes: ['S', 'M'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const result = productFormSchema.safeParse({
      name: '',
      baseSku: 'test',
      salePrice: 1000,
      sizes: ['S'],
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero sale price', () => {
    const result = productFormSchema.safeParse({
      name: 'Test',
      baseSku: 'test',
      salePrice: 0,
      sizes: ['S'],
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty sizes', () => {
    const result = productFormSchema.safeParse({
      name: 'Test',
      baseSku: 'test',
      salePrice: 1000,
      sizes: [],
    })
    expect(result.success).toBe(false)
  })
})

describe('purchaseItemSchema', () => {
  it('accepts valid item', () => {
    const result = purchaseItemSchema.safeParse({
      variantId: 'var-1',
      quantity: 10,
      unitCost: 500,
    })
    expect(result.success).toBe(true)
  })

  it('accepts zero unit cost', () => {
    const result = purchaseItemSchema.safeParse({
      variantId: 'var-1',
      quantity: 1,
      unitCost: 0,
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing variantId', () => {
    const result = purchaseItemSchema.safeParse({
      variantId: '',
      quantity: 5,
      unitCost: 500,
    })
    expect(result.success).toBe(false)
  })

  it('rejects quantity less than 1', () => {
    const result = purchaseItemSchema.safeParse({
      variantId: 'var-1',
      quantity: 0,
      unitCost: 500,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative unit cost', () => {
    const result = purchaseItemSchema.safeParse({
      variantId: 'var-1',
      quantity: 5,
      unitCost: -1,
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer quantity', () => {
    const result = purchaseItemSchema.safeParse({
      variantId: 'var-1',
      quantity: 2.5,
      unitCost: 500,
    })
    expect(result.success).toBe(false)
  })
})

describe('purchaseFormSchema', () => {
  const validItem = { variantId: 'var-1', quantity: 10, unitCost: 500 }

  it('accepts valid purchase with single item', () => {
    const result = purchaseFormSchema.safeParse({
      items: [validItem],
      supplierId: 'supp-1',
      notes: 'Bulk order',
      purchaseDate: '2025-03-15',
    })
    expect(result.success).toBe(true)
  })

  it('accepts multiple items in array', () => {
    const result = purchaseFormSchema.safeParse({
      items: [
        validItem,
        { variantId: 'var-2', quantity: 5, unitCost: 300 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('accepts minimal purchase with just items', () => {
    const result = purchaseFormSchema.safeParse({
      items: [validItem],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty items array', () => {
    const result = purchaseFormSchema.safeParse({
      items: [],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0]?.message).toBe('Debe incluir al menos un producto')
    }
  })

  it('rejects missing items field', () => {
    const result = purchaseFormSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

// ── Cash schemas ──────────────────────────────────────────────────

describe('cashClosingFormSchema', () => {
  it('accepts empty object (no notes)', () => {
    const result = cashClosingFormSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts notes', () => {
    const result = cashClosingFormSchema.safeParse({ notes: 'End of day' })
    expect(result.success).toBe(true)
  })

  it('accepts null notes', () => {
    const result = cashClosingFormSchema.safeParse({ notes: null })
    expect(result.success).toBe(true)
  })
})

// ── Sale summary schemas (list endpoint) ──────────────────────────

describe('customerSaleSummarySchema', () => {
  const validSummary = {
    saleId: '550e8400-e29b-41d4-a716-446655440000',
    customerId: 'cust-uuid-1',
    channelReference: 'ML-123456',
    channel: 'web',
    status: 'ACTIVE',
    totalRevenueCents: 150000,
    totalCostCents: 120000,
    grossProfitCents: 30000,
    lineCount: 2,
    createdAt: '2025-03-15T12:00:00.000Z',
    updatedAt: '2025-03-15T12:30:00.000Z',
  }

  it('parses a valid sale summary with all fields', () => {
    const result = customerSaleSummarySchema.safeParse(validSummary)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.saleId).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(result.data.customerId).toBe('cust-uuid-1')
      expect(result.data.status).toBe('ACTIVE')
      expect(result.data.totalRevenueCents).toBe(150000)
      expect(result.data.lineCount).toBe(2)
      expect(result.data.channel).toBe('web')
    }
  })

  it('accepts null channelReference', () => {
    const result = customerSaleSummarySchema.safeParse({
      ...validSummary,
      channelReference: null,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.channelReference).toBeNull()
    }
  })

  it('accepts unknown extra fields via passthrough', () => {
    const withExtra = { ...validSummary, extraField: 'ignored' }
    const result = customerSaleSummarySchema.safeParse(withExtra)
    expect(result.success).toBe(true)
  })

  it('rejects missing required field saleId', () => {
    const { saleId, ...withoutId } = validSummary
    const result = customerSaleSummarySchema.safeParse(withoutId)
    expect(result.success).toBe(false)
  })

  it('accepts all three status values', () => {
    for (const status of ['ACTIVE', 'CANCELLED', 'RETURNED']) {
      const result = customerSaleSummarySchema.safeParse({ ...validSummary, status })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status value', () => {
    const result = customerSaleSummarySchema.safeParse({ ...validSummary, status: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('accepts negative totalRevenueCents (schema does not enforce positivity)', () => {
    const result = customerSaleSummarySchema.safeParse({ ...validSummary, totalRevenueCents: -100 })
    expect(result.success).toBe(true)
  })
})

describe('saleListSchema', () => {
  it('validates an empty array', () => {
    const result = saleListSchema.safeParse([])
    expect(result.success).toBe(true)
  })

  it('validates an array of sale summaries (with items)', () => {
    const validEntry = {
      saleId: '550e8400-e29b-41d4-a716-446655440000',
      customerId: 'cust-uuid-1',
      channelReference: 'ML-123456',
      channel: 'web',
      status: 'ACTIVE',
      totalRevenueCents: 150000,
      totalCostCents: 120000,
      grossProfitCents: 30000,
      lineCount: 2,
      createdAt: '2025-03-15T12:00:00.000Z',
      updatedAt: '2025-03-15T12:30:00.000Z',
      items: [
        {
          lineId: 'line-uuid-1',
          variantId: 'var-uuid-1',
          productName: 'Camiseta',
          sku: 'CAM-M',
          displayLabel: 'Camiseta',
          attributes: { size: 'M' },
          quantity: 1,
          unitPriceCents: 75000,
          priceType: 'regular',
        },
      ],
    }
    const result = saleListSchema.safeParse([validEntry, validEntry])
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(2)
      expect(result.data[0].items).toHaveLength(1)
    }
  })

  it('rejects a non-array value', () => {
    const result = saleListSchema.safeParse({ not: 'an array' })
    expect(result.success).toBe(false)
  })
})

// ── Sale detail schemas (detail endpoint) ──────────────────────────

describe('saleDetailSchema', () => {
  const validDetail = {
    id: 'sale-uuid-1',
    customerId: 'cust-uuid-1',
    channelReference: 'ML-123456',
    channel: 'web',
    status: 'ACTIVE',
    totalRevenueCents: 250000,
    totalCostCents: 180000,
    grossProfitCents: 70000,
    createdAt: '2025-03-15T12:00:00.000Z',
    updatedAt: '2025-03-15T12:30:00.000Z',
    lines: [
      {
        id: 'line-uuid-1',
        variantId: 'var-uuid-1',
        quantity: 2,
        unitPriceCents: 75000,
        priceType: 'regular',
        totalPriceCents: 150000,
        totalCostCents: 100000,
        consumptions: [
          {
            id: 'cons-uuid-1',
            purchaseLotId: 'lot-uuid-1',
            quantity: 2,
            unitCostCents: 50000,
            subtotalCents: 100000,
          },
        ],
      },
      {
        id: 'line-uuid-2',
        variantId: 'var-uuid-2',
        quantity: 1,
        unitPriceCents: 100000,
        priceType: 'presale',
        totalPriceCents: 100000,
        totalCostCents: 80000,
        consumptions: [],
      },
    ],
  }

  it('parses a valid sale detail with lines and consumptions', () => {
    const result = saleDetailSchema.safeParse(validDetail)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe('sale-uuid-1')
      expect(result.data.status).toBe('ACTIVE')
      expect(result.data.lines).toHaveLength(2)
      expect(result.data.lines[0].variantId).toBe('var-uuid-1')
      expect(result.data.lines[0].quantity).toBe(2)
      expect(result.data.lines[0].consumptions).toHaveLength(1)
      expect(result.data.lines[0].consumptions[0].unitCostCents).toBe(50000)
      expect(result.data.lines[1].priceType).toBe('presale')
    }
  })

  it('accepts extra fields via passthrough', () => {
    const withExtra = { ...validDetail, extraField: 'test' }
    const result = saleDetailSchema.safeParse(withExtra)
    expect(result.success).toBe(true)
  })

  it('accepts null channelReference in detail', () => {
    const result = saleDetailSchema.safeParse({
      ...validDetail,
      channelReference: null,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.channelReference).toBeNull()
    }
  })

  it('rejects missing required field', () => {
    const { customerId, ...withoutField } = validDetail
    const result = saleDetailSchema.safeParse(withoutField)
    expect(result.success).toBe(false)
  })

  it('rejects detail with invalid line priceType', () => {
    const bad = {
      ...validDetail,
      lines: [{ ...validDetail.lines[0], priceType: 'invalid' }],
    }
    const result = saleDetailSchema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it('accepts negative totalRevenueCents (schema does not enforce positivity)', () => {
    const result = saleDetailSchema.safeParse({ ...validDetail, totalRevenueCents: -1 })
    expect(result.success).toBe(true)
  })

  it('accepts CANCELLED and RETURNED statuses in detail', () => {
    for (const status of ['CANCELLED', 'RETURNED']) {
      const result = saleDetailSchema.safeParse({ ...validDetail, status })
      expect(result.success).toBe(true)
    }
  })
})

// ── Product List schemas ─────────────────────────────────────────

describe('productListQuerySchema', () => {
  it('accepts empty query (all defaults from backend)', () => {
    const result = productListQuerySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts full valid query', () => {
    const result = productListQuerySchema.safeParse({
      page: '2',
      pageSize: '10',
      search: 'shirt',
      status: 'all',
      sortBy: 'name',
      sortOrder: 'asc',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid numeric strings', () => {
    const result = productListQuerySchema.safeParse({
      page: '5',
      pageSize: '50',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-string values', () => {
    const result = productListQuerySchema.safeParse({ page: 1 })
    expect(result.success).toBe(false)
  })
})

describe('productListResponseSchema', () => {
  const validItem = {
    id: 'uuid-1',
    name: 'Test Product',
    description: null,
    baseSku: 'test-product',
    salePrice: 15.00,
    presalePrice: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    variants: [
      { id: 'var-1', sku: 'SKU-001', attributes: {}, isActive: true, stock: 10 },
      { id: 'var-2', sku: 'SKU-002', attributes: { size: 'M' }, isActive: true, stock: 5 },
    ],
  }

  const validMeta = {
    page: 1,
    pageSize: 20,
    totalItems: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    filters: { status: 'active', search: '' },
  }

  it('validates a correct list response', () => {
    const result = productListResponseSchema.safeParse({
      data: [validItem],
      meta: validMeta,
    })
    expect(result.success).toBe(true)
  })

  it('validates an empty list response', () => {
    const result = productListResponseSchema.safeParse({
      data: [],
      meta: validMeta,
    })
    expect(result.success).toBe(true)
  })

  it('validates correct "last page" metadata', () => {
    const result = productListResponseSchema.safeParse({
      data: [validItem],
      meta: { ...validMeta, totalItems: 10, totalPages: 2, hasPreviousPage: true, hasNextPage: false },
    })
    expect(result.success).toBe(true)
  })

  it('rejects response with missing data field', () => {
    const result = productListResponseSchema.safeParse({ meta: validMeta })
    expect(result.success).toBe(false)
  })

  it('rejects response with missing meta field', () => {
    const result = productListResponseSchema.safeParse({ data: [] })
    expect(result.success).toBe(false)
  })

  it('rejects item with missing variants array', () => {
    const result = productListResponseSchema.safeParse({
      data: [{ id: 'u-1', name: 'P', description: null, baseSku: 'p', salePrice: 10, presalePrice: null, isActive: true, createdAt: '2026', updatedAt: '2026' }],
      meta: validMeta,
    })
    expect(result.success).toBe(false)
  })
})

describe('productListMetaSchema', () => {
  it('validates correct pagination meta', () => {
    const result = productListMetaSchema.safeParse({
      page: 1,
      pageSize: 20,
      totalItems: 100,
      totalPages: 5,
      hasNextPage: true,
      hasPreviousPage: false,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      filters: { status: 'active', search: '' },
    })
    expect(result.success).toBe(true)
  })

  it('validates empty result meta (totalPages=0)', () => {
    const result = productListMetaSchema.safeParse({
      page: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      filters: { status: 'active', search: '' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing totalPages', () => {
    const result = productListMetaSchema.safeParse({
      page: 1,
      pageSize: 20,
      totalItems: 10,
      hasNextPage: true,
      hasPreviousPage: false,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      filters: { status: 'active', search: '' },
    })
    expect(result.success).toBe(false)
  })
})

// ── Sale list item schemas (PR3 garment display contract) ──────────

describe('saleListItemSchema', () => {
  const validItem = {
    lineId: 'line-uuid-1',
    variantId: 'var-uuid-1',
    productName: 'Camiseta Clásica',
    sku: 'CAM-CLA-M',
    displayLabel: 'Camiseta Clásica',
    attributes: { color: 'Blanco', size: 'M' },
    quantity: 2,
    unitPriceCents: 75000,
    priceType: 'regular' as const,
  }

  it('parses a fully populated sale item row', () => {
    const result = saleListItemSchema.safeParse(validItem)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.displayLabel).toBe('Camiseta Clásica')
      expect(result.data.quantity).toBe(2)
      expect(result.data.unitPriceCents).toBe(75000)
      expect(result.data.priceType).toBe('regular')
    }
  })

  it('accepts null productName and sku (fallback displayLabel still present)', () => {
    const result = saleListItemSchema.safeParse({
      ...validItem,
      productName: null,
      sku: null,
      displayLabel: 'Variante sin datos',
      attributes: {},
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.productName).toBeNull()
      expect(result.data.sku).toBeNull()
      expect(result.data.displayLabel).toBe('Variante sin datos')
    }
  })

  it('accepts empty attributes object', () => {
    const result = saleListItemSchema.safeParse({
      ...validItem,
      attributes: {},
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(Object.keys(result.data.attributes)).toHaveLength(0)
    }
  })

  it('accepts presale priceType', () => {
    const result = saleListItemSchema.safeParse({
      ...validItem,
      priceType: 'presale',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing displayLabel', () => {
    const { displayLabel, ...without } = validItem
    const result = saleListItemSchema.safeParse(without)
    expect(result.success).toBe(false)
  })

  it('rejects invalid priceType', () => {
    const result = saleListItemSchema.safeParse({
      ...validItem,
      priceType: 'sale',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing quantity', () => {
    const { quantity, ...without } = validItem
    const result = saleListItemSchema.safeParse(without)
    expect(result.success).toBe(false)
  })

  it('accepts passthrough extra fields', () => {
    const result = saleListItemSchema.safeParse({
      ...validItem,
      extraField: 'ignored',
    })
    expect(result.success).toBe(true)
  })
})

describe('saleListEntrySchema', () => {
  const validEntry: SaleListEntry = {
    saleId: '550e8400-e29b-41d4-a716-446655440000',
    customerId: 'cust-uuid-1',
    channelReference: 'ML-123456',
    channel: 'web',
    status: 'ACTIVE',
    totalRevenueCents: 150000,
    totalCostCents: 120000,
    grossProfitCents: 30000,
    lineCount: 2,
    createdAt: '2025-03-15T12:00:00.000Z',
    updatedAt: '2025-03-15T12:30:00.000Z',
    items: [
      {
        lineId: 'line-uuid-1',
        variantId: 'var-uuid-1',
        productName: 'Camiseta',
        sku: 'CAM-M',
        displayLabel: 'Camiseta',
        attributes: { size: 'M' },
        quantity: 1,
        unitPriceCents: 75000,
        priceType: 'regular',
      },
      {
        lineId: 'line-uuid-2',
        variantId: 'var-uuid-2',
        productName: 'Pantalón',
        sku: 'PAN-L',
        displayLabel: 'Pantalón',
        attributes: { size: 'L' },
        quantity: 1,
        unitPriceCents: 75000,
        priceType: 'regular',
      },
    ],
  }

  it('parses a valid entry with multiple items', () => {
    const result = saleListEntrySchema.safeParse(validEntry)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items).toHaveLength(2)
      expect(result.data.items[0].displayLabel).toBe('Camiseta')
      expect(result.data.saleId).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(result.data.status).toBe('ACTIVE')
    }
  })

  it('accepts empty items array', () => {
    const result = saleListEntrySchema.safeParse({
      ...validEntry,
      items: [],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items).toHaveLength(0)
    }
  })

  it('accepts single item', () => {
    const result = saleListEntrySchema.safeParse({
      ...validEntry,
      items: [validEntry.items[0]],
      lineCount: 1,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items).toHaveLength(1)
    }
  })

  it('rejects missing items field', () => {
    const { items, ...withoutItems } = validEntry
    const result = saleListEntrySchema.safeParse(withoutItems)
    expect(result.success).toBe(false)
  })

  it('accepts null channelReference', () => {
    const result = saleListEntrySchema.safeParse({
      ...validEntry,
      channelReference: null,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.channelReference).toBeNull()
    }
  })

  it('rejects missing saleId', () => {
    const { saleId, ...without } = validEntry
    const result = saleListEntrySchema.safeParse(without)
    expect(result.success).toBe(false)
  })

  it('accepts passthrough extra fields (backward compat)', () => {
    const result = saleListEntrySchema.safeParse({
      ...validEntry,
      extraField: 'ignored',
    })
    expect(result.success).toBe(true)
  })
})

describe('saleListSchema (PR3 — items[] contract)', () => {
  const validItem: SaleListItemDisplay = {
    lineId: 'line-uuid-1',
    variantId: 'var-uuid-1',
    productName: 'Camiseta',
    sku: 'CAM-M',
    displayLabel: 'Camiseta',
    attributes: { size: 'M' },
    quantity: 1,
    unitPriceCents: 75000,
    priceType: 'regular',
  }

  const validEntry: SaleListEntry = {
    saleId: 'sale-uuid-1',
    customerId: 'cust-uuid-1',
    channelReference: null,
    channel: 'web',
    status: 'ACTIVE',
    totalRevenueCents: 75000,
    totalCostCents: 50000,
    grossProfitCents: 25000,
    lineCount: 1,
    createdAt: '2025-03-15T12:00:00.000Z',
    updatedAt: '2025-03-15T12:30:00.000Z',
    items: [validItem],
  }

  it('validates an array of sale entries with items', () => {
    const result = saleListSchema.safeParse([validEntry])
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].items).toHaveLength(1)
    }
  })

  it('validates an empty array', () => {
    const result = saleListSchema.safeParse([])
    expect(result.success).toBe(true)
  })

  it('rejects a non-array value', () => {
    const result = saleListSchema.safeParse({ not: 'an array' })
    expect(result.success).toBe(false)
  })

  it('rejects old flat shape without items', () => {
    const { items, ...oldShape } = validEntry
    const result = saleListSchema.safeParse([oldShape])
    expect(result.success).toBe(false)
  })
})

