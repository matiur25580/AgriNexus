# AgriNexus

**Agricultural Intelligence & Food Supply Chain Platform**

AgriNexus is an enterprise-oriented, multi-tenant platform connecting farm operations, crop lifecycle management, field intelligence, harvest planning, produce quality, and farm-to-market traceability.

> Product direction: turn disconnected agricultural workflows into one auditable operational system. AgriNexus is an independent software project; it does not claim official integration with government agricultural registries or scientifically validated agronomic predictions.

## Product domains

- Organization and membership management
- Farm, plot, and crop lifecycle management
- Field assignments and inspection records
- Environmental observations and weather integrations
- Harvest planning and yield estimates
- Produce lots, quality checks, and chain-of-custody events
- Buyer collaboration and order workflows
- Inventory, equipment, and operating-cost visibility
- Explainable operational risk indicators and analytics

## Architecture

This repository is a TypeScript MERN monorepo:

- `apps/web` — React, Vite, TypeScript frontend
- `apps/api` — Node.js, Express, TypeScript REST API
- `packages/shared` — shared contracts and validation primitives (introduced incrementally)

MongoDB is the system of record. Redis, object storage, weather providers, and AI services are optional supporting integrations, not replacements for the MERN core.

## Getting started

Prerequisites: Node.js 22+, npm 10+, and MongoDB 7+ (local Docker or Atlas).

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
docker compose up -d mongodb
npm run dev
```

The API health endpoint is available at `http://localhost:4000/api/v1/health`; the web app runs at `http://localhost:5173`.

## Development principles

- Tenant isolation is enforced server-side on every tenant-owned query.
- Authorization is deny-by-default and permission-based.
- Forecasts and risk scores expose their inputs and limitations.
- Traceability is modeled as append-only events, not editable labels.
- External integrations are isolated behind adapters.
- Every milestone adds tests, documentation, and operational safeguards.

## Project status

Milestone 1 establishes the monorepo foundation, local development workflow, API health endpoint, and initial React application shell. Domain capabilities are delivered in subsequent milestones.

## License

This project is currently source-available for portfolio and demonstration purposes. Add a formal license before accepting external contributions or redistributing it.
