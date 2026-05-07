# Proposal: Complicidad Full API Frontend

## Intent

Turn `complicidad-APP` from a v0 demo scaffold into a server-first Next.js frontend covering the current `complicidad-API` contract: auth, inventory, sales/returns, customers, reports, cash closings, and diagnostics. Registration remains one public capability, not the whole product.

## Scope

### In Scope
- Public auth: `/register`, `/login`, backend `POST /api/v1/register|login`, JWT/session bootstrap, normalized `{ error, message }` errors.
- Protected app shell/dashboard for inventory, sales/returns, customers, reports, and cash workflows.
- Feature slices: `features/auth|inventory|sales|customers|reports|cash` with Zod schemas, forms, server actions/loaders, mappers, and UI states.
- Shared typed API client, endpoint/schema inventory from `exploration.md`, server-only `API_BASE_URL`, bearer injection, `cache: 'no-store'` for private data.
- Frontend Dockerization plus backend CORS/env alignment: internal Docker API URL vs browser-visible frontend origins.
- Remove unsafe TS build suppression and keep Server Components by default with minimal client islands.

### Out of Scope
- Backend endpoint creation, except minimal CORS/env changes required to unblock browser/frontend integration.
- Backend auth/RBAC enforcement; frontend protection is UX only until backend middleware exists.
- Rich product/sale list UX where backend list/detail endpoints are missing; use search/ID action flows as constraints.

## Capabilities

### New Capabilities
- `frontend-auth-session`: Register, login, JWT-backed session, public/protected routing.
- `frontend-api-foundation`: API client, env validation, error mapping, Docker/CORS strategy, config safety.
- `frontend-operations`: Protected inventory, sales/returns, customers, reports, cash, dashboard screens.

### Modified Capabilities
- None; no existing `openspec/specs/` or config rules were found.

## Approach

Use the exploration-recommended full API vertical-slice approach. Route shells stay server-rendered; client components are limited to forms, debounced search, interactive tables, dialogs, and pending/optimistic controls. Mutations go through Server Actions/route handlers to keep tokens and API DNS server-side.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/(public)`, `app/(app)` | New | Public auth and protected operational route groups. |
| `features/*`, `shared/api`, `shared/auth`, `shared/config` | New | Endpoint wrappers, schemas, session, env. |
| `components/ui`, `globals.css`, `tailwind.config.ts` | Modified | Branded reusable UI states/tokens. |
| `next.config.mjs`, `package.json`, Docker files | Modified/New | Safe config, lean bundles, standalone runtime. |
| Backend CORS/env | Modified if needed | Allow frontend browser origins without confusing Docker DNS. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Expanded scope under-specifies flows | High | Specs must mirror endpoint inventory by resource group. |
| No backend RBAC/auth middleware | High | Mark protected UX as non-security; raise backend gap. |
| Missing product/sale list endpoints | Med | Design constrained search/ID workflows; defer richer UX. |
| Schema drift without OpenAPI | Med | Central endpoint wrappers and Zod boundary parsing. |
| CORS/Docker env confusion | Med | Separate server `API_BASE_URL` from browser origins. |

## Rollback Plan

Revert frontend files and any minimal backend CORS/env edits; restore the prior scaffold/proposal if the full API scope is paused.

## Dependencies

- Current backend endpoints documented in `exploration.md`; JWT login response; Docker network/env; backend CORS allowlist.

## Success Criteria

- [ ] Specs/design/tasks cover every discovered endpoint group.
- [ ] Login/session and registration are specified as public auth flows.
- [ ] Protected app shell covers inventory, sales/returns, customers, reports, and cash.
- [ ] Missing backend list endpoints are documented as UX constraints, not silently assumed.
- [ ] Frontend Docker, API env, CORS, type/build safety, and lean server-first boundaries are specified.
