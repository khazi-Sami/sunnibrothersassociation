#!/usr/bin/env node
/**
 * Creates or updates .env.local with Supabase + NextAuth configuration.
 * Password source (first match wins):
 *   1. SUPABASE_DB_PASSWORD environment variable
 *   2. Secure prompt on TTY (hidden input)
 *
 * Never prints the database password or NEXTAUTH_SECRET.
 */
import { spawnSync } from "node:child_process";
import { createWriteStream, existsSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = path.join(ROOT, ".env.local");
const PROJECT_REF = "coozbtjjsuirtqmkxndl";
const POOLER_HOST = "aws-1-ap-south-1.pooler.supabase.com";
const DIRECT_HOST = `db.${PROJECT_REF}.supabase.co`;

function encodePassword(password) {
  return encodeURIComponent(password);
}

function buildUrls(password) {
  const encoded = encodePassword(password);
  return {
    databaseUrl: `postgresql://postgres.${PROJECT_REF}:${encoded}@${POOLER_HOST}:6543/postgres?pgbouncer=true`,
    directUrl: `postgresql://postgres:${encoded}@${DIRECT_HOST}:5432/postgres`,
  };
}

function readSecretFromPrompt() {
  if (!process.stdin.isTTY) {
    return null;
  }
  const result = spawnSync("bash", ["-c", 'read -s -p "Supabase database password: " pw; printf %s "$pw"'], {
    stdio: ["inherit", "pipe", "inherit"],
    encoding: "utf8",
  });
  if (result.status !== 0 || !result.stdout) {
    return null;
  }
  process.stdout.write("\n");
  return result.stdout.trim();
}

function existingNextAuthSecret() {
  if (!existsSync(ENV_PATH)) return null;
  const match = readFileSync(ENV_PATH, "utf8").match(/^NEXTAUTH_SECRET=(.+)$/m);
  return match?.[1]?.trim() || null;
}

async function main() {
  const password = process.env.SUPABASE_DB_PASSWORD?.trim() || readSecretFromPrompt();
  if (!password) {
    console.error(
      "Missing Supabase database password. Set SUPABASE_DB_PASSWORD or run this script in an interactive terminal.",
    );
    process.exit(1);
  }

  const { databaseUrl, directUrl } = buildUrls(password);
  const nextAuthSecret = existingNextAuthSecret() || randomBytes(32).toString("base64");

  const lines = [
    `DATABASE_URL=${databaseUrl}`,
    `DIRECT_URL=${directUrl}`,
    `NEXTAUTH_SECRET=${nextAuthSecret}`,
    "NEXTAUTH_URL=https://www.sunnibrothers.com",
    "",
  ];

  await new Promise((resolve, reject) => {
    const stream = createWriteStream(ENV_PATH, { encoding: "utf8" });
    stream.on("error", reject);
    stream.on("finish", resolve);
    stream.write(lines.join("\n"));
    stream.end();
  });

  console.log("Wrote .env.local (secrets not displayed).");
  console.log("DATABASE_URL: pooler port 6543");
  console.log("DIRECT_URL: direct port 5432");
  console.log("NEXTAUTH_URL: https://www.sunnibrothers.com");
  console.log(`NEXTAUTH_SECRET: ${existingNextAuthSecret() ? "preserved existing" : "generated new"}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
