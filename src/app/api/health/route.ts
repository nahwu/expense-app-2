import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "clearworth",
    timestamp: new Date().toISOString(),
  });
}
