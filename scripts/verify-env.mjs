#!/usr/bin/env node
/**
 * Validates .env.local without printing secret values.
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = path.join(ROOT, ".env.local");

function status(name, ok, detail = "") {
  console.log(`${name}: ${ok ? "configured" : "invalid"}${detail ? ` (${detail})` : ""}`);
}

function isPlaceholder(value) {
  return !value || /REPLACE|__.*__|placeholder/i.test(value);
}

function main() {
  if (!existsSync(ENV_PATH)) {
    for (const name of ["DATABASE_URL", "DIRECT_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL"]) {
      status(name, false, "missing .env.local");
    }
    process.exit(1);
  }

  config({ path: ENV_PATH, override: true, quiet: true });

  const databaseUrl = process.env.DATABASE_URL ?? "";
  const directUrl = process.env.DIRECT_URL ?? "";
  const nextAuthSecret = process.env.NEXTAUTH_SECRET ?? "";
  const nextAuthUrl = process.env.NEXTAUTH_URL ?? "";

  let databaseOk = !isPlaceholder(databaseUrl);
  let directOk = !isPlaceholder(directUrl);
  let secretOk = !isPlaceholder(nextAuthSecret) && nextAuthSecret.length >= 32;
  let urlOk = nextAuthUrl === "https://www.sunnibrothers.com";

  try {
    const db = new URL(databaseUrl);
    databaseOk &&= db.port === "6543" && db.hostname.includes("pooler.supabase.com");
  } catch {
    databaseOk = false;
  }

  try {
    const direct = new URL(directUrl);
    directOk &&= direct.port === "5432" && direct.hostname.includes("supabase.co");
  } catch {
    directOk = false;
  }

  status("DATABASE_URL", databaseOk, databaseOk ? "port 6543 pooler" : "check URL");
  status("DIRECT_URL", directOk, directOk ? "port 5432 direct" : "check URL");
  status("NEXTAUTH_SECRET", secretOk, secretOk ? "sufficient length" : "too short or placeholder");
  status("NEXTAUTH_URL", urlOk, urlOk ? "production origin" : "expected https://www.sunnibrothers.com");

  process.exit(databaseOk && directOk && secretOk && urlOk ? 0 : 1);
}

main();
