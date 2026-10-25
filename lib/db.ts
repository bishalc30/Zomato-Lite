import { neon } from "@neondatabase/serverless";

// One shared connection to the Neon database, created from DATABASE_URL
// in .env (Next.js loads .env automatically — never hardcode the string here).
export const sql = neon(process.env.DATABASE_URL!);

// sql.query() returns rows typed as Record<string, any> — "an object of
// unknown shape". This helper runs the same query but hands back rows
// with the exact type YOU declare at the call site, so the build's
// type-checker can see what the database gives us.
export async function rows<T>(query: string, params: unknown[] = []): Promise<T[]> {
  return (await sql.query(query, params)) as T[];
}

