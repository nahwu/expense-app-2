import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getSessionUserId: vi.fn(),
  query: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  getSessionUserId: mocks.getSessionUserId,
}));

vi.mock("@/lib/db", () => ({
  query: mocks.query,
}));

import { GET } from "@/app/api/reports/spending-summary/route";

describe("GET /api/reports/spending-summary", () => {
  beforeEach(() => {
    mocks.getSessionUserId.mockReset();
    mocks.query.mockReset();
  });

  it("returns 401 when user is unauthenticated", async () => {
    mocks.getSessionUserId.mockResolvedValue(null);
    const request = new NextRequest("http://localhost/api/reports/spending-summary?year=2025");

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 when year query param is missing", async () => {
    mocks.getSessionUserId.mockResolvedValue("user-1");
    const request = new NextRequest("http://localhost/api/reports/spending-summary");

    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 when month is outside 1..12", async () => {
    mocks.getSessionUserId.mockResolvedValue("user-1");
    const request = new NextRequest("http://localhost/api/reports/spending-summary?year=2025&month=13");

    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("returns month totals and rolls date window to next year for December", async () => {
    mocks.getSessionUserId.mockResolvedValue("user-1");
    mocks.query
      .mockResolvedValueOnce({ rows: [{ total: "1000" }] })
      .mockResolvedValueOnce({ rows: [{ total: "2300" }] });

    const request = new NextRequest("http://localhost/api/reports/spending-summary?year=2025&month=12");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      period: "2025-12",
      totalSpendingCents: 1000,
      totalIncomeCents: 2300,
      netCashflowCents: 1300,
    });

    expect(mocks.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("from expenses"),
      ["user-1", "2025-12-01", "2026-01-01"],
    );
    expect(mocks.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("from incomes"),
      ["user-1", "2025-12-01", "2026-01-01"],
    );
  });
});
