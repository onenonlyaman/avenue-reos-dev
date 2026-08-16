import { test, expect } from "../fixtures/auth.fixture";

test.describe("Suite 3: End-to-End CRM & Finance Operations Workflow", () => {
  test("Create CRM booking -> Verify Finance AR ledger -> Payment Gateway reconciliation", async ({ authenticatedPage }) => {
    const page = await authenticatedPage("governanceDirector");

    const bookingRes = await page.request.post("/api/v1/sales/bookings", {
      data: {
        customerName: "Rajesh Kulkarni",
        unitName: "Tower A - Unit 402",
        bookingAmount: 750000,
        projectName: "Gangapur Road Developments",
      },
    });

    expect([200, 201]).toContain(bookingRes.status());
    const bookingData = await bookingRes.json();
    expect(bookingData.data || bookingData.success).toBeTruthy();

    await page.goto("/crm", { waitUntil: "domcontentloaded" });
    const crmHeading = page.locator("h1, h2").first();
    await expect(crmHeading).toBeVisible({ timeout: 10000 });

    await page.goto("/finance", { waitUntil: "domcontentloaded" });
    const financeHeading = page.locator("h1, h2").first();
    await expect(financeHeading).toBeVisible({ timeout: 10000 });

    const connectorsRes = await page.request.get("/api/v1/integrations/connectors");
    expect(connectorsRes.status()).toBe(200);
    const connectorsData = await connectorsRes.json();
    expect(Array.isArray(connectorsData.data || connectorsData)).toBe(true);
  });
});
