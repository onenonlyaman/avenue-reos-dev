import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

interface RouteCheck {
  endpoint: string;
  status: number | null;
  latencyMs: number;
  envelopeValid: boolean;
  recordCount: number | null;
  errorCode: string | null;
  note: string;
}

interface GateCheck {
  gate: string;
  endpoint: string;
  amount: number;
  threshold: number;
  intercepted: boolean;
  note: string;
}

const BASE_URL = process.env.AUDIT_BASE_URL || "http://localhost:3000";
const API_ROOT = join(process.cwd(), "src", "app", "api");
const RUN_GATE_PROBES = process.argv.includes("--gates");
const JSON_OUTPUT = process.argv.includes("--json");
const SLOW_ROUTE_MS = Number(process.env.AUDIT_SLOW_ROUTE_MS) || 1500;

function discoverGetRoutes(): string[] {
  const found: string[] = [];

  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (entry.name !== "route.ts") continue;

      const relPath = relative(API_ROOT, full).split(sep).slice(0, -1).join("/");
      if (relPath.includes("[")) continue;

      const source = readFileSync(full, "utf8");
      if (!/export async function GET/.test(source)) continue;

      found.push("/api/" + relPath);
    }
  }

  walk(API_ROOT);
  return found.sort();
}

async function checkRoute(endpoint: string): Promise<RouteCheck> {
  const started = Date.now();

  try {
    const response = await fetch(BASE_URL + endpoint, {
      headers: { "X-Audit-Probe": "system-audit" },
    });
    const latencyMs = Date.now() - started;
    const body = await response.json().catch(() => null);

    const envelopeValid =
      body !== null &&
      typeof body === "object" &&
      "success" in body &&
      "status_code" in body &&
      "timestamp" in body &&
      "data" in body;

    const recordCount = Array.isArray(body?.data) ? body.data.length : null;

    return {
      endpoint,
      status: response.status,
      latencyMs,
      envelopeValid,
      recordCount,
      errorCode: body?.error?.code || null,
      note: latencyMs > SLOW_ROUTE_MS ? "slow response" : "",
    };
  } catch (err: unknown) {
    return {
      endpoint,
      status: null,
      latencyMs: Date.now() - started,
      envelopeValid: false,
      recordCount: null,
      errorCode: "UNREACHABLE",
      note: err instanceof Error ? err.message : "request failed",
    };
  }
}

async function checkDatabase() {
  const started = Date.now();
  const response = await fetch(BASE_URL + "/api/v1/system/db-health");
  const latencyMs = Date.now() - started;
  const body = await response.json().catch(() => null);

  return {
    reachable: response.ok && Boolean(body?.success),
    latencyMs,
    tableCount: body?.data?.totalTableCount ?? null,
    queryTimeMs: body?.data?.avgQueryResponseTimeMs ?? null,
    poolActive: body?.data?.connectionPoolActive ?? null,
    poolMax: body?.data?.connectionPoolMax ?? null,
    tenantIsolationEnforced: Boolean(body?.data?.tenantIsolationEnforced),
    registersWithoutTenantScope: body?.data?.registersWithoutTenantScope ?? [],
  };
}

async function probeGates(): Promise<GateCheck[]> {
  const probes = [
    {
      gate: "Executive disbursement",
      endpoint: "/api/v1/finance/vouchers",
      threshold: 1000000,
      amount: 1500000,
      payload: {
        disbursementAmount: 1500000,
        payeeName: "SYSTEM AUDIT PROBE",
        category: "Operating Expense",
        description: "System audit gate probe",
      },
    },
    {
      gate: "Contractor running account bill",
      endpoint: "/api/v1/construction/ra-bills",
      threshold: 2500000,
      amount: 3500000,
      payload: {
        contractorName: "SYSTEM AUDIT PROBE",
        amount: 3500000,
        billAmount: 3500000,
        claimAmount: 3500000,
        totalAmount: 3500000,
        workBreakdownStructure: "System audit gate probe",
      },
    },
    {
      gate: "Land acquisition",
      endpoint: "/api/v1/legal/parcels",
      threshold: 5000000,
      amount: 7500000,
      payload: {
        parcelDescription: "SYSTEM AUDIT PROBE",
        locationZone: "System audit gate probe",
        plotAreaAcres: 1,
        applicableFsi: 1.5,
        baseLandValueAmount: 7500000,
        titleStatus: "Clear Title",
      },
    },
  ];

  const results: GateCheck[] = [];

  for (const probe of probes) {
    try {
      const response = await fetch(BASE_URL + probe.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(probe.payload),
      });
      const body = await response.json().catch(() => null);
      const intercepted = Boolean(
        body?.data?.requiresHitl ?? body?.requiresHitl ?? body?.data?.requires_hitl ?? false
      );

      results.push({
        gate: probe.gate,
        endpoint: probe.endpoint,
        amount: probe.amount,
        threshold: probe.threshold,
        intercepted,
        note: intercepted ? "" : "authorization not requested",
      });
    } catch (err: unknown) {
      results.push({
        gate: probe.gate,
        endpoint: probe.endpoint,
        amount: probe.amount,
        threshold: probe.threshold,
        intercepted: false,
        note: err instanceof Error ? err.message : "probe failed",
      });
    }
  }

  const mcpResponse = await fetch(BASE_URL + "/api/v1/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "system-audit",
      method: "tools/call",
      params: {
        name: "issue_purchase_order",
        arguments: { amount: 5000000, vendorName: "SYSTEM AUDIT PROBE", requires_hitl: true },
      },
    }),
  }).catch(() => null);

  const mcpBody = mcpResponse ? await mcpResponse.json().catch(() => null) : null;
  const mcpPayload = JSON.stringify(mcpBody || {});
  const mcpIntercepted =
    mcpPayload.includes("HITL") || mcpPayload.includes("APPROVAL") || mcpPayload.includes("PENDING");

  results.push({
    gate: "Agent tool invocation",
    endpoint: "/api/v1/mcp",
    amount: 5000000,
    threshold: 0,
    intercepted: mcpIntercepted,
    note: mcpIntercepted ? "" : "authorization not requested",
  });

  return results;
}

