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

import { POST } from "@/app/api/incomes/route";

describe("POST /api/incomes", () => {
  beforeEach(() => {
    mocks.getSessionUserId.mockReset();
    mocks.query.mockReset();
  });

  it("returns 401 when user is unauthenticated", async () => {
    mocks.getSessionUserId.mockResolvedValue(null);
    const request = new NextRequest("http://localhost/api/incomes", {
      method: "POST",
      body: JSON.stringify({
        amountCents: 600000,
        earnedOn: "2026-02-01",
        source: "",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("accepts empty source string", async () => {
    mocks.getSessionUserId.mockResolvedValue("user-1");
    mocks.query.mockResolvedValue({
      rows: [{ id: "inc-1", source: "" }],
    });

    const request = new NextRequest("http://localhost/api/incomes", {
      method: "POST",
      body: JSON.stringify({
        amountCents: 600000,
        earnedOn: "2026-02-01",
        source: "",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("insert into incomes"), [
      "user-1",
      600000,
      "2026-02-01",
      "",
      null,
    ]);
  });

  it("accepts null source and normalizes it to empty string", async () => {
    mocks.getSessionUserId.mockResolvedValue("user-1");
    mocks.query.mockResolvedValue({
      rows: [{ id: "inc-2", source: "" }],
    });

    const request = new NextRequest("http://localhost/api/incomes", {
      method: "POST",
      body: JSON.stringify({
        amountCents: 450000,
        earnedOn: "2026-02-05",
        source: null,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("insert into incomes"), [
      "user-1",
      450000,
      "2026-02-05",
      "",
      null,
    ]);
  });
});

