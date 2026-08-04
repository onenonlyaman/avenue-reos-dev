# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 06-command-search.spec.ts >> Suite 6: Minimalist Adaptive Command Bar & Detail Drawer >> Query prefix ai: should activate AI Agent Mode and BorderGlow
- Location: e2e\specs\06-command-search.spec.ts:16:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[role=\'dialog\'] input').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('[role=\'dialog\'] input').first()

```

```yaml
- link "AB Avenue Builders Real Estate Platform":
  - /url: /
- text: CORE OPERATIONS
- list:
  - listitem:
    - button "Dashboard Overview Main":
      - link "Dashboard Overview Main":
        - /url: /
  - listitem:
    - button "CRM & Sales Active":
      - link "CRM & Sales Active":
        - /url: /crm
  - listitem:
    - button "Finance & Accounting Active":
      - link "Finance & Accounting Active":
        - /url: /finance
  - listitem:
    - button "Construction & Sites Active":
      - link "Construction & Sites Active":
        - /url: /construction
  - listitem:
    - button "Procurement & Materials Active":
      - link "Procurement & Materials Active":
        - /url: /procurement
  - listitem:
    - button "Property & Facility Active":
      - link "Property & Facility Active":
        - /url: /facility
  - listitem:
    - button "HR & Payroll Active":
      - link "HR & Payroll Active":
        - /url: /hr
  - listitem:
    - button "Team Communications Active":
      - link "Team Communications Active":
        - /url: /communications
- text: GOVERNANCE & STRATEGY
- list:
  - listitem:
    - button "Land & Regulatory Legal Active":
      - link "Land & Regulatory Legal Active":
        - /url: /legal
  - listitem:
    - button "Executive Analytics Active":
      - link "Executive Analytics Active":
        - /url: /analytics
- text: AI & ECOSYSTEM
- list:
  - listitem:
    - button "AI Agent Governance MCP":
      - link "AI Agent Governance MCP":
        - /url: /mcp
  - listitem:
    - button "Domain AI Services Active":
      - link "Domain AI Services Active":
        - /url: /ai-intelligence
  - listitem:
    - button "External Integrations Active":
      - link "External Integrations Active":
        - /url: /integrations
- text: SYSTEM & IDENTITY
- list:
  - listitem:
    - button "User Directory RBAC":
      - link "User Directory RBAC":
        - /url: /users
  - listitem:
    - button "My Profile Identity":
      - link "My Profile Identity":
        - /url: /profile
  - listitem:
    - button "System Administration Active":
      - link "System Administration Active":
        - /url: /settings
  - listitem:
    - button "System Diagnostics SRE":
      - link "System Diagnostics SRE":
        - /url: /system-status
- text: AB Enterprise Account Avenue Group
- button "Sign Out"
- banner:
  - button "Toggle Sidebar"
  - separator
  - navigation "breadcrumb":
    - list:
      - listitem:
        - link "Avenue Builders":
          - /url: /
  - button "Search modules, records, AI ask... ⌘ K"
  - button
  - separator
  - button "AB"
- main:
  - text: Avenue Builders • Nashik Real Estate Operations
  - heading "Real Estate Operating Console" [level=1]
  - text: Workflows Active Verified Account Sales Pipeline Demand Tower Inventory Realization Committed Budget Liabilities Automated HITL Approvals
  - heading "Company Departments" [level=2]
  - text: 6 Active Departments Active CRM & Sales Management Real Estate Sales
  - link "Open Workspace":
    - /url: /crm
  - text: Active Finance & Accounting Financial Control
  - link "Open Workspace":
    - /url: /finance
  - text: Active Construction & Sites Site Operations
  - link "Open Workspace":
    - /url: /construction
  - text: Active Procurement & Materials Supply Chain
  - link "Open Workspace":
    - /url: /procurement-inventory
  - text: Active HR & Payroll Staffing & Payroll
  - link "Open Workspace":
    - /url: /hr-payroll
  - text: Active Team Communications Team Messaging
  - link "Open Workspace":
    - /url: /communications
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
  21 |     await page.waitForSelector("[data-testid='global-search-trigger']", { timeout: 10000 });
  22 |     await page.keyboard.press("Control+k");
  23 | 
  24 |     const input = page.locator("[role='dialog'] input").first();
> 25 |     await expect(input).toBeVisible({ timeout: 10000 });
     |                         ^ Error: expect(locator).toBeVisible() failed
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