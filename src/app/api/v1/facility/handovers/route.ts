import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    const model = (prisma as any).unitHandover;
    let records: any[] = [];

    if (model?.findMany) {
      records = await model.findMany({
        orderBy: { createdAt: "desc" },
      });
    } else {
      try {
        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM unit_handovers WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
        `;
        records = raw || [];
      } catch {
        records = [];
      }
    }

    const mapped = records.map((r: any) => ({
      id: r.id,
      handoverReference: r.handoverReference || r.handover_reference || "",
      unitName: r.unitName || r.unit_name || "",
      buyerName: r.buyerName || r.buyer_name || "",
      desnaggingCompletionPct: Number(r.desnaggingCompletionPct ?? r.desnagging_completion_pct ?? 0),
      financialNocCleared: Boolean(r.financialNocCleared ?? r.financial_noc_cleared),
      outstandingBalance: Number(r.outstandingBalance ?? r.outstanding_balance ?? 0),
      targetHandoverDate: r.targetHandoverDate ? new Date(r.targetHandoverDate).toISOString().split("T")[0] : "",
      requiresHitl: Boolean(r.requiresHitl ?? r.requires_hitl),
      status: r.status || "READY_FOR_HANDOVER",
    }));

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: mapped,
      error: null,
      meta: { total_records: mapped.length },
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: [],
      error: {
        code: "HANDOVERS_FETCH_ERROR",
        message: err instanceof Error ? err.message : "Unit possession handovers could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { unitName, buyerName, targetHandoverDate, desnaggingCompletionPct, outstandingBalance } = body;
    const tenantId = ACTIVE_TENANT_ID;

    if (!unitName || !buyerName) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_FIELDS", message: "Unit name and buyer name are required." },
        meta: null,
      });
    }

    const balance = Number(outstandingBalance || 0);
    const desnagPct = Number(desnaggingCompletionPct || 0);
    const financialNocCleared = balance === 0;

    const requiresHitl = balance > 0 || desnagPct < 100;
    const status = requiresHitl ? "PENDING_APPROVAL" : "READY_FOR_HANDOVER";
    const ref = `HND-${Date.now().toString().slice(-6)}`;

    const model = (prisma as any).unitHandover;
    let created: any = null;

    if (model?.create) {
      created = await model.create({
        data: {
          tenantId,
          handoverReference: ref,
          unitName,
          buyerName,
          desnaggingCompletionPct: desnagPct,
          financialNocCleared,
          outstandingBalance: balance,
          targetHandoverDate: new Date(targetHandoverDate || Date.now()),
          requiresHitl,
          status,
        },
      });
    } else {
      try {
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS unit_handovers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            handover_reference VARCHAR(100) NOT NULL,
            unit_name VARCHAR(255) NOT NULL,
            buyer_name VARCHAR(255) NOT NULL,
            desnagging_completion_pct DECIMAL(5,2) NOT NULL,
            financial_noc_cleared BOOLEAN NOT NULL DEFAULT false,
            outstanding_balance DECIMAL(15,2) NOT NULL,
            target_handover_date DATE NOT NULL,
            requires_hitl BOOLEAN NOT NULL DEFAULT false,
            status VARCHAR(50) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `;
        const inserted = await prisma.$queryRaw<any[]>`
          INSERT INTO unit_handovers (
            tenant_id, handover_reference, unit_name, buyer_name,
            desnagging_completion_pct, financial_noc_cleared, outstanding_balance,
            target_handover_date, requires_hitl, status
          ) VALUES (
            ${tenantId}::uuid, ${ref}, ${unitName}, ${buyerName},
            ${desnagPct}, ${financialNocCleared}, ${balance},
            ${new Date(targetHandoverDate || Date.now())}::date, ${requiresHitl}, ${status}
          )
          RETURNING *
        `;
        created = inserted[0];
      } catch (err: unknown) {
        throw new Error(err instanceof Error ? err.message : "Possession handover could not be saved");
      }
    }

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: created.id,
        handoverReference: created.handoverReference || created.handover_reference,
        unitName: created.unitName || created.unit_name,
        buyerName: created.buyerName || created.buyer_name,
        desnaggingCompletionPct: Number(created.desnaggingCompletionPct ?? created.desnagging_completion_pct ?? desnagPct),
        financialNocCleared: Boolean(created.financialNocCleared ?? created.financial_noc_cleared ?? financialNocCleared),
        outstandingBalance: Number(created.outstandingBalance ?? created.outstanding_balance ?? balance),
        targetHandoverDate: created.targetHandoverDate ? new Date(created.targetHandoverDate).toISOString().split("T")[0] : "",
        requiresHitl: Boolean(created.requiresHitl ?? created.requires_hitl ?? requiresHitl),
        status: created.status,
      },
      error: null,
      meta: null,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "HANDOVER_CREATE_ERROR",
        message: err instanceof Error ? err.message : "Unit possession inspection could not be saved",
      },
      meta: null,
    });
  }
}



