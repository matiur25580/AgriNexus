# Architecture Overview

## System boundaries

AgriNexus starts as a modular monolith. The API is divided by business capability and keeps infrastructure concerns behind adapters. This is intentionally simpler to operate than premature microservices while preserving clear module boundaries.

## Runtime components

- **Web:** React + TypeScript SPA, served independently from the API.
- **API:** Express application exposing versioned REST endpoints.
- **Database:** MongoDB as the authoritative store for tenant-owned operational records.
- **Realtime:** Socket.IO will deliver domain events to authorized organization members.
- **Cache and jobs:** Redis will be introduced when workflows require distributed caching or background processing.
- **Object storage:** S3-compatible storage for inspection evidence and documents.

## Tenant isolation

Every tenant-owned document will carry an immutable organization identifier. Authentication establishes the active organization context; authorization checks membership and permissions; repository methods scope reads and writes by that organization. Client-provided organization IDs are never trusted as proof of access.

## Domain boundaries

1. Identity and organizations
2. Farms and plots
3. Crop cycles and cultivation activities
4. Field operations and inspections
5. Environmental observations
6. Harvest and yield estimates
7. Produce lots and traceability events
8. Marketplace and orders
9. Inventory and resources
10. Reporting and intelligence

## Traceability design principle

A produce lot will reference its source crop cycle and farm. Processing, quality, custody, and shipment actions will be represented as append-only events. Corrections should create compensating events with actor, timestamp, reason, and evidence rather than silently rewriting history.

## Reliability and security

- Validate all external input at the API boundary.
- Use structured logs with sensitive-field redaction.
- Keep secrets in environment configuration, never in source control.
- Add tenant-isolation and authorization tests alongside each domain module.
- Treat external weather and AI providers as unreliable dependencies with timeouts and graceful degradation.
- Label seeded demonstration values clearly; do not present them as live observations or validated forecasts.
