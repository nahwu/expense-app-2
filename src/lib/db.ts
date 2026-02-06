import { Pool, QueryResultRow } from "pg";

const globalDb = globalThis as unknown as {
  pool?: Pool;
};

function getPool() {
  if (globalDb.pool) {
    return globalDb.pool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const pool = new Pool({
    connectionString,
    max: 10,
  });

  if (process.env.NODE_ENV !== "production") {
    globalDb.pool = pool;
  }

  return pool;
}

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  return getPool().query<T>(text, values);
}
