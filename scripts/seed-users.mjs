#!/usr/bin/env node
/**
 * Bulk User & Role Seeding Script for Avenue Platform.
 *
 * Provisions / upserts the standard platform roles and users into `system_users`.
 * Uses compliant scrypt password hashing so all accounts can authenticate immediately.
 *
 * Usage:
 *   node scripts/seed-users.mjs
 *   SEED_USER_PASSWORD="CustomPassword123!" node scripts/seed-users.mjs
 */

import crypto from "node:crypto";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";

const scryptAsync = promisify(crypto.scrypt);

const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const KEY_LENGTH = 64;
const MAXMEM = 64 * 1024 * 1024;

const TENANT_ID =
  process.env.NEXT_PUBLIC_AVENUE_TENANT_ID ||
  process.env.AVENUE_TENANT_ID ||
  "00000000-0000-0000-0000-000000000001";

const DEFAULT_PASSWORD = process.env.SEED_USER_PASSWORD || "Avenue@2026Admin!";

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

const USERS_TO_SEED = [
  {
    fullName: "Gate Test",
    email: "gate.1786385266532@avenuebuilders.in",
    department: "Operations",
    designation: "Site Engineer",
    role: "Site Engineer",
    siteLocation: "Nashik Corporate Office",
    status: "ACTIVE",
  },
  {
    fullName: "Self Registrant",
    email: "selfreg.1786385251235@avenuebuilders.in",
    department: "Operations",
    designation: "Site Engineer",
    role: "Site Engineer",
    siteLocation: "Nashik Corporate Office",
    status: "PENDING_APPROVAL",
  },
  {
    fullName: "Verification Engineer",
    email: "engineer.1786385250858@avenuebuilders.in",
    department: "Operations",
    designation: "Site Engineer",
    role: "Site Engineer",
    siteLocation: "Nashik Corporate Office",
    status: "ACTIVE",
  },
  {
    fullName: "Self Registrant",
    email: "selfreg.1786380210338@avenuebuilders.in",
    department: "Operations",
    designation: "Site Engineer",
    role: "Site Engineer",
    siteLocation: "Nashik Corporate Office",
    status: "PENDING_APPROVAL",
  },
  {
    fullName: "Verification Engineer",
    email: "engineer.1786380210014@avenuebuilders.in",
    department: "Operations",
    designation: "Site Engineer",
    role: "Site Engineer",
    siteLocation: "Nashik Corporate Office",
    status: "ACTIVE",
  },
  {
    fullName: "Self Registrant",
    email: "selfreg.1786379736258@avenuebuilders.in",
    department: "Operations",
    designation: "Site Engineer",
    role: "Site Engineer",
    siteLocation: "Nashik Corporate Office",
    status: "PENDING_APPROVAL",
  },
  {
    fullName: "Verification Engineer",
    email: "engineer.1786379735973@avenuebuilders.in",
    department: "Operations",
    designation: "Site Engineer",
    role: "Site Engineer",
    siteLocation: "Nashik Corporate Office",
    status: "ACTIVE",
  },
  {
    fullName: "Self Registrant",
    email: "selfreg.1786379654531@avenuebuilders.in",
    department: "Operations",
    designation: "Site Engineer",
    role: "Site Engineer",
    siteLocation: "Nashik Corporate Office",
    status: "PENDING_APPROVAL",
  },
  {
    fullName: "Verification Engineer",
    email: "engineer.1786379654252@avenuebuilders.in",
    department: "Operations",
    designation: "Site Engineer",
    role: "Site Engineer",
    siteLocation: "Nashik Corporate Office",
    status: "ACTIVE",
  },
  {
    fullName: "Audit Administrator",
    email: "audit.admin@avenuebuilders.in",
    department: "Executive Administration",
    designation: "Governance Director",
    role: "Governance Director",
    siteLocation: "Nashik Corporate Office",
    status: "ACTIVE",
  },
  {
    fullName: "Suresh Mehta",
    email: "legal.lead@avenuebuilders.in",
    department: "Compliance & Land",
    designation: "Legal Lead",
    role: "Legal Lead",
    siteLocation: "Nashik Corporate HQ",
    status: "ACTIVE",
  },
  {
    fullName: "Neha Deshmukh",
    email: "hr.lead@avenuebuilders.in",
    department: "Workforce Ops",
    designation: "HR Lead",
    role: "HR Lead",
    siteLocation: "Nashik Corporate HQ",
    status: "ACTIVE",
  },
  {
    fullName: "Vikram Patil",
    email: "site.engineer@avenuebuilders.in",
    department: "Site Operations",
    designation: "Site Engineer",
    role: "Site Engineer",
    siteLocation: "Gangapur Road Site",
    status: "ACTIVE",
  },
  {
    fullName: "Priya Kulkarni",
    email: "finance.lead@avenuebuilders.in",
    department: "Finance & Accounting",
    designation: "Finance Lead",
    role: "Finance Lead",
    siteLocation: "Nashik Corporate HQ",
    status: "ACTIVE",
  },
  {
    fullName: "ADMIN",
    email: "admin@avenuebuilders.in",
    department: "Executive Administration",
    designation: "Governance Director",
    role: "Governance Director",
    siteLocation: "Nashik Corporate Office",
    status: "ACTIVE",
  },
  {
    fullName: "Rahul Sharma",
    email: "sales.executive@avenuebuilders.in",
    department: "CRM & Sales",
    designation: "Sales Specialist",
    role: "Sales Specialist",
    siteLocation: "Nashik Sales Gallery",
    status: "ACTIVE",
  },
];

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log(`Starting bulk user provisioning for tenant ${TENANT_ID}...`);
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  let createdCount = 0;
  let updatedCount = 0;

  for (const user of USERS_TO_SEED) {
    const emailLower = user.email.toLowerCase();

    const existing = await prisma.$queryRawUnsafe(
      "SELECT id FROM system_users WHERE LOWER(email) = $1",
      emailLower
    );

    if (existing.length === 0) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO system_users (
           tenant_id, full_name, email, password_hash, department, designation,
           role, site_location, status, mfa_enabled, must_reset_password, password_changed_at, created_at, updated_at
         ) VALUES (
           $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, false, false, NOW(), NOW(), NOW()
         )`,
        TENANT_ID,
        user.fullName,
        emailLower,
        passwordHash,
        user.department,
        user.designation,
        user.role,
        user.siteLocation,
        user.status
      );
      console.log(`[CREATED] ${emailLower.padEnd(40)} | Role: ${user.role.padEnd(20)} | Status: ${user.status}`);
      createdCount++;
    } else {
      await prisma.$executeRawUnsafe(
        `UPDATE system_users
         SET full_name = $1,
             department = $2,
             designation = $3,
             role = $4,
             site_location = $5,
             status = $6,
             password_hash = $7,
             must_reset_password = false,
             updated_at = NOW()
         WHERE LOWER(email) = $8`,
        user.fullName,
        user.department,
        user.designation,
        user.role,
        user.siteLocation,
        user.status,
        passwordHash,
        emailLower
      );
      console.log(`[UPDATED] ${emailLower.padEnd(40)} | Role: ${user.role.padEnd(20)} | Status: ${user.status}`);
      updatedCount++;
    }
  }

  console.log(`\nProvisioning complete: ${createdCount} created, ${updatedCount} updated.`);
  console.log(`Default password configured: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error("Seeding error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
