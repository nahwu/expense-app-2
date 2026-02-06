import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSessionUserId } from "@/lib/auth-session";
import { query } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { incomeUpdateSchema } from "@/lib/schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required.");
  }

  const { id } = await context.params;

  try {
    const patch = incomeUpdateSchema.parse(await request.json());
    if (Object.keys(patch).length === 0) {
      return jsonError(400, "VALIDATION_ERROR", "At least one field must be provided.");
    }

    const values: unknown[] = [userId, id];
    const updates: string[] = [];
    let index = values.length + 1;

    if (patch.amountCents !== undefined) {
      updates.push(`amount_cents = $${index++}`);
      values.push(patch.amountCents);
    }
    if (patch.earnedOn !== undefined) {
      updates.push(`earned_on = $${index++}`);
      values.push(patch.earnedOn);
    }
    if (patch.source !== undefined) {
      updates.push(`source = $${index++}`);
      values.push(patch.source);
    }
    if (patch.note !== undefined) {
      updates.push(`note = $${index++}`);
      values.push(patch.note ?? null);
    }

    updates.push("updated_at = now()");

    const result = await query(
      `
        update incomes
        set ${updates.join(", ")}
        where user_id = $1 and id = $2
        returning
          id,
          amount_cents as "amountCents",
          earned_on as "earnedOn",
          source,
          note,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      values,
    );

    if (result.rowCount === 0) {
      return jsonError(404, "NOT_FOUND", "Income record not found.");
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(400, "VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid payload.");
    }
    throw error;
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required.");
  }

  const { id } = await context.params;
  const result = await query("delete from incomes where user_id = $1 and id = $2", [userId, id]);

  if (result.rowCount === 0) {
    return jsonError(404, "NOT_FOUND", "Income record not found.");
  }

  return new NextResponse(null, { status: 204 });
}
