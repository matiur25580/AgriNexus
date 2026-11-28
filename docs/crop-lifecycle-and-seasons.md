# Crop Lifecycle and Season Management

This milestone introduces crop seasons and an append-only crop-stage timeline.

## Data model

- **Crop season** associates one crop and variety with a tenant-owned farm/plot, season name, planting/start date, expected harvest date, lifecycle status, yield targets, optional actual harvest weight, and notes.
- **Crop stage event** records a dated operational milestone (land preparation, sowing, transplanting, germination, vegetative growth, flowering, fruiting, harvesting, or post-harvest). Events are append-only through the API; corrections should be represented by a later event rather than editing historical entries.

All records carry organization ownership. The API verifies that the selected active plot belongs to the selected farm and the authenticated organization.

## API

All routes are prefixed with `/api/v1/crop-seasons` and require bearer authentication plus a valid `X-Organization-Id`.

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/` | plots:read | Paginated seasons; optional farmId, plotId, status filters |
| POST | `/` | plots:write | Create a crop season |
| GET | `/:seasonId` | plots:read | Read a season |
| PATCH | `/:seasonId` | plots:write | Update planning/status/yield fields |
| GET | `/:seasonId/events` | plots:read | Read chronological stage timeline |
| POST | `/:seasonId/events` | plots:write | Append a stage event |

Pagination is bounded to 100 records. Expected harvest date must follow the season start date. Stage events cannot predate the season and must be appended with strictly increasing timestamps. No event update/delete endpoint is exposed, preserving an auditable history.

## Example

```http
POST /api/v1/crop-seasons
Authorization: Bearer <access-token>
X-Organization-Id: <organization-id>
Content-Type: application/json

{
  "farmId": "<farm-id>",
  "plotId": "<plot-id>",
  "seasonName": "Kharif 2027",
  "cropName": "Paddy",
  "variety": "Example variety",
  "startDate": "2027-06-15",
  "expectedHarvestDate": "2027-11-20",
  "targetYieldKgPerHectare": 4200,
  "targetTotalYieldKg": 8400
}
```

```http
POST /api/v1/crop-seasons/<season-id>/events
Authorization: Bearer <access-token>
X-Organization-Id: <organization-id>
Content-Type: application/json

{
  "stage": "sowing",
  "occurredAt": "2027-06-18T08:00:00.000Z",
  "summary": "Direct seeding completed on the north section"
}
```

Yield targets and actual harvest values are operator-entered planning/recordkeeping fields. This module does not generate agronomic advice or claim that yield estimates are scientifically validated.
