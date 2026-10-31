# Subscription Management System

Brightloop subscription operations workspace built with React, TypeScript, Express, and a persistent local repository. It includes a live dashboard, customer, subscription, invoice, payment, product, and plan workflows.

## Quick start

```bash
npm install
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:4000
- API health: http://localhost:4000/api/health

The API persists local changes to `apps/server/data.json`. For production deployment, replace the repository adapter in `apps/server/src/store.ts` with PostgreSQL/Prisma and configure secure authentication.

## Project structure

- `apps/web` - React/Vite dashboard and operational screens
- `apps/server` - Express API and business rules

## Validation

```bash
npm test
npm run build
```
