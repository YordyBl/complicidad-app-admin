/**
 * Client-safe schemas and types for the Complicidad frontend.
 *
 * This file is safe to import from Client Components.
 * It contains ONLY Zod schemas and inferred types — NO server-only
 * dependencies (next/headers, api-fetch, etc.).
 *
 * Domain API modules import their schemas from here and add
 * `import 'server-only'` guards on the server-only fetch functions.
 */

import { z } from 'zod'

// ── Auth schemas ────────────────────────────────────────────────────

export const loginRequestSchema = z.object({
  email: z.string().min(1, 'El email es requerido').email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export type LoginRequest = z.infer<typeof loginRequestSchema>

export const loginResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.string(),
  }),
})

export type LoginResponse = z.infer<typeof loginResponseSchema>

export const registerRequestSchema = z.object({
  email: z.string().min(1, 'El email es requerido').email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.string().optional(),
})

export type RegisterRequest = z.infer<typeof registerRequestSchema>

export const registerResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.string(),
  }),
})

export type RegisterResponse = z.infer<typeof registerResponseSchema>

// ── Customer schemas ────────────────────────────────────────────────

const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  alias: z.string().nullable(),
  address: z.string().nullable(),
  googleMapsUrl: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Customer = z.infer<typeof customerSchema>

export const customerListSchema = z.array(customerSchema)

/** Backend CustomerHistoryResponse shape (v2). */
export const customerSaleSummarySchema = z.object({
  saleId: z.string(),
  channelReference: z.string().nullable(),
  channel: z.string(),
  status: z.enum(['ACTIVE', 'CANCELLED', 'RETURNED']),
  totalRevenueCents: z.number(),
  totalCostCents: z.number(),
  grossProfitCents: z.number(),
  lineCount: z.number(),
  createdAt: z.string(),
}).passthrough()

export type CustomerSaleSummary = z.infer<typeof customerSaleSummarySchema>

const customerHistorySummarySchema = z.object({
  totalSales: z.number(),
  activeCount: z.number(),
  cancelledCount: z.number(),
  returnedCount: z.number(),
  totalRevenueCents: z.number(),
  totalCostCents: z.number(),
  grossProfitCents: z.number(),
}).passthrough()

export type CustomerHistorySummary = z.infer<typeof customerHistorySummarySchema>

export const customerHistoryResponseSchema = z.object({
  customerId: z.string(),
  customerName: z.string(),
  sales: z.array(customerSaleSummarySchema),
  summary: customerHistorySummarySchema,
}).passthrough()

export type CustomerHistoryResponse = z.infer<typeof customerHistoryResponseSchema>

// ── Sales schemas ───────────────────────────────────────────────

/** Reuses customerSaleSummarySchema shape — matches GET /sales response. */
export const saleListSchema = z.array(customerSaleSummarySchema)

export type SaleListItem = CustomerSaleSummary

const saleDetailLineConsumptionSchema = z.object({
  id: z.string(),
  purchaseLotId: z.string(),
  quantity: z.number(),
  unitCostCents: z.number(),
  subtotalCents: z.number(),
}).passthrough()

const saleDetailLineSchema = z.object({
  id: z.string(),
  variantId: z.string(),
  quantity: z.number(),
  unitPriceCents: z.number(),
  priceType: z.enum(['regular', 'presale']),
  totalPriceCents: z.number(),
  totalCostCents: z.number(),
  consumptions: z.array(saleDetailLineConsumptionSchema),
}).passthrough()

export const saleDetailSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  channelReference: z.string().nullable(),
  channel: z.string(),
  status: z.enum(['ACTIVE', 'CANCELLED', 'RETURNED']),
  totalRevenueCents: z.number(),
  totalCostCents: z.number(),
  grossProfitCents: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lines: z.array(saleDetailLineSchema),
}).passthrough()

export type SaleDetail = z.infer<typeof saleDetailSchema>

