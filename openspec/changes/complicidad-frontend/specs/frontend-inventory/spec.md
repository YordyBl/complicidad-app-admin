# Frontend Inventory Specification

## Purpose
Define inventory UI coverage for products, item search, and purchases.

## Requirements

### Requirement: Product and Purchase Mutations
The protected inventory UI MUST support `POST /api/v1/products` and `POST /api/v1/purchases` with validation, duplicate-submit protection, success receipts, and backend error mapping.

#### Scenario: Inventory mutation
- GIVEN an authenticated operator submits valid product or purchase data
- WHEN the backend accepts the request
- THEN the user sees a success result and the form resets or advances safely

#### Scenario: Inventory mutation failure
- GIVEN validation/business/network failure occurs
- WHEN the response is handled
- THEN field/form errors are shown and duplicate submissions remain prevented

### Requirement: Item Search
The UI MUST support `GET /api/v1/items/search?term=...` for SKU/alias/item lookup and SHOULD debounce input through a server-mediated boundary.

#### Scenario: Search states
- GIVEN an authenticated operator searches items
- WHEN results are empty, loading, successful, or failed
- THEN the picker shows the matching loading/empty/result/error state
