#!/usr/bin/env node
/**
 * Forward-only SQL migration runner.
 *
 * Usage:
 *   node scripts/migrate.mjs                 apply every pending migration
 *   node scripts/migrate.mjs --status        list applied and pending migrations
 *   node scripts/migrate.mjs --baseline 008  record 000..008 as applied without running
 *                                            them (for a database that predates this runner)
 *   node scripts/migrate.mjs --dry-run       show what would run, change nothing
 *
 * Each file runs inside its own transaction and is recorded in `schema_migrations` with a
 * checksum. A file whose contents change after it has been applied is reported as drift
 * and the run aborts rather than silently diverging from the deployed schema.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, "..", "migrations");

const args = process.argv.slice(2);
const statusOnly = args.includes("--status");
const dryRun = args.includes("--dry-run");
const baselineIndex = args.indexOf("--baseline");
const baselineUpTo = baselineIndex >= 0 ? args[baselineIndex + 1] : null;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Refusing to run migrations against an unknown database.");
  process.exit(1);
}

function loadMigrations() {
  if (!fs.existsSync(migrationsDir)) {
    console.error(`No migrations directory at ${migrationsDir}`);
    process.exit(1);
  }
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    // Seed and verification helpers are never applied automatically.
    .filter((f) => !f.startsWith("seed_") && !f.startsWith("verify_"))
    .sort()
    .map((name) => {
      const sql = fs.readFileSync(path.join(migrationsDir, name), "utf8");
      return {
        name,
        sql,
        checksum: crypto.createHash("sha256").update(sql).digest("hex"),
      };
    });
}

/**
 * Splits a migration file into individual statements.
 *
 * Aware of single/double quotes, dollar-quoted bodies and both comment styles, so a
 * semicolon inside a string, a function body or a comment does not split a statement.
 * Transaction control statements are dropped: the runner supplies the transaction.
 */
function splitSqlStatements(sql) {
  const statements = [];
  let current = "";
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];
    const rest = sql.slice(i);

    if (ch === "-" && sql[i + 1] === "-") {
      const end = sql.indexOf("\n", i);
      i = end === -1 ? sql.length : end;
      continue;
    }

    if (ch === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? sql.length : end + 2;
      continue;
    }

    if (ch === "'" || ch === '"') {
      const quote = ch;
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === quote && sql[j + 1] === quote) { j += 2; continue; }
        if (sql[j] === quote) break;
        j += 1;
      }
      current += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }

    const dollarTag = /^\$[A-Za-z_0-9]*\$/.exec(rest);
    if (dollarTag) {
      const tag = dollarTag[0];
      const end = sql.indexOf(tag, i + tag.length);
      const stop = end === -1 ? sql.length : end + tag.length;
      current += sql.slice(i, stop);
      i = stop;
      continue;
    }

    if (ch === ";") {
      statements.push(current);
      current = "";
      i += 1;
      continue;
    }

    current += ch;
    i += 1;
  }

  statements.push(current);

  return statements
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s) => !/^(BEGIN|COMMIT|END|START\s+TRANSACTION|ROLLBACK)$/i.test(s));
}

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        VARCHAR(255) PRIMARY KEY,
      checksum    CHAR(64) NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      baselined   BOOLEAN NOT NULL DEFAULT false
    )
  `);

  const migrations = loadMigrations();
  const appliedRows = await prisma.$queryRawUnsafe(
    "SELECT name, checksum, baselined FROM schema_migrations"
  );
  const applied = new Map(appliedRows.map((r) => [r.name, r]));

  const drift = migrations.filter((m) => {
    const record = applied.get(m.name);
    return record && !record.baselined && record.checksum !== m.checksum;
  });

  if (drift.length > 0) {
    console.error("Migration drift detected. These files changed after being applied:");
    for (const m of drift) console.error(`  - ${m.name}`);
    console.error("Add a new migration instead of editing an applied one.");
    process.exit(1);
  }

  const pending = migrations.filter((m) => !applied.has(m.name));

  if (statusOnly) {
    console.log(`applied: ${applied.size}, pending: ${pending.length}`);
    for (const m of migrations) {
      const record = applied.get(m.name);
      const state = record ? (record.baselined ? "baselined" : "applied") : "PENDING";
      console.log(`  ${state.padEnd(10)} ${m.name}`);
    }
    return;
  }

  if (baselineUpTo) {
    const cutoff = String(baselineUpTo);
    const toBaseline = migrations.filter(
      (m) => !applied.has(m.name) && m.name.slice(0, cutoff.length) <= cutoff
    );
    for (const m of toBaseline) {
      if (dryRun) {
        console.log(`[dry-run] would baseline ${m.name}`);
        continue;
      }
      await prisma.$executeRawUnsafe(
        "INSERT INTO schema_migrations (name, checksum, baselined) VALUES ($1, $2, true) ON CONFLICT (name) DO NOTHING",
        m.name,
        m.checksum
      );
      console.log(`baselined ${m.name}`);
    }
    return;
  }

  if (pending.length === 0) {
    console.log("Schema is up to date. No pending migrations.");
    return;
  }

  for (const m of pending) {
    if (dryRun) {
      console.log(`[dry-run] would apply ${m.name}`);
      continue;
    }

    process.stdout.write(`applying ${m.name} ... `);

    // The driver uses the extended query protocol, which permits one command per
    // statement, so the file is split and each statement is issued individually. The
    // whole file still lands atomically: it runs inside one interactive transaction.
    const statements = splitSqlStatements(m.sql);

    try {
      await prisma.$transaction(async (tx) => {
        for (const statement of statements) {
          await tx.$executeRawUnsafe(statement);
        }
        await tx.$executeRawUnsafe(
          "INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)",
          m.name,
          m.checksum
        );
      });
      console.log(`ok (${statements.length} statements)`);
    } catch (err) {
      console.log("FAILED");
      console.error(err instanceof Error ? err.message : err);
      console.error("Nothing from this migration was applied.");
      process.exit(1);
    }
  }

  console.log(`Applied ${pending.length} migration(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
