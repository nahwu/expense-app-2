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

import { PATCH } from "@/app/api/expenses/[id]/route";

describe("PATCH /api/expenses/:id", () => {
  beforeEach(() => {
    mocks.getSessionUserId.mockReset();
    mocks.query.mockReset();
  });

  it("returns 401 when user is unauthenticated", async () => {
    mocks.getSessionUserId.mockResolvedValue(null);
    const request = new NextRequest("http://localhost/api/expenses/exp-1", {
      method: "PATCH",
      body: JSON.stringify({ payee: "Cafe" }),
    });

    const response = await PATCH(request, { params: { id: "exp-1" } });
    expect(response.status).toBe(401);
  });

  it("returns 400 when patch payload is empty", async () => {
    mocks.getSessionUserId.mockResolvedValue("user-1");
    const request = new NextRequest("http://localhost/api/expenses/exp-1", {
      method: "PATCH",
      body: JSON.stringify({}),
    });

    const response = await PATCH(request, { params: { id: "exp-1" } });
    expect(response.status).toBe(400);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("updates one field successfully", async () => {
    mocks.getSessionUserId.mockResolvedValue("user-1");
    mocks.query.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: "exp-1", payee: "New Payee" }],
    });
    const request = new NextRequest("http://localhost/api/expenses/exp-1", {
      method: "PATCH",
      body: JSON.stringify({ payee: "New Payee" }),
    });

    const response = await PATCH(request, { params: { id: "exp-1" } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe("exp-1");
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("update expenses"), [
      "user-1",
      "exp-1",
      "New Payee",
    ]);
  });
});
