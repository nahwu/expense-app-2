import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSessionUserId } from "@/lib/auth-session";
import { query } from "@/lib/db";
import { jsonError, parsePagination } from "@/lib/http";
import { incomeCreateSchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required.");
  }

  const { searchParams } = request.nextUrl;
  const { page, pageSize } = parsePagination(searchParams);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const source = searchParams.get("source");

  const values: unknown[] = [userId];
  let sql = `
    select
      id,
      amount_cents as "amountCents",
      earned_on as "earnedOn",
      source,
      note,
      created_at as "createdAt",
      updated_at as "updatedAt"
    from incomes
    where user_id = $1
  `;

  if (from) {
    values.push(from);
    sql += ` and earned_on >= $${values.length}`;
  }
  if (to) {
    values.push(to);
    sql += ` and earned_on <= $${values.length}`;
  }
  if (source) {
    values.push(`%${source}%`);
    sql += ` and source ilike $${values.length}`;
  }

  values.push(pageSize, (page - 1) * pageSize);
  sql += ` order by earned_on desc, created_at desc limit $${values.length - 1} offset $${values.length}`;

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
    const payload = incomeCreateSchema.parse(await request.json());
    const result = await query(
      `
        insert into incomes (user_id, amount_cents, earned_on, source, note)
        values ($1, $2, $3, $4, $5)
        returning
          id,
          amount_cents as "amountCents",
          earned_on as "earnedOn",
          source,
          note,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [userId, payload.amountCents, payload.earnedOn, payload.source, payload.note ?? null],
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(400, "VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid payload.");
    }
    throw error;
  }
}

