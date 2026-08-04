import { test as base, expect } from "./auth.fixture";

type GovernanceFixtures = {
  assertHitlDrawerOpen: (page: any) => Promise<void>;
  authorizeHitlAction: (page: any) => Promise<void>;
};

export const testGovernance = base.extend<GovernanceFixtures>({
  assertHitlDrawerOpen: async ({}, use) => {
    await use(async (page: any) => {
      const drawerHeader = page.locator("text=Governance Director");
      await expect(drawerHeader).toBeVisible({ timeout: 10000 });
    });
  },

  authorizeHitlAction: async ({}, use) => {
    await use(async (page: any) => {
      const authBtn = page.locator("button", { hasText: "Authorize" }).first();
      if (await authBtn.isVisible()) {
        await authBtn.click();
      }
    });
  },
});

export { expect };
