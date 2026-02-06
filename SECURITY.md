# Security Baseline

## Objectives

- Protect financial data over the public Internet.
- Ensure each user can only access their own records.
- Keep operations manageable for a self-hosted DS920+ setup.

## Authentication

- Use Auth.js with secure server-side sessions.
- Enforce strong password policy.
- Use Argon2id for password hashing if credentials are stored locally.
- Require email verification for new accounts.
- Add optional MFA in post-MVP phase.

## Authorization

- Every data table uses `user_id`.
- Every query is filtered by authenticated user.
- Never trust client-supplied ownership fields.
- For extra protection, add PostgreSQL RLS policies tied to session context.

## Transport Security

- HTTPS only.
- Redirect all HTTP to HTTPS.
- Enable HSTS once certificate/hostname setup is stable.
- Use modern TLS defaults from Synology Reverse Proxy.

## DS920+ Exposure Model

- Publicly expose only reverse proxy ports (`443`, optionally `80` for ACME).
- Keep PostgreSQL port private to Docker network.
- Disable direct DSM exposure from WAN when possible.
- Use IP block/auto-block and firewall rules in DSM.

## Secrets Management

- Store secrets in environment variables, not in git.
- Separate dev and prod secrets.
- Rotate `AUTH_SECRET`, DB password, and API secrets periodically.

## Backups

- Daily PostgreSQL logical backup (`pg_dump`) to NAS volume.
- Regular encrypted off-device backup (second NAS/cloud bucket).
- Quarterly restore drill to verify backup integrity.

## Monitoring and Audit

- Log authentication events (login success/failure, password reset, lockout).
- Log CRUD mutations with record ID and user ID.
- Alert on repeated auth failures and unusual request rates.

## Secure Coding Rules

- Validate all inputs with Zod.
- Use parameterized DB queries only.
- Escape/encode user-generated text in UI.
- Protect mutating routes against CSRF.
- Add rate limits for login and import endpoints.
