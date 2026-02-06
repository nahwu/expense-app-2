import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSessionUserId } from "@/lib/auth-session";
import { query } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { categoryCreateSchema } from "@/lib/schemas";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required.");
  }

  const result = await query(
    `
      select
        id,
        name,
        is_system as "isSystem",
        user_id as "userId",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from categories
      where user_id = $1 or user_id is null
      order by is_system desc, lower(name) asc
    `,
    [userId],
  );

  return NextResponse.json({ data: result.rows });
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required.");
  }

  try {
    const payload = categoryCreateSchema.parse(await request.json());
    const result = await query(
      `
        insert into categories (user_id, name, is_system)
        values ($1, $2, false)
        returning
          id,
          name,
          is_system as "isSystem",
          user_id as "userId",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [userId, payload.name],
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(400, "VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid payload.");
    }
    throw error;
  }
}

