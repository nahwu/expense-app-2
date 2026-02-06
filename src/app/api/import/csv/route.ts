import { jsonError } from "@/lib/http";

export async function POST() {
  return jsonError(501, "NOT_IMPLEMENTED", "CSV import endpoint scaffolded but not implemented yet.");
}

