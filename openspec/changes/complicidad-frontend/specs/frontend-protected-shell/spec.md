# Frontend Protected Shell Specification

## Purpose
Define private navigation, authorization UX, and backend security gap visibility.

## Requirements

### Requirement: Protected Operational Shell
Operational routes for dashboard, inventory, sales, customers, reports, and cash MUST require a frontend session before rendering private data or mutation forms.

#### Scenario: Unauthenticated access
- GIVEN no valid frontend session exists
- WHEN a user opens a protected route
- THEN private UI is not rendered and the user is sent to login or shown an auth-required state

### Requirement: Security Gap Disclosure
Frontend protection MUST be treated as UX only because backend auth/RBAC enforcement is currently absent; the spec MUST track this as a backend gap.

#### Scenario: Backend gap review
- GIVEN protected frontend screens are verified
- WHEN security assumptions are documented
- THEN missing backend auth/RBAC is recorded as a risk and not claimed as solved by the frontend
