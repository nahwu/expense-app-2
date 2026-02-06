import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const callbackUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    const loginLocation = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    return new NextResponse(null, {
      status: 307,
      headers: { Location: loginLocation },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
