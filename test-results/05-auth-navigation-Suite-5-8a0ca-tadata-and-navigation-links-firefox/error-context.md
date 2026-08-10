# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 05-auth-navigation.spec.ts >> Suite 5: Authentication, User Account Menu & Sidebar Categories >> User Overlay Menu should render live user metadata and navigation links
- Location: e2e\specs\05-auth-navigation.spec.ts:15:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-testid=\'user-profile-trigger\']')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('[data-testid=\'user-profile-trigger\']')

```

```yaml
- alert
- heading "REOS System Authentication" [level=2]
- text: Phone Number or Email
- textbox "email@rachita.com"
- text: Password
- textbox "**********"
- button "Sign In to Dashboard"
```

# Test source

```ts
  1  | import { test, expect } from "../fixtures/auth.fixture";
  2  | 
  3  | test.describe("Suite 5: Authentication, User Account Menu & Sidebar Categories", () => {
  4  |   test("Auth Page should render full-screen without sidebar framing", async ({ page }) => {
  5  |     const response = await page.goto("/login");
  6  |     expect(response?.status()).toBe(200);
  7  | 
  8  |     const sidebar = page.locator('[data-slot="sidebar"], [data-sidebar="sidebar"], aside');
  9  |     await expect(sidebar).toHaveCount(0);
  10 | 
  11 |     const submitBtn = page.locator("button[type='submit']");
  12 |     await expect(submitBtn).toBeVisible();
  13 |   });
  14 | 
  15 |   test("User Overlay Menu should render live user metadata and navigation links", async ({ authenticatedPage }) => {
  16 |     const page = await authenticatedPage("governanceDirector");
  17 |     await page.setViewportSize({ width: 1280, height: 800 });
  18 |     await page.goto("/", { waitUntil: "domcontentloaded" });
  19 | 
  20 |     const avatarButton = page.locator("[data-testid='user-profile-trigger']");
> 21 |     await expect(avatarButton).toBeVisible({ timeout: 10000 });
     |                                ^ Error: expect(locator).toBeVisible() failed
  22 |     await avatarButton.click({ force: true });
  23 | 
  24 |     const menuContent = page.locator("[role='menu']");
  25 |     await expect(menuContent).toBeVisible({ timeout: 10000 });
  26 | 
  27 |     const profileLink = page.locator("a[href='/profile']").first();
  28 |     await expect(profileLink).toBeVisible({ timeout: 5000 });
  29 | 
  30 |     const usersLink = page.locator("a[href='/users']").first();
  31 |     await expect(usersLink).toBeVisible({ timeout: 5000 });
  32 | 
  33 |     const settingsLink = page.locator("a[href='/settings']").first();
  34 |     await expect(settingsLink).toBeVisible({ timeout: 5000 });
  35 | 
  36 |     const signOutBtn = page.locator("[role='menuitem']", { hasText: "Sign out" }).first();
  37 |     await expect(signOutBtn).toBeVisible({ timeout: 5000 });
  38 |   });
  39 | 
  40 |   test("AppSidebar should display 4 structured category labels", async ({ authenticatedPage }) => {
  41 |     const page = await authenticatedPage("governanceDirector");
  42 |     await page.setViewportSize({ width: 1280, height: 800 });
  43 |     await page.goto("/", { waitUntil: "domcontentloaded" });
  44 | 
  45 |     const coreGroup = page.locator("text=CORE OPERATIONS").first();
  46 |     await expect(coreGroup).toBeVisible({ timeout: 10000 });
  47 | 
  48 |     const govGroup = page.locator("text=GOVERNANCE & STRATEGY").first();
  49 |     await expect(govGroup).toBeVisible({ timeout: 10000 });
  50 | 
  51 |     const aiGroup = page.locator("text=AI & ECOSYSTEM").first();
  52 |     await expect(aiGroup).toBeVisible({ timeout: 10000 });
  53 | 
  54 |     const sysGroup = page.locator("text=SYSTEM & IDENTITY").first();
  55 |     await expect(sysGroup).toBeVisible({ timeout: 10000 });
  56 |   });
  57 | });
  58 | 
```