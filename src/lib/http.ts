import { NextResponse } from "next/server";

export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

export function parsePagination(searchParams: URLSearchParams) {
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 25);

  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: Number.isInteger(pageSize) && pageSize > 0 && pageSize <= 100 ? pageSize : 25,
  };
}

export function toCsv(records: Record<string, unknown>[]) {
  if (records.length === 0) {
    return "";
  }

  const headers = Object.keys(records[0]);
  const rows = records.map((record) =>
    headers
      .map((header) => {
        const raw = record[header];
        const value = raw == null ? "" : String(raw);
        const escaped = value.replaceAll('"', '""');
        return `"${escaped}"`;
      })
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

