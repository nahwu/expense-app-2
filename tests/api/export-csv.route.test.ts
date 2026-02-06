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

import { GET } from "@/app/api/export/csv/route";

describe("GET /api/export/csv", () => {
  beforeEach(() => {
    mocks.getSessionUserId.mockReset();
    mocks.query.mockReset();
  });

  it("returns 401 when user is unauthenticated", async () => {
    mocks.getSessionUserId.mockResolvedValue(null);
    const request = new NextRequest("http://localhost/api/export/csv?entity=expenses");

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid export query", async () => {
    mocks.getSessionUserId.mockResolvedValue("user-1");
    const request = new NextRequest("http://localhost/api/export/csv?entity=bad");

    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("returns CSV and escapes quotes", async () => {
    mocks.getSessionUserId.mockResolvedValue("user-1");
    mocks.query.mockResolvedValue({
      rows: [
        {
          id: "exp-1",
          amountCents: 1200,
          categoryId: "cat-1",
          spentOn: "2026-01-10",
          payee: "ACME \"Store\"",
          note: null,
        },
      ],
    });

    const request = new NextRequest("http://localhost/api/export/csv?entity=expenses");
    const response = await GET(request);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toContain("expenses.csv");
    expect(text).toContain("id,amountCents,categoryId,spentOn,payee,note");
    expect(text).toContain("\"ACME \"\"Store\"\"\"");
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("from expenses"), ["user-1"]);
  });
});
