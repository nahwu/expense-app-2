# Synology DS920+ Deployment Guide

## Overview

Target deployment:
- `web` container (Next.js app).
- `db` container (PostgreSQL 18).
- DSM Reverse Proxy terminates HTTPS and forwards traffic to app.

This repo contains:
- `docker-compose.synology.yml` for DSM Project UI deployment (no `${...}` interpolation).
- `docker-compose.yml` for local/dev CLI usage.
- `Dockerfile` for app image build.

## Prerequisites

- DSM 7.2+ with Container Manager installed.
- Domain name (example: `nahwu.synology.me`) pointing to your public IP.
- Router/NAT forwarding for:
  - `3003` -> NAS
  - optional `80` -> NAS (certificate challenge/redirect)
- A valid TLS certificate in DSM (`Control Panel` -> `Security` -> `Certificate`).

## Step 1: Prepare NAS folders

Create persistent folders on the NAS:
- `/volume1/docker/expense-app/app`
- `/volume1/docker/expense-app/db`
- `/volume1/docker/expense-app/backups`

## Step 2: Copy project to NAS

Copy this repository into:
- `/volume1/docker/expense-app/app`

The compose command should run from this folder on NAS.

## Step 3: Create production env file

In `/volume1/docker/expense-app/app`, create `.env.prod`:

```env
NODE_ENV=production
PORT=3000

POSTGRES_DB=expense_app
POSTGRES_USER=expense_user
POSTGRES_PASSWORD=replace_with_strong_password

# Containerized web app uses Docker network hostname "db"
DATABASE_URL=postgresql://expense_user:replace_with_strong_password@db:5432/expense_app

NEXTAUTH_URL=https://nahwu.synology.me:3003
NEXTAUTH_URL_INTERNAL=http://127.0.0.1:3000
AUTH_TRUST_HOST=true
NEXTAUTH_SECRET=replace_with_long_random_secret
```

Notes:
- `NEXTAUTH_URL` must exactly match the public HTTPS URL.
  If you use a non-default HTTPS port, include it (for example `:3003`).
- `NEXTAUTH_URL_INTERNAL` should stay `http://127.0.0.1:3000` for in-container server-side auth calls.
- `AUTH_TRUST_HOST=true` allows Auth.js to trust reverse-proxy forwarded host/protocol headers.
- Use a long random `NEXTAUTH_SECRET`.
- Keep `.env.prod` out of git.
- `DATABASE_URL` must use host `db` (not `localhost`) because the app runs in a container.

## Step 4: Start services

DSM Project UI method:

1. Open `Container Manager` -> `Project` -> `Create`.
2. Set project folder:
   - `/volume1/docker/expense-app/app`
3. Use compose file:
   - `docker-compose.synology.yml`
4. Ensure env file exists as:
   - `/volume1/docker/expense-app/app/.env.prod`
5. Deploy the project.


## Step 5: Configure DSM Reverse Proxy

DSM path: `Control Panel` -> `Login Portal` -> `Advanced` -> `Reverse Proxy`.

Create rule:
- Source:
  - Protocol: `HTTPS`
  - Hostname: `nahwu.synology.me`
  - Port: `3003`
- Destination:
  - Protocol: `HTTP`
  - Hostname: `127.0.0.1`
  - Port: `3002`

Enable WebSocket support.

Certificate:
- Assign your certificate to `nahwu.synology.me`.

## Step 6: First-time app setup

- Open `https://nahwu.synology.me:3003/signup`
- Create first account.
- Sign in and verify dashboard load.


## Backups (minimum)

- Nightly database dump:
  - `pg_dump -U expense_user expense_app > /volume1/docker/expense-app/backups/expense_app_YYYYMMDD.sql`
- Keep at least 30 daily backups.
- Test restore periodically on a non-production instance.

## Security checklist

- Do not publish PostgreSQL to WAN.
- Keep DSM and Container Manager updated.
- Use strong unique DB password and `NEXTAUTH_SECRET`.
- Enable DSM firewall and auto-block.
- Expose only required inbound ports (for this setup: `3003`, optional `80`).

## Troubleshooting

DSM says postgres variables are not set:
- Use `docker-compose.synology.yml` for DSM Project UI.
- Ensure file is named exactly `.env.prod` in the project folder.
- `docker-compose.synology.yml` does not use `${POSTGRES_*}` interpolation.
  If DSM still shows `${POSTGRES_*}` errors, it is using an old compose file/project.
  Delete the old DSM Project and recreate it from `docker-compose.synology.yml`.
- Redeploy the project in Container Manager.

`/api/auth/signup` returns `503 DATABASE_UNAVAILABLE`:
- Check containers:
  - `docker compose ps`
- Inspect db logs:
  - `docker compose logs --tail=200 db`
- Confirm public app is up:
  - `curl http://127.0.0.1:3000/api/health`
- Confirm `.env.prod` values (`POSTGRES_*`, `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`) are correct.
- Verify app container sees Docker DNS host `db`:
  - `docker compose exec web sh -lc 'echo "$DATABASE_URL"'`
  - The URL should look like `postgresql://...@db:5432/expense_app`.

Registration redirects to `/api/auth/signin?csrf=true` and browser shows `ERR_SSL_PROTOCOL_ERROR`:
- Confirm protocol consistency:
  - If your public URL is HTTPS on `3003`, `NEXTAUTH_URL` must be `https://nahwu.synology.me:3003`.
  - If your public URL is HTTP on `3003`, `NEXTAUTH_URL` must be `http://nahwu.synology.me:3003`.
- Keep `NEXTAUTH_URL_INTERNAL=http://127.0.0.1:3000`.
- In HTTP mode, remove `AUTH_TRUST_HOST` (or set it to `false`) unless your proxy always sends `x-forwarded-proto=http`.
- Redeploy after env changes, then verify:
  - `docker compose exec web sh -lc 'env | grep -E \"NEXTAUTH_URL|NEXTAUTH_URL_INTERNAL|AUTH_TRUST_HOST\"'`

No backend logs when testing from the internet:
- Confirm DSM Reverse Proxy `Source` matches the public URL exactly:
  - `https://nahwu.synology.me:3003` -> source protocol `HTTPS`, source port `3003`.
- Confirm `NEXTAUTH_URL` in `.env.prod` exactly matches that public URL.
- Confirm reverse proxy destination remains `http://127.0.0.1:3002`.
