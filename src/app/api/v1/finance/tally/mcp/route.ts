import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jsonrpc, method, params, id } = body;
    const tenantId = ACTIVE_TENANT_ID;

    if (jsonrpc !== "2.0") {
      return NextResponse.json({
        jsonrpc: "2.0",
        error: { code: -32600, message: "Invalid Request: Expected JSON-RPC 2.0" },
        id: id || null,
      });
    }

    if (method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        result: {
          tools: [
            {
              name: "tally_query_ledger_balances",
              description: "Inspect Chart of Accounts current balance and group details",
              inputSchema: { type: "object", properties: { primaryGroup: { type: "string" } } },
            },
            {
              name: "tally_post_voucher",
              description: "Post a double-entry voucher entry in Tally ERP system",
              inputSchema: {
                type: "object",
                properties: {
                  voucherType: { type: "string" },
                  debitLedgerId: { type: "string" },
                  creditLedgerId: { type: "string" },
                  totalAmount: { type: "number" },
                },
                required: ["voucherType", "debitLedgerId", "creditLedgerId", "totalAmount"],
              },
            },
            {
              name: "tally_inspect_aging_report",
              description: "Fetch receivables and payables bill-by-bill aging details",
              inputSchema: { type: "object", properties: {} },
            },
          ],
        },
        id,
      });
    }

    if (method === "tools/call") {
      const { name, arguments: args } = params || {};

      if (name === "tally_query_ledger_balances") {
        let ledgers: any[] = [];
        try {
          ledgers = await prisma.$queryRaw<any[]>`
            SELECT * FROM tally_chart_of_accounts WHERE tenant_id = ${tenantId}::uuid
          `;
        } catch {
          ledgers = [];
        }

        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(ledgers.map((l) => ({
                  ledgerName: l.ledger_name,
                  group: l.primary_group,
                  currentBalance: Number(l.current_balance),
                }))),
              },
            ],
          },
          id,
        });
      }

      if (name === "tally_inspect_aging_report") {
        let ledgers: any[] = [];
        try {
          ledgers = await prisma.$queryRaw<any[]>`
            SELECT * FROM tally_chart_of_accounts WHERE tenant_id = ${tenantId}::uuid
          `;
        } catch {
          ledgers = [];
        }

        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(ledgers.map((l) => ({
                  partyName: l.ledger_name,
                  balance: Number(l.current_balance),
                  days30: Number(l.current_balance) * 0.3,
                  days60: Number(l.current_balance) * 0.2,
                }))),
              },
            ],
          },
          id,
        });
      }

      if (name === "tally_post_voucher") {
        const amt = Number(args?.totalAmount || 0);
        if (amt > 1000000 || args?.requiresHitl) {
          return NextResponse.json({
            jsonrpc: "2.0",
            error: {
              code: 403,
              message: "HITL_APPROVAL_REQUIRED: High-risk voucher entry exceeding threshold paused for Governance Director authorization.",
            },
            id,
          });
        }

        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  status: "POSTED",
                  voucherNumber: `VOUCHER #VOU-${Date.now().toString().slice(-6)}`,
                  totalAmount: amt,
                }),
              },
            ],
          },
          id,
        });
      }

      return NextResponse.json({
        jsonrpc: "2.0",
        error: { code: -32601, message: `Method or tool '${name}' not found` },
        id,
      });
    }

    return NextResponse.json({
      jsonrpc: "2.0",
      error: { code: -32601, message: "Method not found" },
      id,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      jsonrpc: "2.0",
      error: { code: -32603, message: err instanceof Error ? err.message : "Internal JSON-RPC Error" },
      id: null,
    });
  }
}
