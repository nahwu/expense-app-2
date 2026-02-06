# API Contract

## General Rules

- Base path: `/api`.
- Authentication required for all endpoints except auth callbacks and signup.
- User identity comes from server session.
- Never accept `user_id` from client payload.
- All write payloads validated with Zod.

## Auth

`POST /api/auth/signup`
- Body:
  - `email`
  - `password`
- Creates user account with hashed password.
- Returns `409` if email already exists.

## Expenses

`GET /api/expenses`
- Query params: `from`, `to`, `categoryId`, `payee`, `page`, `pageSize`.
- Returns paged expense list for current user.

`POST /api/expenses`
- Body:
  - `amountCents` (integer, > 0)
  - `categoryId` (uuid)
  - `spentOn` (ISO date)
  - `payee` (string)
  - `note` (optional string)
- Creates one expense row for current user.

`PATCH /api/expenses/:id`
- Partial updates for editable fields.

`DELETE /api/expenses/:id`
- Deletes one expense owned by current user.

## Income (Optional)

`GET /api/incomes`
- Query params: `from`, `to`, `source`, `page`, `pageSize`.

`POST /api/incomes`
- Body:
  - `amountCents`
  - `earnedOn`
  - `source`
  - `note` (optional)

`PATCH /api/incomes/:id`

`DELETE /api/incomes/:id`

## Net Worth Snapshots (Optional)

`GET /api/networth-snapshots`
- Query params: `from`, `to`, `period` (`monthly` or `yearly`).

`POST /api/networth-snapshots`
- Body:
  - `snapshotOn`
  - `totalAssetsCents`
  - `totalLiabilitiesCents`
  - `note` (optional)

`PATCH /api/networth-snapshots/:id`

`DELETE /api/networth-snapshots/:id`

## Categories

`GET /api/categories`
- Includes system and user categories.

`POST /api/categories`
- Body:
  - `name`

`PATCH /api/categories/:id`

`DELETE /api/categories/:id`
- Block delete if referenced by expenses.

## Reports

`GET /api/reports/spending-summary`
- Query params: `year`, optional `month`.
- Returns totals for period.

`GET /api/reports/spending-by-category`
- Query params: `from`, `to`.
- Returns category buckets and totals.

`GET /api/reports/cashflow`
- Query params: `from`, `to`, `groupBy` (`month` or `year`).
- Returns income, expense, and net cashflow.

`GET /api/reports/networth-trend`
- Query params: `from`, `to`, `groupBy` (`month` or `year`).
- Returns snapshot trend and computed net worth.

## Future Import/Export

`POST /api/import/csv`
- Multipart file upload.
- Validates schema and stores import report.

`GET /api/export/csv?entity=expenses&from=...&to=...`
- Streams user-scoped CSV.

## Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "amountCents must be greater than 0"
  }
}
```

## Security Requirements

- Return `404` for IDs not owned by current user.
- Rate-limit auth and mutation endpoints.
- Log security-relevant events without storing secrets.
