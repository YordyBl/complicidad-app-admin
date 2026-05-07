# Frontend Foundation Specification

## Purpose
Define safe Next.js defaults, Docker/API environment strategy, backend CORS expectations, and shared UI state conventions.

## Requirements

### Requirement: Scaffold, Type Safety, and Server-first Architecture
The frontend MUST use Complicidad branding, MUST NOT ship active v0/demo UI, MUST NOT suppress type/build errors, and MUST use Server Components by default with client islands only for required interactivity.

#### Scenario: Safe scaffold verification
- GIVEN the app config, metadata, imports, and route tree are reviewed
- WHEN frontend verification runs
- THEN Complicidad branding is active, demo UI is removed/quarantined, type/build errors fail verification, and public/protected shells are server-rendered

### Requirement: API Environment, Docker, and CORS
The frontend MUST distinguish server API base URLs from browser origins. Docker integration MUST use backend service DNS for server calls and backend CORS MUST allow browser-visible frontend origins through environment-driven configuration.

#### Scenario: Compose integration
- GIVEN frontend and backend run in Docker compose
- WHEN a server-mediated API request executes
- THEN it uses internal backend service DNS
- AND backend CORS still permits configured frontend browser origins for allowed direct browser calls/preflights

#### Scenario: Production integration
- GIVEN production deployment configuration is reviewed
- WHEN URLs, origins, secrets, and Docker context are evaluated
- THEN values come from environment variables, the runtime image is production-oriented, and secrets/build artifacts are excluded from context

### Requirement: Shared UI States and Accessibility
All resource screens MUST expose loading, empty, success, and error states appropriate to their endpoint group, and visual tokens MUST meet accessible contrast.

#### Scenario: State coverage
- GIVEN any screen backed by backend data or mutation
- WHEN loading, empty, success, validation error, network error, and unexpected error states occur
- THEN the user sees actionable, accessible feedback without leaking backend internals
