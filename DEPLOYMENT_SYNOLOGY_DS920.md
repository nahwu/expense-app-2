# Synology DS920+ Deployment Notes

## Target

Run the full app on DS920+ with:
- `web` container (Next.js app).
- `db` container (PostgreSQL).
- Synology Reverse Proxy for HTTPS.

## Prerequisites

- DSM 7.2+ with Container Manager.
- Domain name pointing to your WAN IP (or a tunnel setup).
- HTTPS certificate configured in DSM.
- Router port forwarding for `443` (and `80` only if needed for certificate challenges).

## Suggested Directory Layout on NAS

- `/volume1/docker/expense-app/web`
- `/volume1/docker/expense-app/db`
- `/volume1/docker/expense-app/backups`

## Example Compose

```yaml
services:
  db:
    image: postgres:18.0
    container_name: expense-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: expense_app
      POSTGRES_USER: expense_user
      POSTGRES_PASSWORD: change_me
    volumes:
      - /volume1/docker/expense-app/db:/var/lib/postgresql/data
      - ./db/init:/docker-entrypoint-initdb.d:ro
    networks:
      - expense_net

  web:
    image: node:24-alpine
    container_name: expense-web
    restart: unless-stopped
    working_dir: /app
    command: sh -c "npm ci && npm run build && npm run start"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://expense_user:change_me@db:5432/expense_app
      AUTH_SECRET: change_me
      AUTH_URL: https://your-domain.example
    volumes:
      - /volume1/docker/expense-app/web:/app
    depends_on:
      - db
    networks:
      - expense_net

networks:
  expense_net:
    driver: bridge
```

## Reverse Proxy (DSM)

- Source: `https://your-domain.example`.
- Destination: `http://expense-web:3000` (or NAS local host port mapping).
- Enable WebSocket support.
- Force HTTPS redirect.

## Backup Strategy

- Nightly `pg_dump` to `/volume1/docker/expense-app/backups`.
- Keep at least 30 daily backups.
- Replicate backups off-device weekly.
- Test restore quarterly.

## Update Strategy

- Update one dependency group at a time.
- Run database migration before app rollout.
- Keep previous image tag for fast rollback.

## Security Checklist

- Strong unique DB password.
- Rotate `AUTH_SECRET` carefully with planned user session reset.
- Do not expose PostgreSQL directly to WAN.
- Keep DSM, Container Manager, and packages patched.