function formatRow(check: RouteCheck): string {
  const status = check.status === null ? "ERR" : String(check.status);
  const records = check.recordCount === null ? "-" : String(check.recordCount);
  return `${check.endpoint.padEnd(46)} ${status.padStart(4)}  ${String(check.latencyMs).padStart(6)}ms  records=${records.padStart(4)}  ${
    check.envelopeValid ? "envelope ok" : "ENVELOPE INVALID"
  }${check.errorCode ? "  " + check.errorCode : ""}${check.note ? "  " + check.note : ""}`;
}

async function main() {
  const endpoints = discoverGetRoutes();

  const routeChecks: RouteCheck[] = [];
  for (const endpoint of endpoints) {
    routeChecks.push(await checkRoute(endpoint));
  }

  const database = await checkDatabase();
  const gates = RUN_GATE_PROBES ? await probeGates() : [];

  const failed = routeChecks.filter((c) => c.status === null || c.status >= 400);
  const invalidEnvelope = routeChecks.filter((c) => c.status !== null && !c.envelopeValid);
  const errored = routeChecks.filter((c) => c.errorCode && c.errorCode !== "UNREACHABLE");
  const slow = routeChecks.filter((c) => c.latencyMs > SLOW_ROUTE_MS);
  const latencies = routeChecks.map((c) => c.latencyMs).sort((a, b) => a - b);
  const median = latencies.length ? latencies[Math.floor(latencies.length / 2)] : 0;
  const slowest = routeChecks.reduce(
    (worst, c) => (c.latencyMs > worst.latencyMs ? c : worst),
    routeChecks[0]
  );

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    routesChecked: routeChecks.length,
    routesFailed: failed.length,
    invalidEnvelopes: invalidEnvelope.length,
    routesReportingError: errored.length,
    slowRoutes: slow.length,
    medianLatencyMs: median,
    slowestRoute: slowest ? { endpoint: slowest.endpoint, latencyMs: slowest.latencyMs } : null,
    database,
    gatesProbed: gates.length,
    gatesIntercepted: gates.filter((g) => g.intercepted).length,
  };

  if (JSON_OUTPUT) {
    console.log(JSON.stringify({ summary, routeChecks, gates }, null, 2));
  } else {
    console.log("Avenue Builders REOS — System Audit");
    console.log(`Target: ${BASE_URL}`);
    console.log("");

    console.log(`Route health (${routeChecks.length} GET endpoints)`);
    for (const check of routeChecks) {
      if (check.status !== null && check.status < 400 && check.envelopeValid && !check.errorCode && !check.note) {
        continue;
      }
      console.log("  " + formatRow(check));
    }
    if (failed.length === 0 && invalidEnvelope.length === 0 && errored.length === 0 && slow.length === 0) {
      console.log("  all endpoints healthy");
    }
    console.log("");

    console.log("Data service");
    console.log(`  reachable:     ${database.reachable}`);
    console.log(`  round trip:    ${database.latencyMs}ms`);
    console.log(`  query time:    ${database.queryTimeMs ?? "-"}ms`);
    console.log(`  registers:     ${database.tableCount ?? "-"}`);
    console.log(`  connections:   ${database.poolActive ?? "-"} of ${database.poolMax ?? "-"}`);
    console.log(`  tenant scope:  ${database.tenantIsolationEnforced ? "enforced on every register" : "GAPS FOUND"}`);
    if (database.registersWithoutTenantScope.length > 0) {
      console.log(`  unscoped:      ${database.registersWithoutTenantScope.join(", ")}`);
    }
    console.log("");

    console.log("Latency");
    console.log(`  median:        ${median}ms`);
    console.log(`  slowest:       ${slowest?.endpoint} (${slowest?.latencyMs}ms)`);
    console.log("");

    if (RUN_GATE_PROBES) {
      console.log("Authorization gates");
      for (const gate of gates) {
        console.log(
          `  ${gate.gate.padEnd(36)} ${gate.intercepted ? "intercepted" : "NOT INTERCEPTED"}${
            gate.note ? "  " + gate.note : ""
          }`
        );
      }
      console.log("");
      console.log("  Gate probes write records. Remove probe rows before reporting on live data.");
    } else {
      console.log("Authorization gates skipped. Re-run with --gates to probe them (writes records).");
    }
    console.log("");

    console.log("Result");
    console.log(`  failed routes:      ${failed.length}`);
    console.log(`  invalid envelopes:  ${invalidEnvelope.length}`);
    console.log(`  routes in error:    ${errored.length}`);
    console.log(`  slow routes:        ${slow.length} (over ${SLOW_ROUTE_MS}ms)`);
  }

  if (process.env.AUDIT_REPORT_PATH) {
    writeFileSync(process.env.AUDIT_REPORT_PATH, JSON.stringify({ summary, routeChecks, gates }, null, 2));
  }

  const healthy = failed.length === 0 && invalidEnvelope.length === 0 && database.reachable;
  process.exit(healthy ? 0 : 1);
}

main();
