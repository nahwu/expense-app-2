import { beforeEach, describe, expect, it, vi } from "vitest";
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

import { POST } from "@/app/api/expenses/route";

describe("POST /api/expenses", () => {
  beforeEach(() => {
    mocks.getSessionUserId.mockReset();
    mocks.query.mockReset();
  });

  it("returns 401 when user is unauthenticated", async () => {
    mocks.getSessionUserId.mockResolvedValue(null);
    const request = new NextRequest("http://localhost/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        amountCents: 1200,
        categoryId: "550e8400-e29b-41d4-a716-446655440000",
        spentOn: "2026-02-01",
        payee: "",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("accepts empty payee string", async () => {
    mocks.getSessionUserId.mockResolvedValue("user-1");
    mocks.query.mockResolvedValue({
      rows: [
        {
          id: "exp-1",
          amountCents: 1200,
          categoryId: "00000000-0000-0000-0000-000000000001",
          spentOn: "2026-02-01",
          payee: "",
          note: null,
        },
      ],
    });

    const request = new NextRequest("http://localhost/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        amountCents: 1200,
        categoryId: "550e8400-e29b-41d4-a716-446655440000",
        spentOn: "2026-02-01",
        payee: "",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("insert into expenses"), [
      "user-1",
      "550e8400-e29b-41d4-a716-446655440000",
      1200,
      "2026-02-01",
      "",
      null,
    ]);
  });

  it("accepts null payee and normalizes it to empty string", async () => {
    mocks.getSessionUserId.mockResolvedValue("user-1");
    mocks.query.mockResolvedValue({
      rows: [{ id: "exp-2", payee: "" }],
    });

    const request = new NextRequest("http://localhost/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        amountCents: 5400,
        categoryId: "550e8400-e29b-41d4-a716-446655440001",
        spentOn: "2026-02-03",
        payee: null,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("insert into expenses"), [
      "user-1",
      "550e8400-e29b-41d4-a716-446655440001",
      5400,
      "2026-02-03",
      "",
      null,
    ]);
  });
});
