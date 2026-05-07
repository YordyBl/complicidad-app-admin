# Design: Complicidad Full API Frontend

## Technical Approach

Replace the v0 client dashboard with a server-first Next.js 15 App Router app covering every current Express endpoint: public auth, protected inventory, sales/returns, customers, reports, cash closing, and diagnostics. Route shells/loaders stay Server Components; forms, debounced search, dialogs, navigation toggles, and pending states are small Client Components. Backend calls go through shared server-side endpoint wrappers, with Zod at runtime boundaries and normalized `{ error, message }` handling.

## Architecture Decisions

| Topic | Choice | Tradeoff | Decision |
|---|---|---|---|
| App shape | `app/(public)`, `app/(app)`, `features/<domain>`, `shared/{api,auth,config,schemas}` | More files than page-local code | Vertical slices scale across all backend groups without a monolith. |
| Rendering/fetching | Server Components + Server Actions/route handlers; client fetch only for exceptional UI needs | Requires server-mediated search/actions | Keeps bundles lean, hides internal API DNS, supports httpOnly session cookies. |
| Auth/session | Login action stores backend JWT in secure httpOnly cookie; `shared/auth/session.ts` reads it; `(app)` layout redirects unauthenticated users | Frontend protection is not backend security | Safer than localStorage; backend still needs real auth/RBAC later. |
| API client | `shared/api/api-fetch.ts` plus per-resource modules | Manual contracts until OpenAPI exists | Centralizes bearer injection, `cache: 'no-store'`, timeout/network errors, and status mapping. |
| Docker/CORS | Next standalone container uses `API_BASE_URL=http://api:3000`; backend CORS allowlist uses browser origins | Two env concepts to document | Container DNS and browser `Origin` are different; conflating them breaks compose/prod. |

## Route Map / Data Flow

```text
Server route/layout -> feature loader/action -> shared/api(+JWT) -> /api/v1 or /health
Client islands -> server action/route handler -> normalized result -> field/global UI state
```

| Route | Feature | Endpoints |
|---|---|---|
| `/login`, `/register` | `features/auth` | `POST /login`, `POST /register` |
| `/dashboard` | `features/dashboard` | `/health`, report summaries |
| `/inventory/products/new`, `/inventory/search`, `/inventory/purchases/new` | `features/inventory` | `POST /products`, `GET /items/search?term=`, `POST /purchases` |
| `/sales/new`, `/sales/actions` | `features/sales` | `POST /sales`, `POST /sales/:id/cancel`, `POST /sales/:id/return` |
| `/customers`, `/customers/[id]` | `features/customers` | `GET/POST /customers`, `GET/PUT /customers/:id`, `GET /customers/:id/history` |
| `/reports`, `/reports/stock`, `/reports/lots` | `features/reports` | liquidity, stock investment, sales total, FIFO COGS, gross profit, reinvestment, operating capital, stock-by-product, lots |
| `/cash/closings/new` | `features/cash` | `POST /cash/closings` |

Missing backend list endpoints constrain UX: no products list and no sales list/detail. Product UI must rely on create + search; sales cancel/return must be ID-entry/result flows until backend adds list/detail endpoints. Do not fake unavailable lists with client state.

## File Changes

| File | Action | Description |
|---|---|---|
| `app/page.tsx`, `dark-store-dashboard.tsx` | Modify/Delete | Redirect to `/dashboard` or `/login`; remove v0 dashboard bundle. |
| `app/(public)/*`, `app/(app)/*` | Create | Public auth and protected operational route groups/layouts/navigation. |
| `features/{auth,inventory,sales,customers,reports,cash,dashboard}/*` | Create | Schemas, actions, loaders, forms, tables/cards/dialogs per resource. |
| `shared/api/*` | Create | `apiFetch`, endpoint modules, error/result types, currency/date mappers. |
| `shared/auth/session.ts` | Create | Cookie/JWT read-write-delete, redirect helpers, bearer extraction. |
| `shared/config/env.ts` | Create | Server env validation for API URL, cookie flags, public origin. |
| `components/navigation/*`, `components/ui/*` | Create/Reuse | Protected nav, resource shells, empty/error/skeleton states. |
| `next.config.mjs`, `package.json`, `app/globals.css`, `tailwind.config.ts` | Modify | Standalone output, remove type suppression, rename/prune deps, tokenized palette. |
| `Dockerfile`, `.dockerignore`, compose env/docs | Create | Production container and backend-compatible local orchestration. |

## Interfaces / Contracts

Request schemas live beside feature forms; response schemas live beside `shared/api/<resource>.ts`. Currency is integer cents, displayed as ARS. Mutations must prevent duplicate submit; cancel/return/cash close require confirmation and receipt. Private GETs use `cache: 'no-store'`; independent report loads use parallel fetching/Suspense.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | env, auth cookie helpers, schemas, API error mapper | Vitest or project-selected equivalent. |
| Component | forms/search/dialog states | React Testing Library; no broad client shells. |
| Integration | server actions and protected redirects | Mock `fetch` and cookies. |
| E2E/verify | login/register, customer flow, sale/purchase/cash happy paths, Docker/CORS smoke | Treat type/lint/build errors as defects; do not suppress. |

## Migration / Rollout

No data migration required. Implement foundation/auth first, then customers/inventory, sales/cash, reports, then Docker/CORS verification.

## Open Questions

- [ ] Production API/frontend origins are not known.
- [ ] Backend auth/RBAC is deferred; frontend protection must not be treated as security enforcement.
