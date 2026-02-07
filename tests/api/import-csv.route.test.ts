import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/import/csv/route";

describe("POST /api/import/csv", () => {
  it("returns 501 with NOT_IMPLEMENTED error code", async () => {
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(501);
    expect(body.error).toEqual({
      code: "NOT_IMPLEMENTED",
      message: "CSV import endpoint scaffolded but not implemented yet.",
    });
  });
});

