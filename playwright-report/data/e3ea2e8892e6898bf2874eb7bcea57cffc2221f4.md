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

Locator: locator('[role=\'menu\']')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('[role=\'menu\']')

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
- text: AM Aman Bele Governance Director
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
  - text: Workflows Active Verified Account Sales Pipeline Demand ₹31.47 Cr
  - paragraph: 2 Qualified Leads
  - text: Tower Inventory Realization 48.2%
  - paragraph: 56 Units in Inventory
  - text: Committed Budget Liabilities ₹0.00 Cr
  - paragraph: Across Active Cost Centres
  - text: Automated HITL Approvals 0 Pending
  - paragraph: Awaiting Executive Authorization
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
- alert
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
  21 |     await expect(avatarButton).toBeVisible({ timeout: 10000 });
  22 |     await avatarButton.click({ force: true });
  23 | 
  24 |     const menuContent = page.locator("[role='menu']");
> 25 |     await expect(menuContent).toBeVisible({ timeout: 10000 });
     |                               ^ Error: expect(locator).toBeVisible() failed
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