// ── DEPRECATED: old flat array type, kept for reference ─────
/** @deprecated Use CustomerHistoryResponse.sales instead */
const purchaseHistoryEntrySchema = z.object({
  saleId: z.string(),
  saleDate: z.string(),
  totalCents: z.number(),
  items: z.array(z.object({
    productName: z.string(),
    sku: z.string(),
    quantity: z.number(),
    unitPriceCents: z.number(),
  })),
}).passthrough()

/** @deprecated Use CustomerHistoryResponse instead */
export type PurchaseHistoryEntry = z.infer<typeof purchaseHistoryEntrySchema>

export const customerFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido').nullable().or(z.literal('')),
  phone: z.string().nullable().or(z.literal('')),
  alias: z.string().nullable().or(z.literal('')),
  address: z.string().nullable().or(z.literal('')),
  googleMapsUrl: z.string().url('URL inválida').nullable().or(z.literal('')),
  notes: z.string().nullable().or(z.literal('')),
})

export type CustomerFormData = z.infer<typeof customerFormSchema>

// ── Sales schemas ───────────────────────────────────────────────────

/** Closed channel catalog matching backend SALE_CHANNELS. */
export const SALE_CHANNELS = ['tiktok', 'facebook', 'whatsapp', 'web', 'instagram'] as const
export type SaleChannel = (typeof SALE_CHANNELS)[number]

export const saleChannelLabels: Record<SaleChannel, string> = {
  tiktok: 'TikTok',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  web: 'Web',
  instagram: 'Instagram',
}

const saleItemSchema = z.object({
  variantId: z.string().min(1, 'La variante es requerida'),
  quantity: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
  priceType: z.enum(['regular', 'presale'], {
    errorMap: () => ({ message: 'El tipo de precio debe ser "regular" o "presale"' }),
  }),
})

export type SaleItem = z.infer<typeof saleItemSchema>

export const saleFormSchema = z.object({
  customerId: z.string().min(1, 'El cliente es requerido'),
  channel: z.enum(SALE_CHANNELS, {
    errorMap: () => ({ message: 'El canal de venta es requerido' }),
  }),
  channelReference: z.string().optional(),
  items: z.array(saleItemSchema).min(1, 'Debe incluir al menos un producto'),
})

export type SaleFormData = z.infer<typeof saleFormSchema>

export const saleIdFormSchema = z.object({
  saleId: z.string().min(1, 'El ID de venta es requerido'),
})

// ── Inventory schemas ───────────────────────────────────────────────

export const productFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  baseSku: z.string().min(1, 'El SKU base es requerido'),
  salePrice: z.number().positive('El precio de venta debe ser positivo'),
  presalePrice: z.number().min(0).optional(),
  sizes: z.array(z.string().min(1)).min(1, 'Al menos un talle es requerido'),
  aliases: z.array(z.string()).optional(),
})

export type ProductFormData = z.infer<typeof productFormSchema>

const productResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  baseSku: z.string().optional(),
  salePrice: z.number(),
  presalePrice: z.number().nullable().optional(),
  variants: z.array(z.object({
    id: z.string(),
    sku: z.string(),
    attributes: z.record(z.string(), z.string()).optional(),
  })).optional(),
  aliases: z.array(z.string()).optional(),
}).passthrough()

export type ProductResponse = z.infer<typeof productResponseSchema>

const searchResultSchema = z.object({
  variantId: z.string(),
  sku: z.string(),
  productName: z.string(),
  salePrice: z.number(),
  presalePrice: z.number().nullable(),
  stock: z.number().optional(),
}).passthrough()

export type SearchResult = z.infer<typeof searchResultSchema>

export const purchaseItemSchema = z.object({
  variantId: z.string().min(1, 'La variante es requerida'),
  quantity: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
  unitCost: z.number().min(0, 'El costo unitario no puede ser negativo'),
})

export type PurchaseItem = z.infer<typeof purchaseItemSchema>

export const purchaseFormSchema = z.object({
  items: z.array(purchaseItemSchema).min(1, 'Debe incluir al menos un producto'),
  supplierId: z.string().optional(),
  notes: z.string().optional(),
  purchaseDate: z.string().optional(),
})

