import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSessionUserId } from "@/lib/auth-session";
import { query } from "@/lib/db";
import { jsonError, parsePagination } from "@/lib/http";
import { netWorthSnapshotCreateSchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required.");
  }

  const { searchParams } = request.nextUrl;
  const { page, pageSize } = parsePagination(searchParams);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const values: unknown[] = [userId];
  let sql = `
    select
      id,
      snapshot_on as "snapshotOn",
      total_assets_cents as "totalAssetsCents",
      total_liabilities_cents as "totalLiabilitiesCents",
      (total_assets_cents - total_liabilities_cents) as "netWorthCents",
      note,
      created_at as "createdAt",
      updated_at as "updatedAt"
    from networth_snapshots
    where user_id = $1
  `;

  if (from) {
    values.push(from);
    sql += ` and snapshot_on >= $${values.length}`;
  }
  if (to) {
    values.push(to);
    sql += ` and snapshot_on <= $${values.length}`;
  }

  values.push(pageSize, (page - 1) * pageSize);
  sql += ` order by snapshot_on desc, created_at desc limit $${values.length - 1} offset $${values.length}`;

  const result = await query(sql, values);
  return NextResponse.json({
    data: result.rows,
    pagination: { page, pageSize },
  });
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required.");
  }

  try {
    const payload = netWorthSnapshotCreateSchema.parse(await request.json());
    const result = await query(
      `
        insert into networth_snapshots (
          user_id,
          snapshot_on,
          total_assets_cents,
          total_liabilities_cents,
          note
        )
        values ($1, $2, $3, $4, $5)
        returning
          id,
          snapshot_on as "snapshotOn",
          total_assets_cents as "totalAssetsCents",
          total_liabilities_cents as "totalLiabilitiesCents",
          (total_assets_cents - total_liabilities_cents) as "netWorthCents",
          note,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [
        userId,
        payload.snapshotOn,
        payload.totalAssetsCents,
        payload.totalLiabilitiesCents,
        payload.note ?? null,
      ],
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(400, "VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid payload.");
    }
    throw error;
  }
}

