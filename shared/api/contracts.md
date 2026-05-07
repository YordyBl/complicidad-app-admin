# API Contract Coverage Notes

Last updated: 2026-05-06 (post-verify cleanup: sales GET endpoints, product pagination metadata)

## Purpose

Document endpoint coverage and known gaps to mitigate schema drift.
The backend has no OpenAPI/Swagger artifact — the authoritative contract
is the TypeScript source in `complicidad-API/src/modules/*`.

## Covered Endpoints

| Group | Method | Path | Module | Status |
|---|---|---|---|---|
| Auth | POST | `/api/v1/login` | `shared/api/auth.ts` | ✅ |
| Auth | POST | `/api/v1/register` | `shared/api/auth.ts` | ✅ |
| Customers | GET | `/api/v1/customers` | `shared/api/customers.ts` | ✅ |
| Customers | POST | `/api/v1/customers` | `shared/api/customers.ts` | ✅ |
| Customers | GET | `/api/v1/customers/:id` | `shared/api/customers.ts` | ✅ |
| Customers | PUT | `/api/v1/customers/:id` | `shared/api/customers.ts` | ✅ |
| Customers | GET | `/api/v1/customers/:id/history` | `shared/api/customers.ts` | ✅ |
| Inventory | POST | `/api/v1/products` | `shared/api/inventory.ts` | ✅ |
| Inventory | GET  | `/api/v1/products` | `shared/api/inventory.ts` | ✅ |
| Inventory | GET  | `/api/v1/products/:id` | `shared/api/inventory.ts` | ✅ |
| Inventory | GET | `/api/v1/items/search?term=` | `shared/api/inventory.ts` | ✅ |
| Inventory | POST | `/api/v1/purchases` | `shared/api/inventory.ts` | ✅ |
| Sales | GET | `/api/v1/sales` | `shared/api/sales.ts` | ✅ |
| Sales | GET | `/api/v1/sales/:id` | `shared/api/sales.ts` | ✅ |
| Sales | POST | `/api/v1/sales` | `shared/api/sales.ts` | ✅ |
| Sales | POST | `/api/v1/sales/:id/cancel` | `shared/api/sales.ts` | ✅ |
| Sales | POST | `/api/v1/sales/:id/return` | `shared/api/sales.ts` | ✅ |
| Reports | GET | `/api/v1/reports/liquidity` | `shared/api/reports.ts` | ✅ |
| Reports | GET | `/api/v1/reports/stock-investment` | `shared/api/reports.ts` | ✅ |
| Reports | GET | `/api/v1/reports/sales-total` | `shared/api/reports.ts` | ✅ |
| Reports | GET | `/api/v1/reports/fifo-cogs` | `shared/api/reports.ts` | ✅ |
| Reports | GET | `/api/v1/reports/gross-profit` | `shared/api/reports.ts` | ✅ |
| Reports | GET | `/api/v1/reports/reinvestment` | `shared/api/reports.ts` | ✅ |
| Reports | GET | `/api/v1/reports/operating-capital` | `shared/api/reports.ts` | ✅ |
| Reports | GET | `/api/v1/reports/stock-by-product` | `shared/api/reports.ts` | ✅ |
| Reports | GET | `/api/v1/reports/lots` | `shared/api/reports.ts` | ✅ |
| Cash | POST | `/api/v1/cash/closings` | `shared/api/cash.ts` | ✅ |
| Health | GET | `/health` | `shared/api/health.ts` | ✅ |

## Known Backend Gaps & Contract Notes

### Inventory: Search & Pagination

`GET /api/v1/products` supports the following query parameters for search
and pagination:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | `string` | — | Filters by `name`, `aliases`, `base_sku`, and `variants.sku` (case-insensitive) |
| `status` | `'active' \| 'inactive' \| 'all'` | `'active'` | Product status filter |
| `page` | `number` | `1` | Page number (1-indexed) |
| `pageSize` | `number` | `10` | Items per page |

Response shape: `{ data: ProductListItem[], meta: { page, pageSize, totalItems, totalPages } }`.

The UI preserves search context in URL query params (`?search=&status=&page=`) so
navigation, refresh, and sharing work predictably.

### Product Detail

`GET /api/v1/products/:id` resolves a single product by its canonical ID.

- `200` → full detail object
- `404` → `{ error: "NotFoundError", message: "Product not found" }`

The frontend uses this endpoint directly (not an ID-based search workaround).

### Sales Contract Transition

The sales model distinguishes between the **sales channel** and its
**optional reference metadata**:

- `channel` — canonical field describing the sale origin (e.g. `"store"`,
  `"online"`, `"phone"`). **Required** in create payloads.
- `channelReference` — optional/deprecated free-text reference. May be
  `null` or omitted entirely in create payloads. Responses include it
  as `string | null` for backward compatibility with historical records.

Historical records may still carry `channelReference`; new sales should
not depend on it.

### Auth / RBAC

1. **`GET /api/v1/sales` and `GET /api/v1/sales/:id`** — Available as of the
   `mejora-inventario-ventas-productos` change. Returns paginated sale list
   and full sale detail respectively. See `shared/api/sales.ts` for query
   parameters and response shapes.

2. **No backend auth/RBAC middleware** — All routes are technically open.
   Frontend session protection is UX-only.
   **This is documented technical debt — do NOT treat frontend auth as
   guaranteed backend protection.** The backend README tracks this as
   "RBAC middleware is deferred work." Any production deployment must
   address this before exposing the system to untrusted networks.

## Error Convention

All backend errors follow `{ error: string, message: string }` shape:
- `400` — ValidationError, InputValidationError, business rule errors
- `401` — AuthenticationError (login failures)
- `404` — NotFoundError (missing resources)
- `409` — DuplicateUserEmailError (registration conflict)
- `503` — ServiceUnavailable (search/features not wired)

The `ApiResult<T>` type in `api-fetch.ts` normalizes all errors uniformly.

## Currency Convention

All monetary values are integer cents. UI displays them in PEN
(Peruvian Sol / `S/`) using Peruvian locale (`es-PE`) via the
`formatCurrency()` / `formatPrice()` helpers in `shared/api/formatters.ts`.

## Frontend API Route Handlers (Proxy)

The following Next.js route handlers proxy client-side searches to the backend,
avoiding CORS issues and keeping backend DNS server-only:

| Route | Method | Backend Proxied | Module |
|---|---|---|---|
| `/api/customers/search?term=` | GET | `GET /api/v1/customers` (client-filtered) | `app/api/customers/search/route.ts` |
| `/api/inventory/search?term=` | GET | `GET /api/v1/items/search?term=` | `app/api/inventory/search/route.ts` |

These exist because client-side debounced search needs a server-mediated boundary.

## Cache Policy

- All GET requests for mutable/private data use `cache: 'no-store'`
- Health checks use `cache: 'no-store'` with short timeout
- Public GET endpoints that return static data may use Next.js fetch cache
