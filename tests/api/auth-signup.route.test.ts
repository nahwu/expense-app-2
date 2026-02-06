import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  hash: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  query: mocks.query,
}));

vi.mock("bcryptjs", () => ({
  hash: mocks.hash,
}));

import { POST } from "@/app/api/auth/signup/route";

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    mocks.query.mockReset();
    mocks.hash.mockReset();
  });

  it("returns 400 when password is weak", async () => {
    const request = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "person@example.com",
        password: "weak",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(mocks.hash).not.toHaveBeenCalled();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("returns 409 when email already exists", async () => {
    mocks.hash.mockResolvedValue("hashed-password");
    mocks.query.mockResolvedValue({
      rowCount: 0,
      rows: [],
    });

    const request = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "person@example.com",
        password: "password",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
  });

  it("creates a new user and normalizes email", async () => {
    mocks.hash.mockResolvedValue("hashed-password");
    mocks.query.mockResolvedValue({
      rowCount: 1,
      rows: [
        {
          id: "00000000-0000-0000-0000-000000000123",
          email: "person@example.com",
          createdAt: "2026-02-06T00:00:00.000Z",
        },
      ],
    });

    const request = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "Person@Example.Com ",
        password: "password",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.id).toBe("00000000-0000-0000-0000-000000000123");
    expect(body.data.email).toBe("person@example.com");
    expect(body.data.passwordHash).toBeUndefined();

    expect(mocks.hash).toHaveBeenCalledWith("password", 12);
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("insert into app_users"), [
      "person@example.com",
      "hashed-password",
    ]);
  });

  it("returns 503 when database host cannot be resolved", async () => {
    mocks.hash.mockResolvedValue("hashed-password");
    mocks.query.mockRejectedValue({
      code: "ENOTFOUND",
      message: "getaddrinfo ENOTFOUND db",
    });

    const request = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "person@example.com",
        password: "password",
      }),
    });

    const response = await POST(request);
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.error.code).toBe("DATABASE_UNAVAILABLE");
  });
});
