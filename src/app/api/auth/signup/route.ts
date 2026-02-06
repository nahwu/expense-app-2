import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { query } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { signUpSchema } from "@/lib/schemas";

const connectivityErrorCodes = new Set([
  "ENOTFOUND",
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ETIMEDOUT",
  "EAI_AGAIN",
]);

function isConnectivityError(error: unknown): error is { code: string } {
  if (!error || typeof error !== "object") {
    return false;
  }
  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === "string" && connectivityErrorCodes.has(maybeCode);
}

function getErrorLogDetails(error: unknown) {
  if (error instanceof Error) {
    const errWithCode = error as Error & { code?: string };
    return {
      code: errWithCode.code,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "object" && error !== null) {
    const maybeCode = (error as { code?: unknown }).code;
    const maybeMessage = (error as { message?: unknown }).message;
    return {
      code: typeof maybeCode === "string" ? maybeCode : undefined,
      message: typeof maybeMessage === "string" ? maybeMessage : "Unknown database error object.",
      rawError: error,
    };
  }

  return { message: String(error) };
}

export async function POST(request: NextRequest) {
  try {
    const payload = signUpSchema.parse(await request.json());
    const normalizedEmail = payload.email.toLowerCase();
    const passwordHash = await hash(payload.password, 12);

    const result = await query<{
      id: string;
      email: string;
      createdAt: string;
    }>(
      `
        insert into app_users (email, password_hash)
        values ($1, $2)
        on conflict (email) do nothing
        returning
          id::text as id,
          email::text as email,
          created_at as "createdAt"
      `,
      [normalizedEmail, passwordHash],
    );

    if (result.rowCount === 0) {
      return jsonError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists.");
    }

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(400, "VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid payload.");
    }
    if (isConnectivityError(error)) {
      console.error("[auth/signup] Database connectivity error", getErrorLogDetails(error));
      return jsonError(
        503,
        "DATABASE_UNAVAILABLE",
        "Database is unavailable. For local dev use DATABASE_URL host 'localhost'; in docker compose the app uses host 'db'.",
      );
    }
    throw error;
  }
}
