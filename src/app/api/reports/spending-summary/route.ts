import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth-session";
import { query } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required.");
  }

  const yearParam = request.nextUrl.searchParams.get("year");
  const monthParam = request.nextUrl.searchParams.get("month");
  const year = Number(yearParam);
  let month: number | null = null;

  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    return jsonError(400, "VALIDATION_ERROR", "Query param 'year' is required.");
  }
  if (monthParam !== null) {
    const parsedMonth = Number(monthParam);
    if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      return jsonError(400, "VALIDATION_ERROR", "Query param 'month' must be an integer from 1 to 12.");
    }
    month = parsedMonth;
  }

  const start = month
    ? `${year}-${String(month).padStart(2, "0")}-01`
    : `${year}-01-01`;
  const end = month
    ? month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`
    : `${year + 1}-01-01`;

  const spending = await query<{ total: string }>(
    "select coalesce(sum(amount_cents), 0)::text as total from expenses where user_id = $1 and spent_on >= $2 and spent_on < $3",
    [userId, start, end],
  );
  const income = await query<{ total: string }>(
    "select coalesce(sum(amount_cents), 0)::text as total from incomes where user_id = $1 and earned_on >= $2 and earned_on < $3",
    [userId, start, end],
  );

  const totalSpendingCents = Number(spending.rows[0]?.total ?? 0);
  const totalIncomeCents = Number(income.rows[0]?.total ?? 0);

  return NextResponse.json({
    data: {
      period: month ? `${year}-${String(month).padStart(2, "0")}` : String(year),
      totalSpendingCents,
      totalIncomeCents,
      netCashflowCents: totalIncomeCents - totalSpendingCents,
    },
  });
}
