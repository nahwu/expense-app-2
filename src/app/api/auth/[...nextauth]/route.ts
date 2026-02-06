import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

const handler = NextAuth(authOptions);

function logCsrfSigninContext(request: Request) {
  const url = new URL(request.url);
  const isCsrfSignin =
    url.pathname.endsWith("/api/auth/signin") && url.searchParams.get("csrf") === "true";

  if (!isCsrfSignin) {
    return;
  }

  console.warn("[auth] CSRF signin redirect detected", {
    url: request.url,
    host: request.headers.get("host"),
    xForwardedHost: request.headers.get("x-forwarded-host"),
    xForwardedProto: request.headers.get("x-forwarded-proto"),
    xForwardedFor: request.headers.get("x-forwarded-for"),
  });
}

export async function GET(request: Request, context: any) {
  logCsrfSigninContext(request);
  return handler(request, context);
}

export async function POST(request: Request, context: any) {
  logCsrfSigninContext(request);
  return handler(request, context);
}
