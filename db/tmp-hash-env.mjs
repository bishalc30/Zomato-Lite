// One-off: print sha256 of the local DATABASE_URL value (value itself is NOT printed).
import { createHash } from "node:crypto";
import fs from "node:fs";

const env = fs.readFileSync(".env", "utf8");
const m = env.match(/DATABASE_URL\s*=\s*(\S+)/);
const url = m[1].trim().replace(/^"|"$/g, "");
console.log("local DATABASE_URL sha256:", createHash("sha256").update(url).digest("hex"));

// tell-tale shape without leaking the password
const u = new URL(url);
console.log("host:", u.host, "| path:", u.pathname.split("/").pop(), "| sslmode:", u.searchParams.get("sslmode") !== null ? "present" : "absent");
