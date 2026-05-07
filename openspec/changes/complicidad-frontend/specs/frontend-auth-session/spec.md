# Frontend Auth Session Specification

## Purpose
Define login and protected session behavior for backend JWT auth.

## Requirements

### Requirement: Login and Session Bootstrap
The login screen MUST authenticate with `POST /api/v1/login`, map `400`/`401`/network errors safely, and establish a session usable by server-mediated protected API calls.

#### Scenario: Successful login
- GIVEN valid credentials
- WHEN login returns a JWT
- THEN the session is established and protected navigation becomes available

#### Scenario: Failed login
- GIVEN invalid credentials or unavailable backend
- WHEN login fails
- THEN no protected session is created and user-safe feedback is shown

### Requirement: Session Boundary
The frontend MUST centralize token/session handling and MUST NOT scatter JWT access through arbitrary client components.

#### Scenario: Protected request authorization
- GIVEN a protected screen requests backend data
- WHEN the frontend calls the API
- THEN bearer authorization is injected through the shared session boundary
