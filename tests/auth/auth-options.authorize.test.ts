import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  compare: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  query: mocks.query,
}));

vi.mock("bcryptjs", () => ({
  compare: mocks.compare,
}));

import { authorizeCredentials } from "@/lib/auth-options";

describe("authorizeCredentials", () => {
  beforeEach(() => {
    mocks.query.mockReset();
    mocks.compare.mockReset();
  });

  it("returns null for invalid payload", async () => {
    const result = await authorizeCredentials({
      email: "bad-email",
      password: "",
    });

    expect(result).toBeNull();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("returns null when user is not found", async () => {
    mocks.query.mockResolvedValue({
      rows: [],
      rowCount: 0,
    });

    const result = await authorizeCredentials({
      email: "person@example.com",
      password: "StrongPassword!123",
    });

    expect(result).toBeNull();
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(mocks.compare).not.toHaveBeenCalled();
  });

  it("returns null when user is inactive", async () => {
    mocks.query.mockResolvedValue({
      rows: [
        {
          id: "user-1",
          email: "person@example.com",
          passwordHash: "hash-1",
          isActive: false,
        },
      ],
      rowCount: 1,
    });

    const result = await authorizeCredentials({
      email: "person@example.com",
      password: "StrongPassword!123",
    });

    expect(result).toBeNull();
    expect(mocks.compare).not.toHaveBeenCalled();
  });

  it("returns user when password matches", async () => {
    mocks.query.mockResolvedValue({
      rows: [
        {
          id: "user-1",
          email: "person@example.com",
          passwordHash: "hash-1",
          isActive: true,
        },
      ],
      rowCount: 1,
    });
    mocks.compare.mockResolvedValue(true);

    const result = await authorizeCredentials({
      email: "person@example.com",
      password: "StrongPassword!123",
    });

    expect(result).toEqual({
      id: "user-1",
      email: "person@example.com",
    });
    expect(mocks.compare).toHaveBeenCalledWith("StrongPassword!123", "hash-1");
  });
});
