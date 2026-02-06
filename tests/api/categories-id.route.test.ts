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

import { DELETE, PATCH } from "@/app/api/categories/[id]/route";

describe("PATCH /api/categories/:id", () => {
  beforeEach(() => {
    mocks.getSessionUserId.mockReset();
    mocks.query.mockReset();
  });

  it("returns 400 for whitespace-only name", async () => {
    mocks.getSessionUserId.mockResolvedValue("user-1");
    const request = new NextRequest("http://localhost/api/categories/cat-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "   " }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "cat-1" }) });
    expect(response.status).toBe(400);
    expect(mocks.query).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/categories/:id", () => {
  beforeEach(() => {
    mocks.getSessionUserId.mockReset();
    mocks.query.mockReset();
  });

  it("returns 409 when category is still referenced by expenses", async () => {
    mocks.getSessionUserId.mockResolvedValue("user-1");
    mocks.query.mockResolvedValueOnce({
      rows: [{ count: "1" }],
      rowCount: 1,
    });
    const request = new NextRequest("http://localhost/api/categories/cat-1", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: "cat-1" }) });
    expect(response.status).toBe(409);
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });
});
