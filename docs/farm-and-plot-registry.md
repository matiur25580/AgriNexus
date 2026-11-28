# Farm and Plot Registry

This milestone adds tenant-scoped farm and plot records to AgriNexus.

## Organization context

All endpoints require a valid bearer access token and an `X-Organization-Id` header. The organization middleware verifies an active membership before resolving the organization context. Every farm and plot lookup, update, and list query includes that resolved organization ID. A record belonging to another tenant is returned as not found.

## Role permissions

| Role | Read farms/plots | Create/update farms | Create/update plots |
|---|---:|---:|---:|
| owner | Yes | Yes | Yes |
| admin | Yes | Yes | Yes |
| manager | Yes | Yes | Yes |
| field_agent | Yes | No | Yes |
| viewer | Yes | No | No |

Permissions are enforced server-side. Hiding UI controls is not an authorization boundary.

## API

All paths are prefixed with `/api/v1`.

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/farms?page=1&limit=20` | farms:read | Paginated organization farms |
| POST | `/farms` | farms:write | Register a farm |
| GET | `/farms/:farmId` | farms:read | Read one farm |
| PATCH | `/farms/:farmId` | farms:write | Update farm details/status |
| GET | `/farms/:farmId/plots` | plots:read | List plots in a farm |
| POST | `/farms/:farmId/plots` | plots:write | Register a plot |
| GET | `/plots/:plotId` | plots:read | Read one plot |
| PATCH | `/plots/:plotId` | plots:write | Update plot details/status |

Farm codes are unique within an organization. Plot codes are unique within a farm and organization. Areas are stored in hectares. Location coordinates are validated as latitude/longitude ranges. Crop, soil, and irrigation fields are descriptive registry data; they are not agronomic recommendations.

## Operational safeguards

- MongoDB indexes enforce tenant-scoped code uniqueness.
- API queries always scope by the verified organization ID.
- Farm and plot IDs are validated before database access.
- Farm/plot payloads are validated with Zod; update operations run Mongoose validators.
- Pagination is bounded to 100 records per page.
- Deletion is intentionally not exposed: historical operational records may reference these entities. Use status transitions instead.

## Example requests

Register a farm (the bearer token and organization ID must belong to the same active membership):

```http
POST /api/v1/farms
Authorization: Bearer <access-token>
X-Organization-Id: <organization-id>
Content-Type: application/json

{
  "name": "North Field Farm",
  "code": "NORTH-01",
  "areaHectares": 12.5,
  "location": {
    "village": "Example Village",
    "district": "Example District",
    "state": "West Bengal",
    "country": "India"
  }
}
```

Register a plot within that farm:

```http
POST /api/v1/farms/<farm-id>/plots
Authorization: Bearer <access-token>
X-Organization-Id: <organization-id>
Content-Type: application/json

{
  "name": "Plot A",
  "code": "PLOT-A",
  "areaHectares": 2.25,
  "soilType": "alluvial",
  "irrigationType": "drip",
  "currentCrop": "Paddy"
}
```

The API tracks `allocatedAreaHectares` on each farm and uses a conditional MongoDB update when reserving or releasing plot area. This protects the farm-capacity invariant from concurrent plot creation and area increases. Keep writes routed through these API handlers; direct database writes bypass the invariant.
