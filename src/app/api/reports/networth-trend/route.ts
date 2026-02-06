import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSessionUserId } from "@/lib/auth-session";
import { query } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { groupedReportQuerySchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required.");
  }

  try {
    const parsed = groupedReportQuerySchema.parse({
      from: request.nextUrl.searchParams.get("from") ?? undefined,
      to: request.nextUrl.searchParams.get("to") ?? undefined,
      groupBy: request.nextUrl.searchParams.get("groupBy") ?? undefined,
    });

    const values: unknown[] = [userId];
    let filterSql = "";

    if (parsed.from) {
      values.push(parsed.from);
      filterSql += ` and snapshot_on >= $${values.length}`;
    }
    if (parsed.to) {
      values.push(parsed.to);
      filterSql += ` and snapshot_on <= $${values.length}`;
    }

    const monthly = await query(
      `
        select
          to_char(snapshot_on, 'YYYY-MM') as period,
          total_assets_cents::bigint as "totalAssetsCents",
          total_liabilities_cents::bigint as "totalLiabilitiesCents",
          (total_assets_cents - total_liabilities_cents)::bigint as "netWorthCents",
          snapshot_on as "snapshotOn"
        from networth_snapshots
        where user_id = $1 ${filterSql}
        order by snapshot_on asc
      `,
      values,
    );

    if (parsed.groupBy === "month") {
      return NextResponse.json({ data: monthly.rows });
    }

    const latestPerYear = new Map<string, (typeof monthly.rows)[number]>();
    for (const row of monthly.rows) {
      const period = String(row.period).slice(0, 4);
      latestPerYear.set(period, row);
    }

    const yearly = [...latestPerYear.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, row]) => ({
        period,
        totalAssetsCents: row.totalAssetsCents,
        totalLiabilitiesCents: row.totalLiabilitiesCents,
        netWorthCents: row.netWorthCents,
        snapshotOn: row.snapshotOn,
      }));

    return NextResponse.json({ data: yearly });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(400, "VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid query parameters.");
    }
    throw error;
  }
}

