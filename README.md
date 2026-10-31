# Subscription Management System

Brightloop subscription operations workspace built with React, TypeScript, Express, MongoDB, and Mongoose. It includes a live dashboard, customer, subscription, invoice, payment, product, and plan workflows.

## Quick start

```bash
npm install
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:5000
- API health: http://localhost:5000/api/health

`npm run dev` starts both processes. Keep that terminal open; closing the server process causes browser errors such as `ERR_CONNECTION_REFUSED`. The Vite development proxy forwards `/api` requests to port 5000. For a separately hosted frontend, set `VITE_API_URL` in `apps/web/.env` to the deployed API base URL.

The API uses MongoDB Atlas through Mongoose. Copy `apps/server/.env.example` to `apps/server/.env`, set `MONGO_URI` to your Atlas connection string, and run `npm run seed -w apps/server` to create the initial admin account and catalog data.

Default seeded login:

- Email: `admin@brightloop.local`
- Password: `Admin!12345`

Change the seed password with `SEED_ADMIN_PASSWORD` before using this outside local development.

## Project structure

- `apps/web` - React/Vite dashboard and operational screens
- `apps/server` - Express API and business rules

## Validation

```bash
npm test
npm run build
```
