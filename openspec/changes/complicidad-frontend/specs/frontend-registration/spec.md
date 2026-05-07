# Frontend Registration Specification

## Purpose
Define public account creation against `POST /api/v1/register`.

## Requirements

### Requirement: Registration Form and Lifecycle
The registration screen MUST collect backend-required fields, validate them before submission, prevent duplicate submits, and show idle/submitting/success/error states.

#### Scenario: Valid registration
- GIVEN a visitor enters valid required data
- WHEN registration is submitted
- THEN one `POST /api/v1/register` request is made
- AND `201` produces success guidance

#### Scenario: Invalid registration
- GIVEN fields are missing, malformed, or rejected by the backend
- WHEN the visitor submits or the backend returns `400`/`409`
- THEN invalid client data blocks the request, backend validation maps to field/form errors, and duplicate-account messaging is user-safe

### Requirement: Registration Transport and CORS
Registration SHOULD be server-mediated; direct browser fallback MUST work only from configured CORS origins and MUST NOT assume credentialed CORS.

#### Scenario: Server-mediated registration
- GIVEN the registration form submits valid data
- WHEN the request is sent
- THEN backend base URL resolution happens server-side and browser API exposure is minimized

#### Scenario: Direct browser fallback
- GIVEN documented constraints require direct browser registration
- WHEN preflight or submit reaches the backend
- THEN configured origins, methods, and headers are allowed without requiring cookies
