#!/usr/bin/env node
/**
 * Upserts admin@sba.local with a temporary bcrypt password.
 * Prints the temporary password once to stdout (last line).
 */
import { config } from "dotenv";
import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(ROOT, ".env.local"), override: true, quiet: true });

function temporaryPassword() {
  const raw = randomBytes(18).toString("base64url");
  return `SbaAdmin-${raw}!`;
}

async function main() {
  const prisma = new PrismaClient();
  const password = temporaryPassword();
  const hash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email: "admin@sba.local" },
    update: {
      name: "SBA Admin",
      role: "ADMIN",
      password: hash,
    },
    create: {
      name: "SBA Admin",
      email: "admin@sba.local",
      password: hash,
      role: "ADMIN",
    },
  });

  await prisma.$disconnect();
  console.log("ADMIN_READY");
  console.log(password);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
