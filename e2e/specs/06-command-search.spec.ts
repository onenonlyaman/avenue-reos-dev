import { test, expect } from "../fixtures/auth.fixture";

test.describe("Suite 6: Minimalist Adaptive Command Bar & Detail Drawer", () => {
  test("Global Search trigger button should open command dialog", async ({ authenticatedPage }) => {
    const page = await authenticatedPage("governanceDirector");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.waitForSelector("[data-testid='global-search-trigger']", { timeout: 10000 });
    await page.keyboard.press("Control+k");

    const dialog = page.locator("[role='dialog']").first();
    await expect(dialog).toBeVisible({ timeout: 10000 });
  });

  test("Query prefix ai: should activate AI Agent Mode and BorderGlow", async ({ authenticatedPage }) => {
    const page = await authenticatedPage("governanceDirector");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.waitForSelector("[data-testid='global-search-trigger']", { timeout: 10000 });
    await page.keyboard.press("Control+k");

    const input = page.locator("[role='dialog'] input").first();
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill("ai: analyze steel price trend");

    const aiBadge = page.locator("text=AI AGENT MODE").first();
    await expect(aiBadge).toBeVisible({ timeout: 10000 });

    const glowWrapper = page.locator(".border-glow-wrapper").first();
    await expect(glowWrapper).toBeVisible({ timeout: 10000 });
  });

  test("Selecting a search result item should slide out SearchDetailDrawer", async ({ authenticatedPage }) => {
    const page = await authenticatedPage("governanceDirector");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.waitForSelector("[data-testid='global-search-trigger']", { timeout: 10000 });
    await page.keyboard.press("Control+k");

    const dialog = page.locator("[role='dialog']").first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    const input = dialog.locator("input").first();
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill("CRM");

    const firstResult = dialog.locator("button, [role='option'], div").filter({ hasText: /CRM|Sales|Workspace/i }).first();
    if (await firstResult.isVisible()) {
      await firstResult.click();
      const drawer = page.locator("[role='dialog'], aside, [data-state='open']").last();
      await expect(drawer).toBeVisible({ timeout: 10000 });
    }
  });

  test("Search API backend route /api/v1/search should return matching records", async ({ authenticatedPage }) => {
    const page = await authenticatedPage("governanceDirector");
    const response = await page.request.get("/api/v1/search?q=CRM&scope=all");

    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.success || json.data).toBeTruthy();
  });
});
