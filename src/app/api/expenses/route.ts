import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSessionUserId } from "@/lib/auth-session";
import { query } from "@/lib/db";
import { jsonError, parsePagination } from "@/lib/http";
import { expenseCreateSchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required.");
  }

  const { searchParams } = request.nextUrl;
  const { page, pageSize } = parsePagination(searchParams);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const categoryId = searchParams.get("categoryId");
  const payee = searchParams.get("payee");

  const values: unknown[] = [userId];
  let sql = `
    select
      e.id,
      e.amount_cents as "amountCents",
      e.category_id as "categoryId",
      c.name as "categoryName",
      e.spent_on as "spentOn",
      e.payee,
      e.note,
      e.created_at as "createdAt",
      e.updated_at as "updatedAt"
    from expenses e
    left join categories c on c.id = e.category_id
    where e.user_id = $1
  `;

  if (from) {
    values.push(from);
    sql += ` and e.spent_on >= $${values.length}`;
  }
  if (to) {
    values.push(to);
    sql += ` and e.spent_on <= $${values.length}`;
  }
  if (categoryId) {
    values.push(categoryId);
    sql += ` and e.category_id = $${values.length}`;
  }
  if (payee) {
    values.push(`%${payee}%`);
    sql += ` and e.payee ilike $${values.length}`;
  }

  values.push(pageSize, (page - 1) * pageSize);
  sql += ` order by e.spent_on desc, e.created_at desc limit $${values.length - 1} offset $${values.length}`;

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
    const payload = expenseCreateSchema.parse(await request.json());

    const result = await query(
      `
        insert into expenses (
          user_id,
          category_id,
          amount_cents,
          spent_on,
          payee,
          note
        )
        values ($1, $2, $3, $4, $5, $6)
        returning
          id,
          amount_cents as "amountCents",
          category_id as "categoryId",
          spent_on as "spentOn",
          payee,
          note,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [userId, payload.categoryId, payload.amountCents, payload.spentOn, payload.payee, payload.note ?? null],
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(400, "VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid payload.");
    }
    throw error;
  }
}

