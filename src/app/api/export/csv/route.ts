import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth-session";
import { query } from "@/lib/db";
import { jsonError, toCsv } from "@/lib/http";

const exportQuerySchema = z.object({
  entity: z.enum(["expenses", "incomes", "networth_snapshots"]),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required.");
  }

  const parsed = exportQuerySchema.safeParse({
    entity: request.nextUrl.searchParams.get("entity"),
    from: request.nextUrl.searchParams.get("from") ?? undefined,
    to: request.nextUrl.searchParams.get("to") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid export query parameters.");
  }

  const { entity, from, to } = parsed.data;
  const values: unknown[] = [userId];
  let dateColumn = "";
  let sql = "";

  if (entity === "expenses") {
    dateColumn = "spent_on";
    sql = `
      select
        id,
        amount_cents as "amountCents",
        category_id as "categoryId",
        spent_on as "spentOn",
        payee,
        note
      from expenses
      where user_id = $1
    `;
  } else if (entity === "incomes") {
    dateColumn = "earned_on";
    sql = `
      select
        id,
        amount_cents as "amountCents",
        earned_on as "earnedOn",
        source,
        note
      from incomes
      where user_id = $1
    `;
  } else {
    dateColumn = "snapshot_on";
    sql = `
      select
        id,
        snapshot_on as "snapshotOn",
        total_assets_cents as "totalAssetsCents",
        total_liabilities_cents as "totalLiabilitiesCents",
        note
      from networth_snapshots
      where user_id = $1
    `;
  }

  if (from) {
    values.push(from);
    sql += ` and ${dateColumn} >= $${values.length}`;
  }
  if (to) {
    values.push(to);
    sql += ` and ${dateColumn} <= $${values.length}`;
  }

  sql += ` order by ${dateColumn} asc`;

  const result = await query(sql, values);
  const csv = toCsv(result.rows as Record<string, unknown>[]);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${entity}.csv"`,
    },
  });
}

