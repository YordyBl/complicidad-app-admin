# Frontend API Contract Specification

## Purpose
Define typed endpoint coverage, schema parsing, and backend error conventions.

## Requirements

### Requirement: Endpoint Mapping and Schemas
The frontend MUST provide typed wrappers and runtime schemas for every discovered endpoint: `/health`, auth, products, item search, purchases, sales/cancel/return, customers CRUD/history, reports, and cash closings.

#### Scenario: Endpoint coverage audit
- GIVEN the backend route inventory from exploration
- WHEN frontend API modules are reviewed
- THEN each implemented endpoint has a mapped wrapper, request/response schema where applicable, and tests or verification notes proving coverage

### Requirement: Error, Cache, and Currency Conventions
The API layer MUST normalize `{ error, message }`, map `400`/`401`/`404`/`409`/`503`, avoid public caching for private mutable data, and format integer cents as ARS in UI.

#### Scenario: Normalized backend failure
- GIVEN any endpoint returns validation, auth, missing-resource, conflict, service-unavailable, or network failure
- WHEN the frontend handles the response
- THEN callers receive a typed, user-safe error state
