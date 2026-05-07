## Exploration: complicidad-frontend

### Current State
`complicidad-APP` is still a v0-generated Next.js 15.2.6 / React 19 / TypeScript scaffold using App Router, Tailwind 3, shadcn/Radix-style UI, React Hook Form, Zod, and pnpm. The only active page is `app/page.tsx`, which forces a full Client Component dashboard via `dark-store-dashboard.tsx`; there is no auth/session layer, API client, route map, feature slices, Dockerfile, or frontend tests. `next.config.mjs` suppresses TypeScript build errors, which conflicts with the injected project standard that type/build errors are defects.

Backend inspection found no OpenAPI/Swagger artifact. The authoritative contract is Express routes/controllers/use cases/tests/README in `complicidad-API`. Runtime mounts `/health` outside the API prefix and all application routes under `/api/v1`. Implemented endpoints are broader than registration: auth, inventory, sales/returns, customers, reports, and cash closings. The backend has JWT login output but no auth/RBAC middleware is currently enforced on routes; README explicitly lists RBAC middleware as deferred work. Frontend should still model operational routes as protected/private UX because they mutate business data and expose internal financial/customer information.

Discovered endpoint groups:

| Group | Endpoints | Evidence | Frontend capability needed | Access judgement |
|---|---|---|---|---|
| Health | `GET /health` | `src/app.ts` | connectivity/status indicator for diagnostics only | Public/internal diagnostic |
| Auth | `POST /api/v1/register`, `POST /api/v1/login` | `auth-routes.ts`, `AuthController.ts`, DTOs, e2e auth tests | register page, login page, token storage/session bootstrap, auth error mapping | Register/login public |
| Inventory | `POST /api/v1/products`, `GET /api/v1/items/search?term=...`, `POST /api/v1/purchases` | `inventory-routes.ts`, `ProductController.ts`, `InventoryController.ts`, use cases | product creation, searchable item picker, purchase/restock form | Protected; product/purchase likely admin/staff |
| Sales & returns | `POST /api/v1/sales`, `POST /api/v1/sales/:id/cancel`, `POST /api/v1/sales/:id/return` | `sale-routes.ts`, `SaleController.ts`, full-flow e2e | POS/new sale flow, customer + item selection, sale action results, cancel/return action entry | Protected; cancel likely admin/manager |
| Customers | `GET/POST /api/v1/customers`, `GET/PUT /api/v1/customers/:id`, `GET /api/v1/customers/:id/history` | `customer-routes.ts`, `CustomerController.ts`, customer use cases | customer list, create/edit form, detail page, purchase-history tab/cards | Protected; customer data private |
| Reports | nine `GET /api/v1/reports/*` endpoints | `report-routes.ts`, `ReportController.ts`, report use cases | financial dashboard cards/tables for liquidity, stock, sales, COGS, profit, reinvestment, operating capital, stock by product, lots | Protected; financial/admin/manager |
| Cash | `POST /api/v1/cash/closings` | `report-routes.ts`, `ManualCashCloseUseCase.ts` | cash closing form/dialog with notes and confirmation | Protected; admin/manager |

Important backend contract notes: JSON errors use `{ error, message }`; validation/business errors are generally `400`; missing resources are `404`; auth failures are `401`; registration duplicate email is `409`; some unavailable use-case wiring can return `503`. Currency fields are integer cents and report currency is `ARS`. Sales, purchases, returns, and cancellations are transactional backend operations; frontend must prevent duplicate submits and show confirmation for destructive/reversing operations.

### Affected Areas
- `app/page.tsx`, `app/layout.tsx` — should become server-rendered branded shell and route entry points instead of a monolithic client dashboard.
- `app/(public)/login`, `app/(public)/register` — public auth routes needed for existing auth endpoints.
- `app/(app)/dashboard`, `app/(app)/inventory`, `app/(app)/sales`, `app/(app)/customers`, `app/(app)/reports`, `app/(app)/cash` — protected operational route groups needed to cover all backend capabilities.
- `features/auth`, `features/inventory`, `features/sales`, `features/customers`, `features/reports`, `features/cash` — vertical slices for schemas, forms, server actions, mappers, and screen components.
- `shared/api` — typed HTTP client conventions for all endpoints, including auth header support and normalized error mapping.
- `shared/config/env.ts` — server-only API base URL, browser origin/public URL only when needed, Docker/local/prod validation.
- `shared/auth` — token/session boundary. Backend returns JWT from login; frontend must decide cookie/session storage strategy instead of scattering token logic through clients.
- `components/ui/*` — reuse primitives, tables, dialogs, alerts, skeletons, empty states, forms; prune unused v0/demo-heavy components/deps after import audit.
- `app/globals.css`, `tailwind.config.ts` — map Complicidad palette to CSS variables with contrast-safe pairings.
- `next.config.mjs`, `package.json`, Docker files — remove unsafe type suppression, set project identity, standalone Docker runtime, lean build context.
- Backend `src/app.ts`, `src/config/env.ts` — CORS allowlist still needed for browser origins, especially if any direct browser-to-API fetch remains.

### Approaches
1. **Full API vertical-slice frontend** — Keep App Router and shadcn primitives, but expand from registration-only to feature slices for every implemented backend group. Use Server Components for route shells and server-side loaders/actions for API calls; client islands are limited to forms, interactive tables/search, dialogs, and optimistic/pending controls.
   - Pros: Covers the user's full requirement, preserves server-first Next.js performance, centralizes backend contracts, grows maintainably by resource group.
   - Cons: Larger scope than current proposal/spec/design; requires auth/session design before protected screens are useful; some backend read endpoints are missing for sales/products lists, forcing UX compromises.
   - Effort: High

