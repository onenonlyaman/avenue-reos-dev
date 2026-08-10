import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search")?.toLowerCase() || "";
  const costCenter = searchParams.get("costCenter");

  try {
    const dbEntries = await prisma.generalLedgerEntry.findMany({ where: { tenantId: ACTIVE_TENANT_ID },
      orderBy: { transactionDate: "desc" },
      take: 100,
      include: {
        account: true,
        costCenter: {
          include: {
            project: true,
          },
        },
      },
    });

    let mapped = dbEntries.map((entry) => ({
      id: entry.id,
      postingDate: entry.transactionDate.toISOString().split("T")[0],
      entryNumber: entry.voucherNumber,
      accountHead: entry.account?.accountName || entry.narration.split("—")[0] || "General Ledger Head",
      costCenter: entry.costCenter?.name || "General Corporate",
      debitAmount: Number(entry.debitAmount),
      creditAmount: Number(entry.creditAmount),
      postedBy: "Finance Officer",
      approvalStatus: Number(entry.debitAmount) > 4000000 ? "PENDING_HITL" : "POSTED",
      documentRef: entry.sourceReferenceId || "DOC-REF",
    }));

    if (search) {
      mapped = mapped.filter(
        (e) =>
          e.entryNumber.toLowerCase().includes(search) ||
          e.accountHead.toLowerCase().includes(search) ||
          e.documentRef.toLowerCase().includes(search)
      );
    }

    if (costCenter && costCenter !== "All") {
      mapped = mapped.filter((e) => e.costCenter === costCenter);
    }

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
        code: "DB_FETCH_LEDGER_ERROR",
        message: safeErrorMessage(err, "Ledger entries could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}
