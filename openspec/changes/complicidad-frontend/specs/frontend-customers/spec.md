# Frontend Customers Specification

## Purpose
Define customer list, create, detail, edit, and history screens.

## Requirements

### Requirement: Customer CRUD Screens
The protected customer UI MUST support `GET/POST /api/v1/customers` and `GET/PUT /api/v1/customers/:id` with validation, loading, empty, success, not-found, and error states.

#### Scenario: Customer list and mutation
- GIVEN an authenticated user opens customers or submits a customer form
- WHEN list/create/detail/update succeeds
- THEN customer data is shown or updated with clear success feedback

#### Scenario: Customer error states
- GIVEN the backend returns empty results, `400`, `404`, or network failure
- WHEN the screen handles the response
- THEN the matching empty, field/form, not-found, or retry-safe error state appears

### Requirement: Customer History
The detail screen MUST expose `GET /api/v1/customers/:id/history` as a protected history view.

#### Scenario: History view
- GIVEN a customer exists
- WHEN history is requested
- THEN purchases/history are shown or an empty state explains there is no history