export type PurchaseFormData = z.infer<typeof purchaseFormSchema>

// ── Cash schemas ────────────────────────────────────────────────────

export const cashClosingFormSchema = z.object({
  notes: z.string().nullable().optional(),
})

export type CashClosingFormData = z.infer<typeof cashClosingFormSchema>

const cashClosingResponseSchema = z.object({
  id: z.string(),
  closedAt: z.string(),
  notes: z.string().nullable().optional(),
}).passthrough()

export type CashClosingResponse = z.infer<typeof cashClosingResponseSchema>

// ── Reports schemas ─────────────────────────────────────────────────

const amountCentsSchema = z.object({
  amountCents: z.number().int(),
}).passthrough()

export type AmountCents = z.infer<typeof amountCentsSchema>

const liquiditySchema = z.object({
  totalCashInCents: z.number().int(),
  totalCashOutCents: z.number().int(),
  balanceCents: z.number().int(),
}).passthrough()

export type LiquidityReport = z.infer<typeof liquiditySchema>

const stockInvestmentSchema = z.object({
  totalInvestmentCents: z.number().int(),
}).passthrough()

export type StockInvestmentReport = z.infer<typeof stockInvestmentSchema>

const salesTotalSchema = z.object({
  totalSalesCents: z.number().int(),
}).passthrough()

export type SalesTotalReport = z.infer<typeof salesTotalSchema>

const fifoCogsSchema = z.object({
  totalCogsCents: z.number().int(),
}).passthrough()

export type FifoCogsReport = z.infer<typeof fifoCogsSchema>

const grossProfitSchema = z.object({
  grossProfitCents: z.number().int(),
}).passthrough()

export type GrossProfitReport = z.infer<typeof grossProfitSchema>

const reinvestmentSchema = z.object({
  reinvestmentCents: z.number().int(),
}).passthrough()

export type ReinvestmentReport = z.infer<typeof reinvestmentSchema>

const operatingCapitalSchema = z.object({
  operatingCapitalCents: z.number().int(),
}).passthrough()

export type OperatingCapitalReport = z.infer<typeof operatingCapitalSchema>

const stockByProductSchema = z.array(z.object({
  productName: z.string(),
  sku: z.string(),
  stockQuantity: z.number().int(),
  totalRemainingQty: z.number().int(),
  investmentCents: z.number().int(),
}).passthrough())

export type StockByProductReport = z.infer<typeof stockByProductSchema>

const lotsSchema = z.array(z.object({
  lotId: z.string(),
  variantId: z.string(),
  productName: z.string(),
  sku: z.string(),
  purchasedQuantity: z.number().int(),
  quantity: z.number().int().optional(),
  remainingQuantity: z.number().int(),
  unitCost: z.number(),
  purchaseDate: z.string(),
}).passthrough())

export type LotsReport = z.infer<typeof lotsSchema>

// ── Product List schemas ─────────────────────────────────────────────

export const productListQuerySchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.string().optional(),
})

export type ProductListQuery = z.infer<typeof productListQuerySchema>

const productVariantSummarySchema = z.object({
  id: z.string(),
  sku: z.string(),
  attributes: z.record(z.string(), z.string()),
  isActive: z.boolean(),
  stock: z.number(),
})

const productListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  baseSku: z.string().optional(),
  salePrice: z.number(),
  presalePrice: z.number().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  variants: z.array(productVariantSummarySchema),
})

export type ProductListItem = z.infer<typeof productListItemSchema>

export const productListMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalItems: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  sortBy: z.string(),
  sortOrder: z.string(),
  filters: z.object({
    status: z.string(),
    search: z.string(),
  }),
})

export type ProductListMeta = z.infer<typeof productListMetaSchema>

export const productListResponseSchema = z.object({
  data: z.array(productListItemSchema),
  meta: productListMetaSchema,
})

export type ProductListResponse = z.infer<typeof productListResponseSchema>
