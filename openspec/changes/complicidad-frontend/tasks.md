# Tasks: Complicidad Full API Frontend

## Phase 1: Scaffold and Safe Configuration

- [x] 1.1 Update `package.json`, app metadata, and route titles from v0/demo naming to Complicidad; audit/remove unused demo dependencies.
- [x] 1.2 Delete/quarantine `dark-store-dashboard.tsx` and demo dashboard leftovers; make `app/page.tsx` redirect to `/dashboard` or `/login`.
- [x] 1.3 Update `next.config.mjs` to fail on TypeScript/ESLint errors; do not add ignored type/build error flags.
- [x] 1.4 Define Complicidad Tailwind/CSS tokens in `app/globals.css` and `tailwind.config.ts`; verify palette contrast for primary text/actions.

## Phase 2: Shared Foundation

- [x] 2.1 Create `shared/config/env.ts` for server env validation: `API_BASE_URL`, cookie settings, public frontend origin, and production safety checks.
- [x] 2.2 Create `shared/api/api-fetch.ts` with timeout/network handling, `cache: 'no-store'`, bearer injection hook, and normalized `{ error, message }` mapping.
- [x] 2.3 Create `shared/api/{auth,inventory,sales,customers,reports,cash,health}.ts` with Zod request/response schemas for every discovered endpoint.
- [x] 2.4 Add `shared/api/contracts.md` endpoint coverage notes to mitigate OpenAPI drift and document missing products/sales list/detail endpoints.
- [x] 2.5 Create shared UI states in `components/ui/*`: loading, empty, error, success receipt, confirmation, form field errors.

## Phase 3: Auth and Protected Shell

- [x] 3.1 Create `shared/auth/session.ts` for secure httpOnly JWT cookie read/write/delete and protected redirect helpers.
- [x] 3.2 Build `app/(public)/login` and `features/auth/login/*` against `POST /api/v1/login` with 400/401/network states.
- [x] 3.3 Build `app/(public)/register` and `features/auth/register/*` against `POST /api/v1/register` with 201/400/409 states and duplicate-submit protection.
- [x] 3.4 Create `app/(app)/layout.tsx`, `components/navigation/*`, and `/dashboard`; gate private UI on frontend session and disclose backend auth/RBAC gap.
- [x] 3.5 Add logout action/route in `features/auth/logout/*` that clears the cookie and returns to login.

## Phase 4: Resource Flows

- [x] 4.1 Implement `features/customers/*` and `app/(app)/customers/*` for list/create/detail/update/history with loading, empty, not-found, and retry-safe errors.
- [x] 4.2 Implement `features/inventory/*` and `app/(app)/inventory/*` for product create, item search, and purchase create; no fake product list.
- [x] 4.3 Implement `features/sales/*` and `app/(app)/sales/*` for sale create plus ID-entry cancel/return confirmations; document absent sale list/detail UX.
- [x] 4.4 Implement `features/reports/*` and `app/(app)/reports/*` for all report endpoints with ARS cents formatting and independent no-store loads.
- [x] 4.5 Implement `features/cash/*` and `app/(app)/cash/closings/new` for manual closing confirmation, receipt, and duplicate-submit protection.

## Phase 5: Backend CORS and Docker

- [x] 5.1 Update `complicidad-API` CORS config to use env-driven allowed origins, preflight methods/headers, and no wildcard in production.
- [x] 5.2 Document Docker/browser origin distinction in compose env/docs: server `API_BASE_URL=http://api:3000` versus browser frontend origin.
- [x] 5.3 Add frontend `Dockerfile` and `.dockerignore` for Next standalone runtime; keep secrets, node_modules, and build artifacts out of context.
- [x] 5.4 Align compose/runtime env so frontend server calls backend service DNS and backend CORS permits configured browser origins.

## Phase 6: Tests and Verification

- [ ] 6.1 Add unit tests for `shared/config/env.ts`, `shared/api/api-fetch.ts`, auth cookie helpers, schemas, and ARS formatting.
- [ ] 6.2 Add component/action tests for login, registration, customer forms, item search states, sale reversal, cash closing, and report errors.
- [ ] 6.3 Run available non-build verification: typecheck, lint, and tests; treat failures as defects.
- [ ] 6.4 Verify backend CORS with targeted preflight/request checks for allowed and rejected origins.
- [ ] 6.5 Prepare Docker run/compose smoke plan; Docker image build verification requires explicit user approval before execution.
