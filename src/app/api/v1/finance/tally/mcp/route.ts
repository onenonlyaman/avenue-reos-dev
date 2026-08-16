import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";
import { ensureAccountingSchema } from "@/lib/accounting/ensureAccountingSchema";
import { executeVoucherCreation } from "@/lib/accounting/voucherEngine";

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureAccountingSchema();
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
              description: "Inspect Chart of Accounts current balances and group details",
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
                  narration: { type: "string" },
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
        const ledgers = await prisma.$queryRaw<any[]>`
          SELECT l.ledger_code, l.ledger_name, g.group_name, l.current_balance, l.opening_balance_type, l.book_type
          FROM tally_account_ledgers l
          JOIN tally_account_groups g ON l.group_id = g.id
          WHERE l.tenant_id = ${tenantId}::uuid
          ORDER BY l.ledger_name ASC;
        `;

        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  ledgers.map((l) => ({
                    code: l.ledger_code,
                    name: l.ledger_name,
                    group: l.group_name,
                    balance: Number(l.current_balance),
                    type: l.opening_balance_type,
                    bookType: l.book_type,
                  }))
                ),
              },
            ],
          },
          id,
        });
      }

      if (name === "tally_inspect_aging_report") {
        const billRefs = await prisma.$queryRaw<any[]>`
          SELECT b.bill_number, b.original_amount, b.pending_amount, b.due_date,
                 l.ledger_name as "partyName", (CURRENT_DATE - b.due_date) as "daysOverdue"
          FROM tally_bill_references b
          JOIN tally_account_ledgers l ON b.ledger_id = l.id
          WHERE b.tenant_id = ${tenantId}::uuid AND b.is_settled = false
          ORDER BY b.due_date ASC;
        `;

        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  billRefs.map((b) => ({
                    billNumber: b.bill_number,
                    partyName: b.partyName,
                    amount: Number(b.original_amount),
                    pendingAmount: Number(b.pending_amount),
                    daysOverdue: Number(b.daysOverdue || 0),
                  }))
                ),
              },
            ],
          },
          id,
        });
      }

      if (name === "tally_post_voucher") {
        const amt = Number(args?.totalAmount || 0);
        if (amt <= 0) {
          return NextResponse.json({
            jsonrpc: "2.0",
            error: { code: -32602, message: "Invalid amount specified for voucher posting" },
            id,
          });
        }

        const result = await executeVoucherCreation({
          voucherType: (args.voucherType || "RECEIPT") as any,
          bookType: "STATUTORY",
          narration: args.narration || "Posted via Model Context Protocol AI Assistant",
          items: [
            { ledgerId: args.debitLedgerId, entryType: "Dr", amount: amt },
            { ledgerId: args.creditLedgerId, entryType: "Cr", amount: amt },
          ],
          operatorId: "ai-mcp-autonomous-agent",
        });

        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  status: result.voucher.status,
                  voucherNumber: result.voucher.voucher_number,
                  totalAmount: Number(result.voucher.total_amount),
                  cryptoHash: result.cryptoHash,
                  requiresHitl: result.requiresHitl,
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
      error: { code: -32603, message: safeErrorMessage(err, "Internal JSON-RPC Error") },
      id: null,
    });
  }
}
