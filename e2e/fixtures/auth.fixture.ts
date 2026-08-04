import { test as base } from "@playwright/test";

export interface PersonaUser {
  name: string;
  role: "Governance Director" | "Site Engineer" | "Finance Lead";
  tenantId: string;
}

export const personas: Record<string, PersonaUser> = {
  governanceDirector: {
    name: "Avenue Governance Director",
    role: "Governance Director",
    tenantId: "00000000-0000-0000-0000-000000000001",
  },
  siteEngineer: {
    name: "Nashik Site Engineer",
    role: "Site Engineer",
    tenantId: "00000000-0000-0000-0000-000000000001",
  },
  financeLead: {
    name: "Corporate Finance Lead",
    role: "Finance Lead",
    tenantId: "00000000-0000-0000-0000-000000000001",
  },
};

type AuthFixtures = {
  authenticatedPage: (personaKey?: keyof typeof personas) => Promise<any>;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page, context }, use) => {
    const authFn = async (personaKey: keyof typeof personas = "governanceDirector") => {
      const persona = personas[personaKey];
      const sessionPayload = {
        userId: "00000000-0000-0000-0000-000000000001",
        email: "aman.bele@avenuebuilders.in",
        fullName: persona.name,
        role: persona.role,
        department: "Executive Administration",
        tenantId: persona.tenantId,
      };

      await context.addCookies([
        {
          name: "avenue_session",
          value: encodeURIComponent(JSON.stringify(sessionPayload)),
          domain: "localhost",
          path: "/",
          httpOnly: false,
          secure: false,
          sameSite: "Lax",
        },
      ]);

      await page.setExtraHTTPHeaders({
        "X-Tenant-ID": persona.tenantId,
        "X-User-Role": persona.role,
        "X-User-Name": persona.name,
      });

      return page;
    };
    await use(authFn);
  },
});

export { expect } from "@playwright/test";