2. **Registration-first plus generic endpoint console** — Keep existing registration plan and add a thin internal admin console with forms for uncovered endpoints.
   - Pros: Faster and still technically reaches all endpoints.
   - Cons: Poor product UX, duplicated validation, weak domain structure, likely throwaway work. This is immediacy over architecture — it would teach the codebase bad habits.
   - Effort: Medium

3. **Backend-contract generation first** — Create/derive OpenAPI from backend controllers, generate TS clients/schemas, then build screens.
   - Pros: Strong contract consistency, useful long-term if backend keeps growing.
   - Cons: No OpenAPI exists today; generation would be a separate backend documentation change before delivering UI.
   - Effort: High

### Recommendation
Use Approach 1 and update downstream SDD artifacts from “registration-only frontend base” to “full API frontend shell”. Keep a minimal but real architecture: route groups for public/protected areas, `features/<bounded-context>` vertical slices, `shared/api` endpoint modules, `shared/api/errors.ts` for `{ error, message }` normalization, `shared/config/env.ts`, `shared/auth/session.ts`, and shared UI state components for loading/empty/error/success.

Recommended route map:

| Route | Purpose | Endpoint coverage |
|---|---|---|
| `/register` | public account creation | `POST /register` |
| `/login` | public authentication | `POST /login` |
| `/dashboard` | summary cards and diagnostics | `/health`, key report endpoints |
| `/inventory/products/new` | create product + initial variant | `POST /products` |
| `/inventory/search` | item/SKU/alias lookup and item picker base | `GET /items/search` |
| `/inventory/purchases/new` | restock/purchase intake | `POST /purchases` |
| `/sales/new` | create sale with customer/item selection | `POST /sales`, `GET /customers`, `GET /items/search` |
| `/sales/actions` or sale result action dialogs | cancel/return by sale id until a sale-list endpoint exists | `POST /sales/:id/cancel`, `POST /sales/:id/return` |
| `/customers` | list and create customers | `GET/POST /customers` |
| `/customers/[id]` | detail/edit/history | `GET/PUT /customers/:id`, `GET /customers/:id/history` |
| `/reports` | financial report dashboard | all `GET /reports/*` |
| `/reports/lots`, `/reports/stock` | table-heavy report drilldowns | `GET /reports/lots`, `GET /reports/stock-by-product` |
| `/cash/closings/new` | manual cash close | `POST /cash/closings` |

API client conventions: define one server-only `apiFetch<T>()` with base URL parsing, timeout/retry-safe network error handling, optional bearer token injection, `cache: 'no-store'` for mutable/private data, and endpoint wrappers such as `authApi.login`, `customersApi.list`, `reportsApi.getLiquidity`. Put request schemas next to feature forms and response schemas/types next to endpoint clients; parse unknown backend JSON defensively with Zod for runtime boundaries. Mutations should be Server Actions or route handlers so API DNS and token handling stay server-side; direct browser fetch should be the exception and documented.

UI state conventions: every mutation form needs idle/submitting/success/error states and duplicate-submit protection; reports need skeletons, stale/error banners, empty states for no stock/no lots/no customers, and currency formatting from integer cents. Destructive/reversing operations (`cancel`, `return`, `cash closing`) need confirmation dialogs and success receipts. Search should debounce client input but execute through a server-mediated action or route handler.

Docker/CORS/env: frontend should use a production Next standalone Docker image and compose on the same network as `api`; server-side calls use internal `API_BASE_URL=http://api:3000` in Docker, while backend CORS allowlist uses browser-visible origins such as `http://localhost:3001`. Add `CORS_ORIGINS`/`FRONTEND_ORIGIN` to backend env parsing before browser calls are relied on. If JWT is stored in an httpOnly frontend cookie, backend can still receive bearer tokens server-to-server and CORS can stay non-credentialed unless future direct browser auth calls require otherwise.

### Risks
- Scope expanded from one registration flow to the entire operational app; proposal/spec/design/tasks must be revised before implementation or the pipeline will under-spec critical screens.
- Backend lacks enforced auth/RBAC middleware even though JWT login exists; frontend-only protection is UX, not security. Treat this as a backend security gap, especially for reports/cash/sales mutation routes.
- Backend has limited read endpoints for products/sales; frontend can create/search products and create/cancel/return sales, but cannot build rich product/sale lists without new backend endpoints or awkward ID-based action screens.
- Full API coverage increases schema drift risk because there is no OpenAPI source; typed clients and Zod parsing are necessary guardrails.
- Token/session storage choice affects security, CORS, and server action design; choosing localStorage would simplify client fetches but worsens XSS exposure and bundle/client boundaries.
- Report data may be sensitive and expensive; avoid public caching, use server-side fetching, and design loading/error states deliberately.
- Existing v0 dashboard/Recharts code can bloat protected routes if reused carelessly; import charts directly/dynamically and keep public/auth routes lean.
- Docker/CORS configuration now spans both frontend and backend; internal service DNS and browser origins are different concepts and must not be conflated.

### Ready for Proposal
Yes — update the proposal/spec/design/tasks to full API coverage. The orchestrator should revise the change scope from “registration frontend base” to “complete frontend for current backend API”, with explicit auth/session, route map, endpoint schemas, protected UX, Docker/CORS, and known backend gaps for missing list/detail endpoints.
