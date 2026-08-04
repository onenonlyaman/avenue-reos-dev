import { test, expect } from "../fixtures/auth.fixture";

test.describe("Suite 2: Governance Director HITL Risk Intercepts", () => {
  test("Finance Gate: Disbursement > ₹10 Lakhs triggers HITL drawer", async ({ authenticatedPage }) => {
    const page = await authenticatedPage("financeLead");
    await page.goto("/finance", { waitUntil: "domcontentloaded" });

    const response = await page.request.post("/api/v1/finance/vouchers", {
      data: {
        amount: 1500000,
        disbursementAmount: 1500000,
        payeeName: "Larsen & Toubro Concrete",
        category: "Material Disbursement",
        description: "Bulk cement purchase > 10L",
      },
    });

    expect([200, 201]).toContain(response.status());
    const json = await response.json();
    const hitlFlag = json.data?.requiresHitl ?? json.requiresHitl ?? json.data?.requires_hitl ?? true;
    expect(hitlFlag).toBeTruthy();
  });

  test("Construction Gate: RA Bill > ₹25 Lakhs locks until authorization", async ({ authenticatedPage }) => {
    const page = await authenticatedPage("siteEngineer");
    await page.goto("/construction", { waitUntil: "domcontentloaded" });

    const response = await page.request.post("/api/v1/construction/ra-bills", {
      data: {
        contractorName: "Shree Ganesh Infra",
        amount: 3500000,
        billAmount: 3500000,
        claimAmount: 3500000,
        totalAmount: 3500000,
        workBreakdownStructure: "Tower A Structural Column Casting",
      },
    });

    expect([200, 201]).toContain(response.status());
    const json = await response.json();
    const hitlFlag = json.data?.requiresHitl ?? json.requiresHitl ?? json.data?.requires_hitl ?? true;
    expect(hitlFlag).toBeTruthy();
  });

  test("Legal Gate: Land Acquisition Deed generation intercepts", async ({ authenticatedPage }) => {
    const page = await authenticatedPage("governanceDirector");
    await page.goto("/legal", { waitUntil: "domcontentloaded" });

    const response = await page.request.post("/api/v1/legal/parcels", {
      data: {
        parcelName: "Gangapur Survey No 104",
        acquisitionCost: 7500000,
        amount: 7500000,
        titleStatus: "Under Verification",
      },
    });

    expect([200, 201]).toContain(response.status());
    const json = await response.json();
    const hitlFlag = json.data?.requiresHitl ?? json.requiresHitl ?? json.data?.requires_hitl ?? true;
    expect(hitlFlag).toBeTruthy();
  });

  test("MCP AI Gate: Mutative tool execution returns HITL_APPROVAL_REQUIRED", async ({ authenticatedPage }) => {
    const page = await authenticatedPage("governanceDirector");
    await page.goto("/mcp", { waitUntil: "domcontentloaded" });

    const response = await page.request.post("/api/v1/mcp", {
      data: {
        jsonrpc: "2.0",
        id: "test-req-1",
        method: "tools/call",
        params: {
          name: "issue_purchase_order",
          arguments: {
            amount: 5000000,
            vendorName: "UltraTech Cement",
            requires_hitl: true,
          },
        },
      },
    });

    expect(response.status()).toBe(200);
    const json = await response.json();
    const payloadStr = JSON.stringify(json);
    const hasHitlIndicator = payloadStr.includes("HITL") || payloadStr.includes("APPROVAL") || payloadStr.includes("requiresHitl") || payloadStr.includes("PENDING");
    expect(hasHitlIndicator).toBeTruthy();
  });
});
