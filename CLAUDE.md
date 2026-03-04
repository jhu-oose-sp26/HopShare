# HopShare Claude Context

## Project
- Monorepo with `backend/` (Node + Express + MongoDB) and `frontend/` (React + Vite + TypeScript).
- Goal: campus ridesharing coordination platform.

## Working Preferences
- Keep changes minimal and localized.
- Prefer root-cause fixes over temporary patches.
- Do not modify secrets in `backend/.env`.

## Common Commands
- Install deps:
  - `cd backend && pnpm install`
  - `cd frontend && pnpm install`
- Run backend:
  - `cd backend && pnpm start`
- Run frontend (dev):
  - `cd frontend && pnpm dev`
- Frontend tests:
  - `cd frontend && pnpm test`
- Backend seed:
  - `cd backend && pnpm seed`

## Code Map
- Backend entry: `backend/server.js`
- Frontend app: `frontend/src/`
- Docs: `docs/`

## Safety Checks Before Finishing
- If backend changed: start backend once and check for startup errors.
- If frontend changed: run `pnpm build` in `frontend` when possible.
- Summarize changed files and exact verification steps.
