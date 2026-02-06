import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSessionUserId } from "@/lib/auth-session";
import { query } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { dateRangeQuerySchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required.");
  }

  try {
    const parsed = dateRangeQuerySchema.parse({
      from: request.nextUrl.searchParams.get("from") ?? undefined,
      to: request.nextUrl.searchParams.get("to") ?? undefined,
    });

    const values: unknown[] = [userId];
    let sql = `
      select
        c.name as "category",
        coalesce(sum(e.amount_cents), 0)::bigint as "totalCents"
      from expenses e
      left join categories c on c.id = e.category_id
      where e.user_id = $1
    `;

    if (parsed.from) {
      values.push(parsed.from);
      sql += ` and e.spent_on >= $${values.length}`;
    }
    if (parsed.to) {
      values.push(parsed.to);
      sql += ` and e.spent_on <= $${values.length}`;
    }

    sql += `
      group by c.name
      order by "totalCents" desc, "category" asc
    `;

    const result = await query(sql, values);
    return NextResponse.json({ data: result.rows });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(400, "VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid query parameters.");
    }
    throw error;
  }
}

