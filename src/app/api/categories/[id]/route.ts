import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSessionUserId } from "@/lib/auth-session";
import { query } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { categoryUpdateSchema } from "@/lib/schemas";

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
    const patch = categoryUpdateSchema.parse(await request.json());
    if (!patch.name) {
      return jsonError(400, "VALIDATION_ERROR", "Name must be provided.");
    }

    const result = await query(
      `
        update categories
        set name = $3, updated_at = now()
        where user_id = $1 and id = $2 and is_system = false
        returning
          id,
          name,
          is_system as "isSystem",
          user_id as "userId",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [userId, id, patch.name],
    );

    if (result.rowCount === 0) {
      return jsonError(404, "NOT_FOUND", "Category not found.");
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

  const linkedExpenseCheck = await query<{ count: string }>(
    "select count(*) from expenses where user_id = $1 and category_id = $2",
    [userId, id],
  );

  if (Number(linkedExpenseCheck.rows[0]?.count ?? 0) > 0) {
    return jsonError(409, "CATEGORY_IN_USE", "Category is used by existing expenses.");
  }

  const result = await query("delete from categories where user_id = $1 and id = $2 and is_system = false", [
    userId,
    id,
  ]);

  if (result.rowCount === 0) {
    return jsonError(404, "NOT_FOUND", "Category not found.");
  }

  return new NextResponse(null, { status: 204 });
}
