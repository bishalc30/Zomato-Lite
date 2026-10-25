import { neon } from "@neondatabase/serverless";

// One shared connection to the Neon database, created from DATABASE_URL
// in .env (Next.js loads .env automatically — never hardcode the string here).
export const sql = neon(process.env.DATABASE_URL!);
