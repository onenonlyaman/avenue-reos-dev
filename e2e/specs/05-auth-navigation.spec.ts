import { test, expect } from "../fixtures/auth.fixture";

test.describe("Suite 5: Authentication, User Account Menu & Sidebar Categories", () => {
  test("Auth Page should render full-screen without sidebar framing", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).toBe(200);

    const sidebar = page.locator('[data-slot="sidebar"], [data-sidebar="sidebar"], aside');
    await expect(sidebar).toHaveCount(0);

    const submitBtn = page.locator("button[type='submit']");
    await expect(submitBtn).toBeVisible();
  });

  test("User Overlay Menu should render live user metadata and navigation links", async ({ authenticatedPage }) => {
    const page = await authenticatedPage("governanceDirector");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const avatarButton = page.locator("[data-testid='user-profile-trigger']");
    await expect(avatarButton).toBeVisible({ timeout: 10000 });
    await avatarButton.click({ force: true });

    const menuContent = page.locator("[role='menu']");
    await expect(menuContent).toBeVisible({ timeout: 10000 });

    const profileLink = page.locator("a[href='/profile']").first();
    await expect(profileLink).toBeVisible({ timeout: 5000 });

    const usersLink = page.locator("a[href='/users']").first();
    await expect(usersLink).toBeVisible({ timeout: 5000 });

    const settingsLink = page.locator("a[href='/settings']").first();
    await expect(settingsLink).toBeVisible({ timeout: 5000 });

    const signOutBtn = page.locator("[role='menuitem']", { hasText: "Sign out" }).first();
    await expect(signOutBtn).toBeVisible({ timeout: 5000 });
  });

  test("AppSidebar should display 4 structured category labels", async ({ authenticatedPage }) => {
    const page = await authenticatedPage("governanceDirector");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const coreGroup = page.locator("text=CORE OPERATIONS").first();
    await expect(coreGroup).toBeVisible({ timeout: 10000 });

    const govGroup = page.locator("text=GOVERNANCE & STRATEGY").first();
    await expect(govGroup).toBeVisible({ timeout: 10000 });

    const aiGroup = page.locator("text=AI & ECOSYSTEM").first();
    await expect(aiGroup).toBeVisible({ timeout: 10000 });

    const sysGroup = page.locator("text=SYSTEM & IDENTITY").first();
    await expect(sysGroup).toBeVisible({ timeout: 10000 });
  });
});
