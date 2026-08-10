# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 06-command-search.spec.ts >> Suite 6: Minimalist Adaptive Command Bar & Detail Drawer >> Query prefix ai: should activate AI Agent Mode and BorderGlow
- Location: e2e\specs\06-command-search.spec.ts:16:7

# Error details

```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('[data-testid=\'global-search-trigger\']') to be visible

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - heading "REOS System Authentication" [level=2] [ref=e10]
    - generic [ref=e11]:
      - generic [ref=e12]:
        - text: Phone Number or Email
        - textbox "email@rachita.com" [ref=e16]
      - generic [ref=e17]:
        - text: Password
        - textbox "**********" [ref=e22]
      - button "Sign In to Dashboard" [ref=e23] [cursor=pointer]
  - button "Open Next.js Dev Tools" [ref=e30] [cursor=pointer]
  - alert [ref=e36]
```

# Test source

```ts
  1  | import { test, expect } from "../fixtures/auth.fixture";
  2  | 
  3  | test.describe("Suite 6: Minimalist Adaptive Command Bar & Detail Drawer", () => {
  4  |   test("Global Search trigger button should open command dialog", async ({ authenticatedPage }) => {
  5  |     const page = await authenticatedPage("governanceDirector");
  6  |     await page.setViewportSize({ width: 1280, height: 800 });
  7  |     await page.goto("/", { waitUntil: "domcontentloaded" });
  8  | 
  9  |     await page.waitForSelector("[data-testid='global-search-trigger']", { timeout: 10000 });
  10 |     await page.keyboard.press("Control+k");
  11 | 
  12 |     const dialog = page.locator("[role='dialog']").first();
  13 |     await expect(dialog).toBeVisible({ timeout: 10000 });
  14 |   });
  15 | 
  16 |   test("Query prefix ai: should activate AI Agent Mode and BorderGlow", async ({ authenticatedPage }) => {
  17 |     const page = await authenticatedPage("governanceDirector");
  18 |     await page.setViewportSize({ width: 1280, height: 800 });
  19 |     await page.goto("/", { waitUntil: "domcontentloaded" });
  20 | 
> 21 |     await page.waitForSelector("[data-testid='global-search-trigger']", { timeout: 10000 });
     |                ^ TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
  22 |     await page.keyboard.press("Control+k");
  23 | 
  24 |     const input = page.locator("[role='dialog'] input").first();
  25 |     await expect(input).toBeVisible({ timeout: 10000 });
  26 |     await input.fill("ai: analyze steel price trend");
  27 | 
  28 |     const aiBadge = page.locator("text=AI AGENT MODE").first();
  29 |     await expect(aiBadge).toBeVisible({ timeout: 10000 });
  30 | 
  31 |     const glowWrapper = page.locator(".border-glow-wrapper").first();
  32 |     await expect(glowWrapper).toBeVisible({ timeout: 10000 });
  33 |   });
  34 | 
  35 |   test("Selecting a search result item should slide out SearchDetailDrawer", async ({ authenticatedPage }) => {
  36 |     const page = await authenticatedPage("governanceDirector");
  37 |     await page.setViewportSize({ width: 1280, height: 800 });
  38 |     await page.goto("/", { waitUntil: "domcontentloaded" });
  39 | 
  40 |     await page.waitForSelector("[data-testid='global-search-trigger']", { timeout: 10000 });
  41 |     await page.keyboard.press("Control+k");
  42 | 
  43 |     const dialog = page.locator("[role='dialog']").first();
  44 |     await expect(dialog).toBeVisible({ timeout: 10000 });
  45 | 
  46 |     const input = dialog.locator("input").first();
  47 |     await expect(input).toBeVisible({ timeout: 10000 });
  48 |     await input.fill("CRM");
  49 | 
  50 |     const firstResult = dialog.locator("button, [role='option'], div").filter({ hasText: /CRM|Sales|Workspace/i }).first();
  51 |     if (await firstResult.isVisible()) {
  52 |       await firstResult.click();
  53 |       const drawer = page.locator("[role='dialog'], aside, [data-state='open']").last();
  54 |       await expect(drawer).toBeVisible({ timeout: 10000 });
  55 |     }
  56 |   });
  57 | 
  58 |   test("Search API backend route /api/v1/search should return matching records", async ({ authenticatedPage }) => {
  59 |     const page = await authenticatedPage("governanceDirector");
  60 |     const response = await page.request.get("/api/v1/search?q=CRM&scope=all");
  61 | 
  62 |     expect(response.status()).toBe(200);
  63 |     const json = await response.json();
  64 |     expect(json.success || json.data).toBeTruthy();
  65 |   });
  66 | });
  67 | 
```