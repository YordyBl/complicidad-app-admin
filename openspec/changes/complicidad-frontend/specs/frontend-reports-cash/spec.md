# Frontend Reports and Cash Specification

## Purpose
Define protected financial reports and manual cash closing behavior.

## Requirements

### Requirement: Reports Dashboard
The protected reports UI MUST cover all discovered `GET /api/v1/reports/*` endpoints, including liquidity, stock, sales, COGS, profit, reinvestment, operating capital, stock by product, and lots.

#### Scenario: Report rendering
- GIVEN an authenticated user opens reports
- WHEN report endpoints return data, empty data, or failures
- THEN cards/tables show ARS currency, loading/empty/error states, and no public caching of sensitive financial data

### Requirement: Manual Cash Closing
The protected cash UI MUST support `POST /api/v1/cash/closings` with confirmation, notes where supported, duplicate-submit protection, and success/error feedback.

#### Scenario: Cash closing submitted
- GIVEN an authenticated manager confirms a manual cash closing
- WHEN the backend accepts or rejects it
- THEN the UI shows a success receipt or a user-safe error without resubmitting automatically
