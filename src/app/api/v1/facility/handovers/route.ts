import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const records = await prisma.unitHandover.findMany({
      where: { tenantId: ACTIVE_TENANT_ID },
      orderBy: { createdAt: "desc" },
    });

    const mapped = records.map((r) => ({
      id: r.id,
      handoverReference: r.handoverReference,
      unitName: r.unitName,
      buyerName: r.buyerName,
      desnaggingCompletionPct: Number(r.desnaggingCompletionPct),
      financialNocCleared: r.financialNocCleared,
      outstandingBalance: Number(r.outstandingBalance),
      targetHandoverDate: r.targetHandoverDate ? new Date(r.targetHandoverDate).toISOString().split("T")[0] : "",
      requiresHitl: r.requiresHitl,
      status: r.status,
      rejectionReason: r.rejectionReason || null,
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
    return NextResponse.json(
      {
        success: false,
        status_code: 500,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: [],
        error: {
          code: "HANDOVERS_FETCH_ERROR",
          message: safeErrorMessage(err, "Unit possession handovers could not be loaded"),
        },
        meta: { total_records: 0 },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { unitName, buyerName, targetHandoverDate, desnaggingCompletionPct, outstandingBalance } = body;
    const tenantId = ACTIVE_TENANT_ID;

    if (!unitName || !buyerName) {
      return NextResponse.json(
        {
          success: false,
          status_code: 400,
          timestamp: new Date().toISOString(),
          request_id: `req-${Date.now()}`,
          data: null,
          error: { code: "MISSING_FIELDS", message: "Unit name and buyer name are required." },
          meta: null,
        },
        { status: 400 }
      );
    }

    const rawBalance = Number(outstandingBalance);
    const balance = isNaN(rawBalance) || rawBalance < 0 ? 0 : Math.round(rawBalance * 100) / 100;
    
    const rawDesnag = Number(desnaggingCompletionPct);
    const desnagPct = isNaN(rawDesnag) ? 0 : Math.max(0, Math.min(100, Math.round(rawDesnag * 100) / 100));
    
    const financialNocCleared = balance === 0;
    const requiresHitl = balance > 0 || desnagPct < 100;
    const status = requiresHitl ? "PENDING_APPROVAL" : "READY_FOR_HANDOVER";

    const randomSuffix = crypto.randomBytes(2).toString("hex").toUpperCase();
    const ref = `HND-${Date.now().toString().slice(-4)}-${randomSuffix}`;

    const created = await prisma.unitHandover.create({
      data: {
        tenantId,
        handoverReference: ref,
        unitName: String(unitName).trim(),
        buyerName: String(buyerName).trim(),
        desnaggingCompletionPct: desnagPct,
        financialNocCleared,
        outstandingBalance: balance,
        targetHandoverDate: targetHandoverDate ? new Date(targetHandoverDate) : new Date(),
        requiresHitl,
        status,
      },
    });

    return NextResponse.json(
      {
        success: true,
        status_code: 201,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: {
          id: created.id,
          handoverReference: created.handoverReference,
          unitName: created.unitName,
          buyerName: created.buyerName,
          desnaggingCompletionPct: Number(created.desnaggingCompletionPct),
          financialNocCleared: created.financialNocCleared,
          outstandingBalance: Number(created.outstandingBalance),
          targetHandoverDate: created.targetHandoverDate ? new Date(created.targetHandoverDate).toISOString().split("T")[0] : "",
          requiresHitl: created.requiresHitl,
          status: created.status,
          rejectionReason: created.rejectionReason || null,
        },
        error: null,
        meta: null,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        status_code: 500,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "HANDOVER_CREATE_ERROR",
          message: safeErrorMessage(err, "Unit possession inspection could not be saved"),
        },
        meta: null,
      },
      { status: 500 }
    );
  }
}
