// One-off migration: make reviews.comment nullable (rating-only reviews
// are allowed from now on). Idempotent — safe to run more than once.
// Run with: npm run db:migrate-comment-nullable
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

async function main() {
  const columns = await sql.query(
    "SELECT is_nullable FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'comment'"
  );

  if (columns.length === 0) {
    console.error("reviews.comment column not found — did the schema change?");
    process.exit(1);
  }

  if (columns[0].is_nullable === "YES") {
    console.log("reviews.comment is already nullable. Nothing to do.");
    return;
  }

  await sql.query("ALTER TABLE reviews ALTER COLUMN comment DROP NOT NULL");

  const check = await sql.query(
    "SELECT is_nullable FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'comment'"
  );
  console.log("reviews.comment is now nullable:", check[0].is_nullable === "YES");
}

main().catch((err) => {
  console.error("migration failed:", err.message);
  process.exit(1);
});
