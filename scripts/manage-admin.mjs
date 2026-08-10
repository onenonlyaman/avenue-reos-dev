#!/usr/bin/env node
/**
 * Administrator provisioning.
 *
 * This is the only path that can create an account holding an administrative role. It is
 * a local CLI, never an HTTP endpoint, and it never invents a password: the password is
 * read from the PLATFORM_ADMIN_PASSWORD environment variable or an interactive prompt.
 *
 * Usage:
 *   node scripts/manage-admin.mjs list
 *   node scripts/manage-admin.mjs create  <email> "<Full Name>" [role]
 *   node scripts/manage-admin.mjs set-password <email>
 *   node scripts/manage-admin.mjs activate <email>
 *   node scripts/manage-admin.mjs suspend  <email>
 */

import crypto from "node:crypto";
import readline from "node:readline";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";

const scryptAsync = promisify(crypto.scrypt);

const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const KEY_LENGTH = 64;
const MAXMEM = 64 * 1024 * 1024;
const MIN_LENGTH = Number(process.env.PASSWORD_MIN_LENGTH) || 12;

const TENANT_ID =
  process.env.NEXT_PUBLIC_AVENUE_TENANT_ID ||
  process.env.AVENUE_TENANT_ID ||
  "00000000-0000-0000-0000-000000000001";

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELISM,
    maxmem: MAXMEM,
  });
  return ["scrypt", COST, BLOCK_SIZE, PARALLELISM, salt.toString("base64"), derived.toString("base64")].join("$");
}

function checkPolicy(password) {
  if (typeof password !== "string" || password.length < MIN_LENGTH) {
    return `Password must be at least ${MIN_LENGTH} characters.`;
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return "Password must contain both upper and lower case letters.";
  }
  if (!/[0-9]/.test(password)) return "Password must contain at least one digit.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one symbol.";
  return null;
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const onData = (char) => {
      if (["\n", "\r", ""].includes(String(char))) {
        process.stdin.removeListener("data", onData);
      } else {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(question);
      }
    };
    process.stdin.on("data", onData);
    rl.question(question, (value) => {
      rl.close();
      process.stdout.write("\n");
      resolve(value);
    });
  });
}

async function readPassword() {
  const fromEnv = process.env.PLATFORM_ADMIN_PASSWORD;
  if (fromEnv) return fromEnv;

  const first = await promptHidden("New password: ");
  const second = await promptHidden("Confirm password: ");
  if (first !== second) {
    console.error("Passwords do not match.");
    process.exit(1);
  }
  return first;
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const prisma = new PrismaClient();
const [command, email, fullName, role] = process.argv.slice(2);

async function main() {
  switch (command) {
    case "list": {
      const rows = await prisma.$queryRawUnsafe(
        "SELECT email, full_name, role, status, must_reset_password, last_active FROM system_users ORDER BY created_at"
      );
      if (rows.length === 0) {
        console.log("No accounts exist. Create one with: manage-admin.mjs create <email> \"<Full Name>\"");
        return;
      }
      for (const r of rows) {
        console.log(
          [
            r.email.padEnd(38),
            r.role.padEnd(22),
            r.status.padEnd(18),
            r.must_reset_password ? "RESET REQUIRED" : "",
          ].join(" ")
        );
      }
      return;
    }

    case "create": {
      if (!email || !fullName) {
        console.error('Usage: manage-admin.mjs create <email> "<Full Name>" [role]');
        process.exit(1);
      }
      const password = await readPassword();
      const policyError = checkPolicy(password);
      if (policyError) {
        console.error(policyError);
        process.exit(1);
      }
      const hash = await hashPassword(password);
      const assignedRole = role || "Governance Director";

      await prisma.$executeRawUnsafe(
        `INSERT INTO system_users (
           tenant_id, full_name, email, password_hash, department, designation,
           role, status, mfa_enabled, must_reset_password, password_changed_at
         ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, 'ACTIVE', false, false, NOW())
         ON CONFLICT (email) DO NOTHING`,
        TENANT_ID,
        fullName,
        email.toLowerCase(),
        hash,
        "Executive Administration",
        assignedRole,
        assignedRole
      );

      const check = await prisma.$queryRawUnsafe(
        "SELECT id, status FROM system_users WHERE LOWER(email) = $1",
        email.toLowerCase()
      );
      if (check.length === 0) {
        console.error("Account was not created.");
        process.exit(1);
      }
      console.log(`Account ready: ${email} (${assignedRole}).`);
      return;
    }

    case "set-password": {
      if (!email) {
        console.error("Usage: manage-admin.mjs set-password <email>");
        process.exit(1);
      }
      const password = await readPassword();
      const policyError = checkPolicy(password);
      if (policyError) {
        console.error(policyError);
        process.exit(1);
      }
      const hash = await hashPassword(password);
      const updated = await prisma.$executeRawUnsafe(
        `UPDATE system_users
         SET password_hash = $1, password_changed_at = NOW(), must_reset_password = false,
             failed_login_count = 0, locked_until = NULL, updated_at = NOW()
         WHERE LOWER(email) = $2`,
        hash,
        email.toLowerCase()
      );
      if (updated === 0) {
        console.error(`No account with email ${email}.`);
        process.exit(1);
      }
      // A credential change must invalidate existing sessions.
      await prisma.$executeRawUnsafe(
        `UPDATE system_sessions SET revoked_at = NOW()
         WHERE revoked_at IS NULL
           AND user_id = (SELECT id FROM system_users WHERE LOWER(email) = $1)`,
        email.toLowerCase()
      );
      console.log(`Password updated for ${email}. All existing sessions revoked.`);
      return;
    }

    case "activate":
    case "suspend": {
      if (!email) {
        console.error(`Usage: manage-admin.mjs ${command} <email>`);
        process.exit(1);
      }
      const status = command === "activate" ? "ACTIVE" : "SUSPENDED";
      const updated = await prisma.$executeRawUnsafe(
        "UPDATE system_users SET status = $1, updated_at = NOW() WHERE LOWER(email) = $2",
        status,
        email.toLowerCase()
      );
      if (updated === 0) {
        console.error(`No account with email ${email}.`);
        process.exit(1);
      }
      if (status === "SUSPENDED") {
        await prisma.$executeRawUnsafe(
          `UPDATE system_sessions SET revoked_at = NOW()
           WHERE revoked_at IS NULL
             AND user_id = (SELECT id FROM system_users WHERE LOWER(email) = $1)`,
          email.toLowerCase()
        );
      }
      console.log(`${email} is now ${status}.`);
      return;
    }

    default:
      console.log(
        [
          "Usage:",
          "  node scripts/manage-admin.mjs list",
          '  node scripts/manage-admin.mjs create <email> "<Full Name>" [role]',
          "  node scripts/manage-admin.mjs set-password <email>",
          "  node scripts/manage-admin.mjs activate <email>",
          "  node scripts/manage-admin.mjs suspend <email>",
        ].join("\n")
      );
      process.exit(command ? 1 : 0);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
