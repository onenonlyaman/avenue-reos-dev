import { test, expect } from "../fixtures/auth.fixture";

test.describe("Suite 4: MCP Protocol & AI Microservices Integration", () => {
  test("MCP Protocol JSON-RPC initialize and tools list", async ({ authenticatedPage }) => {
    const page = await authenticatedPage("governanceDirector");

    const initRes = await page.request.post("/api/v1/mcp", {
      data: {
        jsonrpc: "2.0",
        id: "init-1",
        method: "initialize",
        params: {},
      },
    });

    expect(initRes.status()).toBe(200);
    const initData = await initRes.json();
    const serverName = initData.result?.serverInfo?.name || initData.serverInfo?.name || "";
    expect(serverName).toContain("Avenue");

    const listRes = await page.request.post("/api/v1/mcp", {
      data: {
        jsonrpc: "2.0",
        id: "list-1",
        method: "tools/list",
        params: {},
      },
    });

    expect(listRes.status()).toBe(200);
    const listData = await listRes.json();
    const tools = listData.result?.tools || listData.tools || [];
    expect(Array.isArray(tools)).toBe(true);
  });

  test("AI Intelligence Microservices API endpoints", async ({ authenticatedPage }) => {
    const page = await authenticatedPage("governanceDirector");

    const docsRes = await page.request.get("/api/v1/ai-intelligence/documents-legal");
    expect(docsRes.status()).toBe(200);

    const safetyRes = await page.request.get("/api/v1/ai-intelligence/construction-safety");
    expect(safetyRes.status()).toBe(200);

    const finRes = await page.request.get("/api/v1/ai-intelligence/finance-procurement");
    expect(finRes.status()).toBe(200);

    const riskRes = await page.request.get("/api/v1/ai-intelligence/risk-market");
    expect(riskRes.status()).toBe(200);
  });
});
