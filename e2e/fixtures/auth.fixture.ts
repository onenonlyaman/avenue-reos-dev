import { test as base } from "@playwright/test";
import { createHmac, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SESSION_SECRET =
  process.env.SESSION_SECRET || "development-only-session_secret-do-not-use-in-production";

function fingerprint(token: string): string {
  return createHmac("sha256", SESSION_SECRET).update(token).digest("hex");
}

export interface PersonaUser {
  email: string;
  name: string;
  role: "Governance Director" | "Site Engineer" | "Finance Lead";
  tenantId: string;
}

export const personas: Record<string, PersonaUser> = {
  governanceDirector: {
    email: "aman.bele@avenuebuilders.in",
    name: "Aman Bele",
    role: "Governance Director",
    tenantId: "00000000-0000-0000-0000-000000000001",
  },
  siteEngineer: {
    email: "site.engineer@avenuebuilders.in",
    name: "Nashik Site Engineer",
    role: "Site Engineer",
    tenantId: "00000000-0000-0000-0000-000000000001",
  },
  financeLead: {
    email: "finance.lead@avenuebuilders.in",
    name: "Corporate Finance Lead",
    role: "Finance Lead",
    tenantId: "00000000-0000-0000-0000-000000000001",
  },
};

const personaTokens: Record<string, string> = {};

async function ensurePersonaSession(personaKey: keyof typeof personas): Promise<string> {
  if (personaTokens[personaKey]) return personaTokens[personaKey];

  const persona = personas[personaKey];
  const users = await prisma.$queryRaw<Array<{ id: string; tenant_id: string }>>`
    SELECT id, tenant_id FROM system_users WHERE email = ${persona.email} LIMIT 1
  `;

  let userId: string;
  let tenantId = persona.tenantId;

  if (users.length > 0) {
    userId = users[0].id;
    tenantId = users[0].tenant_id;
  } else {
    const created = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO system_users (
        tenant_id, full_name, email, password_hash, department, designation, site_location, status, role
      ) VALUES (
        ${tenantId}::uuid, ${persona.name}, ${persona.email}, 'test', 'Operations', 'Lead', 'Nashik', 'ACTIVE', ${persona.role}
      )
      RETURNING id
    `;
    userId = created[0].id;
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = fingerprint(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const absoluteExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.$executeRaw`
    INSERT INTO system_sessions (
      user_id, tenant_id, token_hash, expires_at, absolute_expires_at, user_agent, ip_address
    ) VALUES (
      ${userId}::uuid, ${tenantId}::uuid, ${tokenHash}, ${expiresAt}, ${absoluteExpiresAt}, 'Playwright-Test', '127.0.0.1'
    )
  `;

  personaTokens[personaKey] = token;
  return token;
}

type AuthFixtures = {
  authenticatedPage: (personaKey?: keyof typeof personas) => Promise<any>;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page, context }, use) => {
    const authFn = async (personaKey: keyof typeof personas = "governanceDirector") => {
      const persona = personas[personaKey];
      const token = await ensurePersonaSession(personaKey);

      await context.addCookies([
        {
          name: "avenue_session",
          value: token,
          domain: "localhost",
          path: "/",
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ]);

      await page.setExtraHTTPHeaders({
        "X-Tenant-ID": persona.tenantId,
        "X-User-Role": persona.role,
        "X-User-Name": persona.name,
        Cookie: `avenue_session=${token}`,
      });

      return page;
    };
    await use(authFn);
  },
});

export { expect } from "@playwright/test";
