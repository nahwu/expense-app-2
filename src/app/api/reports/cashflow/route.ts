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

    const periodFormat = parsed.groupBy === "year" ? "YYYY" : "YYYY-MM";
    const values: unknown[] = [userId];
    let expenseFilterSql = "";
    let incomeFilterSql = "";

    if (parsed.from) {
      values.push(parsed.from);
      expenseFilterSql += ` and spent_on >= $${values.length}`;
      incomeFilterSql += ` and earned_on >= $${values.length}`;
    }
    if (parsed.to) {
      values.push(parsed.to);
      expenseFilterSql += ` and spent_on <= $${values.length}`;
      incomeFilterSql += ` and earned_on <= $${values.length}`;
    }

    const result = await query(
      `
        with merged as (
          select
            to_char(earned_on, '${periodFormat}') as period,
            amount_cents::bigint as income_cents,
            0::bigint as expense_cents
          from incomes
          where user_id = $1 ${incomeFilterSql}
          union all
          select
            to_char(spent_on, '${periodFormat}') as period,
            0::bigint as income_cents,
            amount_cents::bigint as expense_cents
          from expenses
          where user_id = $1 ${expenseFilterSql}
        )
        select
          period,
          sum(income_cents)::bigint as "totalIncomeCents",
          sum(expense_cents)::bigint as "totalExpenseCents",
          (sum(income_cents) - sum(expense_cents))::bigint as "netCashflowCents"
        from merged
        group by period
        order by period asc
      `,
      values,
    );

    return NextResponse.json({ data: result.rows });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(400, "VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid query parameters.");
    }
    throw error;
  }
}

