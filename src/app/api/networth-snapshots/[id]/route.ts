import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSessionUserId } from "@/lib/auth-session";
import { query } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { netWorthSnapshotUpdateSchema } from "@/lib/schemas";

type RouteContext = {
  params: { id: string };
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required.");
  }

  const { id } = context.params;

  try {
    const patch = netWorthSnapshotUpdateSchema.parse(await request.json());
    if (Object.keys(patch).length === 0) {
      return jsonError(400, "VALIDATION_ERROR", "At least one field must be provided.");
    }

    const values: unknown[] = [userId, id];
    const updates: string[] = [];
    let index = values.length + 1;

    if (patch.snapshotOn !== undefined) {
      updates.push(`snapshot_on = $${index++}`);
      values.push(patch.snapshotOn);
    }
    if (patch.totalAssetsCents !== undefined) {
      updates.push(`total_assets_cents = $${index++}`);
      values.push(patch.totalAssetsCents);
    }
    if (patch.totalLiabilitiesCents !== undefined) {
      updates.push(`total_liabilities_cents = $${index++}`);
      values.push(patch.totalLiabilitiesCents);
    }
    if (patch.note !== undefined) {
      updates.push(`note = $${index++}`);
      values.push(patch.note ?? null);
    }

    updates.push("updated_at = now()");

    const result = await query(
      `
        update networth_snapshots
        set ${updates.join(", ")}
        where user_id = $1 and id = $2
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
      values,
    );

    if (result.rowCount === 0) {
      return jsonError(404, "NOT_FOUND", "Net worth snapshot not found.");
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

  const { id } = context.params;
  const result = await query("delete from networth_snapshots where user_id = $1 and id = $2", [userId, id]);

  if (result.rowCount === 0) {
    return jsonError(404, "NOT_FOUND", "Net worth snapshot not found.");
  }

  return new NextResponse(null, { status: 204 });
}
