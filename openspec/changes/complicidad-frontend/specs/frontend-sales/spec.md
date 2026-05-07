# Frontend Sales Specification

## Purpose
Define sales, cancellation, and return frontend behavior.

## Requirements

### Requirement: Sale Creation
The protected sales UI MUST support `POST /api/v1/sales` using customer selection and item search, with transactional duplicate-submit protection and receipt-style success output.

#### Scenario: Sale created
- GIVEN an authenticated operator selects a customer and sale items
- WHEN the backend creates the sale
- THEN the UI shows the sale result and prevents accidental resubmission

### Requirement: Sale Cancellation and Return Actions
The UI MUST support `POST /api/v1/sales/:id/cancel` and `POST /api/v1/sales/:id/return` with confirmation and clear reversal outcomes.

#### Scenario: Reversal action
- GIVEN an authenticated operator enters a sale id and confirms cancel or return
- WHEN the backend accepts the action
- THEN the UI shows a success receipt and records that sale list/read endpoints are unavailable for richer UX
