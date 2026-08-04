import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    const poModel = (prisma as any).purchaseOrder;
    let orders: any[] = [];

    if (poModel?.findMany) {
      orders = await poModel.findMany({
        where: { requiresHitl: true, status: "PENDING_APPROVAL" },
        orderBy: { createdAt: "desc" },
      });
    } else {
      try {
        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM purchase_orders
          WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid AND requires_hitl = true AND status = 'PENDING_APPROVAL'
          ORDER BY created_at DESC
        `;
        orders = raw || [];
      } catch {
        orders = [];
      }
    }

    const mapped = orders.map((o: any) => ({
      id: o.id,
      orderReference: o.orderReference || o.order_reference || "",
      siteName: o.siteName || o.site_name || "",
      vendorName: o.vendorName || o.vendor_name || "",
      materialDescription: o.materialDescription || o.material_description || "",
      orderValueLakhs: Number((Number(o.orderValueAmount ?? o.order_value_amount ?? 0) / 100000).toFixed(2)),
      deliveryDueDate: o.deliveryDueDate ? new Date(o.deliveryDueDate).toISOString().split("T")[0] : "",
      requiresHitl: Boolean(o.requiresHitl ?? o.requires_hitl),
      status: o.status,
      quantity: Number(o.quantity || 0),
      unitRate: Number(o.unitRate ?? o.unit_rate ?? 0),
      freightAmount: Number(o.freightAmount ?? o.freight_amount ?? 0),
      gstAmount: Number(o.gstAmount ?? o.gst_amount ?? 0),
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
        code: "PENDING_APPROVALS_FETCH_ERROR",
        message: err instanceof Error ? err.message : "Pending procurement approvals could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}

