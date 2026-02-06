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
  - `443` -> NAS
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

In `/volume1/docker/expense-app/app`, create `.env`:

```env
NODE_ENV=production
PORT=3000

POSTGRES_DB=expense_app
POSTGRES_USER=expense_user
POSTGRES_PASSWORD=replace_with_strong_password

# Containerized web app uses Docker network hostname "db"
DATABASE_URL=postgresql://expense_user:replace_with_strong_password@db:5432/expense_app

NEXTAUTH_URL=https://nahwu.synology.me
NEXTAUTH_SECRET=replace_with_long_random_secret
```

Notes:
- `NEXTAUTH_URL` must exactly match the public HTTPS URL.
- Use a long random `NEXTAUTH_SECRET`.
- Keep `.env` out of git.
- If you maintain `.env.prod`, rename it to `.env` before DSM UI deploy

Recommended:
- Keep template values in `.env.prod.example`.
- Keep actual secrets in `.env.prod` (ignored by git).

## Step 4: Start services

DSM Project UI method:

1. Open `Container Manager` -> `Project` -> `Create`.
2. Set project folder:
   - `/volume1/docker/expense-app/app`
3. Use compose file:
   - `docker-compose.synology.yml`
4. Ensure env file exists as:
   - `/volume1/docker/expense-app/app/.env`
5. Deploy the project.


## Step 5: Configure DSM Reverse Proxy

DSM path: `Control Panel` -> `Login Portal` -> `Advanced` -> `Reverse Proxy`.

Create rule:
- Source:
  - Protocol: `HTTPS`
  - Hostname: `http://nahwu.synology.me/`
  - Port: `3003`
- Destination:
  - Protocol: `HTTP`
  - Hostname: `127.0.0.1`
  - Port: `3002`

Enable WebSocket support.

Certificate:
- Assign your certificate to `http://nahwu.synology.me/`.

## Step 6: First-time app setup

- Open `https://http://nahwu.synology.me/signup`
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
- Expose only required inbound ports (typically `443`, optional `80`).

## Troubleshooting

DSM says postgres variables are not set:
- Use `docker-compose.synology.yml` for DSM Project UI.
- Ensure file is named exactly `.env` in project folder (not only `.env.prod`).
- If you keep `.env.prod`, copy it first:
  - `cp .env.prod .env`
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
- Confirm `.env` values (`POSTGRES_*`, `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`) are correct.
