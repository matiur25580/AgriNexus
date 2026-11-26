# Identity and organization tenancy

## Authentication endpoints

All endpoints are prefixed by `/api/v1`.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register` | Create a user, initial organization, owner membership, and session |
| POST | `/auth/login` | Verify credentials and return active organization memberships |
| POST | `/auth/refresh` | Rotate the refresh session and issue a short-lived access token |
| POST | `/auth/logout` | Revoke the presented refresh session and clear its cookie |
| GET | `/auth/me` | Return the authenticated profile and active organizations |
| GET | `/organizations` | List organizations where the caller has active membership |
| POST | `/organizations` | Create an organization and become its owner |
| GET | `/organizations/context` | Resolve the selected organization context |

## Session security

- Passwords are hashed with bcrypt (12 rounds); password hashes are excluded from normal user queries.
- Access tokens are signed with HS256 and default to a 15-minute lifetime.
- Refresh tokens are high-entropy opaque values. Only SHA-256 hashes are persisted.
- Refresh tokens are delivered in an HttpOnly, SameSite=Strict cookie scoped to `/api/v1/auth`; production cookies use Secure.
- Refresh rotation atomically claims the old session before creating its replacement. Logout revokes the presented session.
- Auth endpoints have a dedicated rate limit. Production deployments must set a unique random `ACCESS_TOKEN_SECRET` of at least 32 characters.

## Tenant isolation contract

Authenticated tenant endpoints must apply both `requireAuth` and `requireOrganization`. The caller selects a context using `X-Organization-Id`; the API resolves that ID against an active membership belonging to the authenticated user. Never use a client-provided organization ID as authorization by itself. Every tenant-owned repository query must include the resolved `req.organization.id` scope.

Roles currently defined: `owner`, `admin`, `manager`, `field_agent`, and `viewer`. Fine-grained permission policies and invitations are planned for a subsequent identity milestone.

## Local configuration

Copy `apps/api/.env.example` into the API environment and replace `ACCESS_TOKEN_SECRET` before deployment. MongoDB must be reachable before starting the API.

## Operational note

Registration creates the user, organization, membership, and refresh session as separate writes. For production rollout, enable MongoDB replica-set transactions and wrap this workflow in a transaction before exposing public self-service registration at scale. Email verification, password reset, MFA, session-device management, and organization invitations are not included in this milestone.
