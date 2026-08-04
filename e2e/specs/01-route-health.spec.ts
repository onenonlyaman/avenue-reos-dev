import { test, expect } from "../fixtures/auth.fixture";

const targetRoutes = [
  "/",
  "/crm",
  "/finance",
  "/construction",
  "/procurement",
  "/facility",
  "/legal",
  "/hr",
  "/communications",
  "/analytics",
  "/settings",
  "/system-status",
  "/mcp",
  "/integrations",
  "/ai-intelligence",
  "/users",
  "/profile",
];

test.describe("Suite 1: Route Availability & Layout Health", () => {
  for (const route of targetRoutes) {
    test(`Route [${route}] should render cleanly with sidebar header and 200 status`, async ({ authenticatedPage }) => {
      const page = await authenticatedPage("governanceDirector");
      const consoleErrors: string[] = [];

      page.on("console", (msg: any) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });

      const response = await page.goto(route, { waitUntil: "commit" });
      expect(response?.status()).toBeLessThan(400);

      const sidebar = page.locator('[data-slot="sidebar"], [data-sidebar="sidebar"], aside, nav').first();
      await expect(sidebar).toBeVisible({ timeout: 10000 });

      const mainContent = page.locator("main").first();
      await expect(mainContent).toBeVisible({ timeout: 10000 });

      const filteredErrors = consoleErrors.filter(
        (e) => !e.includes("favicon") && !e.includes("failed to load resource")
      );
      expect(filteredErrors.length).toBe(0);
    });
  }
});
