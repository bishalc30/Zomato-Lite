import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

// `neon()` returns a tagged-template function. For plain SQL strings
// read from files, use its `query()` property instead.
const sql = neon(process.env.DATABASE_URL);

// Convention: db/*.sql files separate statements with a semicolon.
// This splits a file into individual statements so each runs cleanly.
const statements = (text) =>
  text
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

const schema = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
const seed = readFileSync(new URL("./seed.sql", import.meta.url), "utf8");

async function main() {
  // 1. Wipe old tables so this script can be run again safely.
  await sql.query("DROP TABLE IF EXISTS reviews CASCADE");
  await sql.query("DROP TABLE IF EXISTS restaurants CASCADE");

  // 2. Apply the schema (the shape of the tables).
  for (const statement of statements(schema)) {
    await sql.query(statement);
  }

  // 3. Apply the seed (the starting facts).
  for (const statement of statements(seed)) {
    await sql.query(statement);
  }

  // 4. Show what we created.
  const restaurants = await sql.query("SELECT * FROM restaurants ORDER BY id");
  const reviews = await sql.query("SELECT * FROM reviews ORDER BY id");

  console.log("restaurants table:");
  console.log(JSON.stringify(restaurants, null, 2));

  console.log("\nreviews table:");
  console.log(JSON.stringify(reviews, null, 2));

  console.log("\nDone. Schema and seed applied successfully.");
}

main().catch((err) => {
  console.error("db:setup failed:", err.message);
  process.exit(1);
});
