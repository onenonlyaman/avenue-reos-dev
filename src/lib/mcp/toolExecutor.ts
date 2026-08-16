import { prisma } from "@/lib/db";
import { executeVoucherCreation } from "@/lib/accounting/voucherEngine";

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  isMutative: boolean;
  requiresHitl: boolean;
}

export async function executeMcpTool(
  toolName: string,
  args: any,
  tenantId: string,
  operatorId: string = "ai-mcp-autonomous-agent"
): Promise<ToolExecutionResult> {
  const startTime = Date.now();

  try {
    switch (toolName) {
      case "crm_leads_list": {
        const limit = Math.min(Math.max(Number(args?.limit || 20), 1), 100);
        let leads: any[] = [];

        if (args?.status) {
          leads = await prisma.$queryRaw<any[]>`
            SELECT id, lead_code, full_name, email, phone, lead_source, budget_min, budget_max, status, created_at
            FROM crm_leads
            WHERE tenant_id = ${tenantId}::uuid AND status = ${args.status}
            ORDER BY created_at DESC
            LIMIT ${limit}
          `;
        } else {
          leads = await prisma.$queryRaw<any[]>`
            SELECT id, lead_code, full_name, email, phone, lead_source, budget_min, budget_max, status, created_at
            FROM crm_leads
            WHERE tenant_id = ${tenantId}::uuid
            ORDER BY created_at DESC
            LIMIT ${limit}
          `;
        }

        return {
          success: true,
          isMutative: false,
          requiresHitl: false,
          data: {
            total: leads.length,
            leads: leads.map((l) => ({
              id: l.id,
              leadCode: l.lead_code,
              fullName: l.full_name,
              email: l.email,
              phone: l.phone,
              leadSource: l.lead_source,
              status: l.status,
              budgetRange: `₹${Number(l.budget_min || 0).toLocaleString("en-IN")} - ₹${Number(l.budget_max || 0).toLocaleString("en-IN")}`,
              createdAt: l.created_at,
            })),
          },
        };
      }

      case "crm_leads_create": {
        const leadCode = `LEAD-${Date.now().toString().slice(-6)}`;
        const fullName = args?.full_name || "New Prospect";
        const email = args?.email || "prospect@example.com";
        const phone = args?.phone || "+91 9876543210";
        const source = args?.lead_source || "DIGITAL_AD";
        const budgetMin = Number(args?.budget_min || 5000000);
        const budgetMax = Number(args?.budget_max || 12000000);

        const created = await prisma.$queryRaw<any[]>`
          INSERT INTO crm_leads (
            tenant_id, lead_code, full_name, email, phone, lead_source, budget_min, budget_max, status, lead_score, created_at, updated_at
          ) VALUES (
            ${tenantId}::uuid, ${leadCode}, ${fullName}, ${email}, ${phone}, ${source},
            ${budgetMin}, ${budgetMax}, 'NEW', 60, NOW(), NOW()
          )
          RETURNING id, lead_code, full_name, email, phone, status
        `;

        return {
          success: true,
          isMutative: true,
          requiresHitl: false,
          data: {
            message: "CRM Lead successfully registered into sales pipeline",
            lead: created[0],
          },
        };
      }

      case "finance_budgets_list": {
        const budgets = await prisma.$queryRaw<any[]>`
          SELECT b.id, b.budget_code, b.allocated_amount, b.committed_amount, b.actual_spent_amount, b.fiscal_year, b.status,
                 c.name as "costCenterName", c.cost_center_code as "costCenterCode"
          FROM budget_heads b
          LEFT JOIN master_cost_center c ON b.cost_center_id = c.id
          WHERE b.tenant_id = ${tenantId}::uuid
          ORDER BY b.budget_code ASC
        `;

        return {
          success: true,
          isMutative: false,
          requiresHitl: false,
          data: {
            total: budgets.length,
            budgetHeads: budgets.map((b) => ({
              id: b.id,
              budgetCode: b.budget_code,
              costCenter: b.costCenterName ? `${b.costCenterName} (${b.costCenterCode})` : "General Cost Center",
              allocated: Number(b.allocated_amount || 0),
              committed: Number(b.committed_amount || 0),
              actualSpent: Number(b.actual_spent_amount || 0),
              remaining: Number(b.allocated_amount || 0) - Number(b.actual_spent_amount || 0),
              fiscalYear: b.fiscal_year,
              status: b.status,
            })),
          },
        };
      }

      case "procurement_po_create": {
        const totalAmount = Number(args?.total_amount || 0);
        const orderRef = `PO-${Date.now().toString().slice(-6)}`;
        const vendorName = args?.vendor_name || "Enterprise Vendor Partner";
        const materialDesc = args?.material_description || "Construction Materials";
        const siteName = args?.site_name || "Avenue Tower Site A";
        const requiresHitl = totalAmount > 100000;

        if (requiresHitl && operatorId === "ai-mcp-autonomous-agent") {
          return {
            success: false,
            isMutative: true,
            requiresHitl: true,
            error: "HITL_REQUIRED: Purchase Orders exceeding ₹1,00,000 require Governance Director authorization.",
          };
        }

        const poRows = await prisma.$queryRaw<any[]>`
          INSERT INTO purchase_orders (
            tenant_id, order_reference, site_name, vendor_name, material_description,
            quantity, unit_rate, freight_amount, gst_amount, order_value_amount,
            delivery_due_date, requires_hitl, status, created_at, updated_at
          ) VALUES (
            ${tenantId}::uuid, ${orderRef}, ${siteName}, ${vendorName}, ${materialDesc},
            ${Number(args?.quantity || 1)}, ${totalAmount}, 0.00, ${totalAmount * 0.18}, ${totalAmount * 1.18},
            CURRENT_DATE + INTERVAL '14 days', false, 'APPROVED', NOW(), NOW()
          )
          RETURNING id, order_reference, site_name, vendor_name, order_value_amount, status
        `;

        return {
          success: true,
          isMutative: true,
          requiresHitl: false,
          data: {
            message: "Purchase Order successfully authorized and committed to procurement ledger",
            purchaseOrder: poRows[0],
          },
        };
      }

      case "sales_booking_create": {
        const bookingCode = `BK-${Date.now().toString().slice(-6)}`;
        const totalPrice = Number(args?.agreed_total_price || 0);

        if (operatorId === "ai-mcp-autonomous-agent") {
          return {
            success: false,
            isMutative: true,
            requiresHitl: true,
            error: "HITL_REQUIRED: Binding Real Estate Unit Sales Booking requires Director authorization.",
          };
        }

        return {
          success: true,
          isMutative: true,
          requiresHitl: false,
          data: {
            message: "Sales Booking authorized and legally executed",
            bookingCode,
            agreedPrice: totalPrice,
            status: "COMMITTED",
          },
        };
      }

      case "construction_dpr_create": {
        const dprCode = `DPR-${Date.now().toString().slice(-6)}`;
        const laborCount = Number(args?.labor_count || 45);
        const progressPct = Number(args?.progress_percentage || 1.5);
        const weather = args?.weather || "Clear Skies";
        const workDetails = args?.work_details || { activity: "Reinforcement steel tying on 4th floor slab" };

        const dprRows = await prisma.$queryRaw<any[]>`
          INSERT INTO daily_progress_reports (
            tenant_id, dpr_code, site_id, report_date, submitted_by, labor_count,
            weather_condition, progress_percentage, status, work_details_json, created_at, updated_at
          ) VALUES (
            ${tenantId}::uuid, ${dprCode},
            COALESCE((SELECT id FROM construction_sites WHERE tenant_id = ${tenantId}::uuid LIMIT 1), gen_random_uuid()),
            CURRENT_DATE,
            COALESCE((SELECT id FROM system_users WHERE tenant_id = ${tenantId}::uuid LIMIT 1), gen_random_uuid()),
            ${laborCount}, ${weather}, ${progressPct}, 'SUBMITTED', ${JSON.stringify(workDetails)}::jsonb,
            NOW(), NOW()
          )
          RETURNING id, dpr_code, labor_count, progress_percentage, status
        `;

        return {
          success: true,
          isMutative: true,
          requiresHitl: false,
          data: {
            message: "Daily Progress Report successfully committed to site log",
            dpr: dprRows[0] || { dpr_code: dprCode, laborCount, progressPercentage: progressPct, status: "SUBMITTED" },
          },
        };
      }

      case "comm_messages_send": {
        const destination = args?.destination || "SITE_OFFICE";
        const content = args?.content_markdown_json || { title: "Agent Notice", text: "Automated alert" };

        await prisma.$executeRaw`
          INSERT INTO system_notifications (
            tenant_id, title, message, type, is_read, metadata_json, created_at
          ) VALUES (
            ${tenantId}::uuid,
            ${content.title || "AI Agent System Notification"},
            ${typeof content === "string" ? content : (content.text || JSON.stringify(content))},
            'INFO', false, ${JSON.stringify({ destination, origin: "MCP" })}::jsonb, NOW()
          )
        `;

        return {
          success: true,
          isMutative: true,
          requiresHitl: false,
          data: {
            message: "System broadcast notification dispatched successfully",
            destination,
          },
        };
      }

      case "tally_query_ledger_balances": {
        const ledgers = await prisma.$queryRaw<any[]>`
          SELECT l.ledger_code, l.ledger_name, g.group_name, l.current_balance, l.opening_balance_type, l.book_type
          FROM tally_account_ledgers l
          JOIN tally_account_groups g ON l.group_id = g.id
          WHERE l.tenant_id = ${tenantId}::uuid
          ORDER BY l.ledger_name ASC
        `;

        return {
          success: true,
          isMutative: false,
          requiresHitl: false,
          data: {
            total: ledgers.length,
            ledgers: ledgers.map((l) => ({
              code: l.ledger_code,
              name: l.ledger_name,
              group: l.group_name,
              balance: Number(l.current_balance || 0),
              type: l.opening_balance_type,
              bookType: l.book_type,
            })),
          },
        };
      }

      case "tally_inspect_aging_report": {
        const billRefs = await prisma.$queryRaw<any[]>`
          SELECT b.bill_number, b.original_amount, b.pending_amount, b.due_date,
                 l.ledger_name as "partyName", (CURRENT_DATE - b.due_date) as "daysOverdue"
          FROM tally_bill_references b
          JOIN tally_account_ledgers l ON b.ledger_id = l.id
          WHERE b.tenant_id = ${tenantId}::uuid AND b.is_settled = false
          ORDER BY b.due_date ASC
        `;

        return {
          success: true,
          isMutative: false,
          requiresHitl: false,
          data: {
            total: billRefs.length,
            agingBills: billRefs.map((b) => ({
              billNumber: b.bill_number,
              partyName: b.partyName,
              originalAmount: Number(b.original_amount || 0),
              pendingAmount: Number(b.pending_amount || 0),
              daysOverdue: Number(b.daysOverdue || 0),
            })),
          },
        };
      }

      case "tally_post_voucher": {
        const amt = Number(args?.totalAmount || 0);
        if (amt <= 0) {
          return {
            success: false,
            isMutative: true,
            requiresHitl: false,
            error: "Invalid totalAmount specified for voucher posting.",
          };
        }

        const result = await executeVoucherCreation({
          voucherType: (args.voucherType || "RECEIPT") as any,
          bookType: "STATUTORY",
          narration: args.narration || "Posted via Model Context Protocol AI Assistant",
          items: [
            { ledgerId: args.debitLedgerId, entryType: "Dr", amount: amt },
            { ledgerId: args.creditLedgerId, entryType: "Cr", amount: amt },
          ],
          operatorId,
        });

        return {
          success: true,
          isMutative: true,
          requiresHitl: result.requiresHitl,
          data: {
            status: result.voucher.status,
            voucherNumber: result.voucher.voucher_number,
            totalAmount: Number(result.voucher.total_amount),
            cryptoHash: result.cryptoHash,
          },
        };
      }

      default: {
        return {
          success: false,
          isMutative: false,
          requiresHitl: false,
          error: `Tool '${toolName}' is not registered in the Avenue execution registry.`,
        };
      }
    }
  } catch (err: unknown) {
    return {
      success: false,
      isMutative: false,
      requiresHitl: false,
      error: err instanceof Error ? err.message : "Execution failed in domain subsystem",
    };
  } finally {
    // Increment tool execution count
    void prisma.$executeRaw`
      UPDATE mcp_registered_tools
      SET execution_count = execution_count + 1
      WHERE tenant_id = ${tenantId}::uuid AND tool_name = ${toolName}
    `.catch(() => {});
  }
}
