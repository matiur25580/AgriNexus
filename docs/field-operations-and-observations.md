# Field operations and observation log

The field operations API is mounted at `/api/v1/field`. Every route requires an authenticated user and a verified active organization membership. The organization context is resolved from the membership associated with the `X-Organization-Id` request header; client-supplied organization IDs in request bodies are not accepted.

## Field task management

- Tasks belong to an active farm and active plot in the same organization.
- Optional crop-season references must belong to the same farm/plot and be planned or active.
- Tasks support irrigation, soil sampling, crop scouting, fertilization, weeding, harvest preparation and equipment checks.
- Active managers and field agents can be assigned; viewers cannot receive tasks.
- Task windows require a due date on or after the scheduled date.
- Each task receives a tenant-unique human-readable code and can include required checklist items.
- State transitions are validated: planned → assigned/cancelled; assigned → in_progress/cancelled; in_progress → blocked/completed/cancelled; blocked → in_progress/cancelled.
- Completion requires all required checklist items to be complete and a completion note.
- Actor-attributed task events preserve assignment, state and checklist changes.

## Field observations

- Observations are recorded against an active farm and plot, with an optional crop-season reference.
- Supported observation types: crop health, soil moisture, irrigation, weather, growth stage and soil sample.
- Records include observed time, summary, notes, optional numeric measurement/unit, optional coordinate pair and recorder identity.
- Future observations and incomplete coordinate pairs are rejected.
- Observation records are append-oriented; this API does not provide an edit/delete endpoint.

## Endpoints

| Method | Endpoint | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/field/operations` | `field:read` | Filtered and paginated task queue |
| POST | `/field/operations` | `field:write` | Create a field task |
| GET | `/field/operations/:operationId` | `field:read` | Task detail |
| GET | `/field/operations/:operationId/events` | `field:read` | Task event history |
| PATCH | `/field/operations/:operationId/assign` | `field:write` | Assign an active manager/field agent |
| PATCH | `/field/operations/:operationId/status` | `field:write` | Apply an allowed task transition |
| PATCH | `/field/operations/:operationId/checklist/:itemId` | `field:write` | Update an in-progress task checklist |
| GET | `/field/observations` | `field:read` | Query observations by farm, plot, season, type and time range |
| POST | `/field/observations` | `field:write` | Record a field observation |

## Query controls

Task lists support farm, plot, crop season, status, assigned user, page and limit filters. Observation lists support farm, plot, crop season, type, from/to, page and limit filters. Page sizes are capped at 100.

## Boundaries and next hardening

- Field observations are records of user-entered observations, not validated agronomic recommendations or scientific diagnoses.
- No pesticide/spray instructions, fertilizer dosage recommendations, automated irrigation control, weather-provider integration, satellite imagery or AI crop-health score is included.
- Task and observation records are tenant-scoped; event writes are append-oriented but not transactionally coupled to task updates. A transactional outbox and database-backed concurrency tests are recommended for production.
- Attachments, offline synchronization, push notifications, equipment telemetry and harvest execution are future milestones.
