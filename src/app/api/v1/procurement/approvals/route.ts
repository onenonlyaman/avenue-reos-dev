import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

async function ensurePurchaseOrdersTable() {
  await runtimeDdl("table:purchase_orders", async () => {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        order_reference VARCHAR(100) NOT NULL,
        site_name VARCHAR(255) NOT NULL,
        vendor_name VARCHAR(255) NOT NULL,
        material_description VARCHAR(255) NOT NULL,
        quantity DECIMAL(15,2) NOT NULL,
        unit_rate DECIMAL(15,2) NOT NULL,
        freight_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        gst_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        order_value_amount DECIMAL(15,2) NOT NULL,
        delivery_due_date DATE NOT NULL,
        requires_hitl BOOLEAN NOT NULL DEFAULT false,
        status VARCHAR(50) NOT NULL,
        rejection_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await prisma.$executeRaw`
      ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_po_tenant_status ON purchase_orders (tenant_id, status)
    `;
  });
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensurePurchaseOrdersTable();
    const tenantId = auth.user.tenantId;
    const poModel = (prisma as any).purchaseOrder;
    let orders: any[] = [];

    if (poModel?.findMany) {
      orders = await poModel.findMany({
        where: { tenantId, requiresHitl: true, status: "PENDING_APPROVAL" },
        orderBy: { createdAt: "desc" },
      });
    } else {
      const raw = await prisma.$queryRaw<any[]>`
        SELECT * FROM purchase_orders
        WHERE tenant_id = ${tenantId}::uuid AND requires_hitl = true AND status = 'PENDING_APPROVAL'
        ORDER BY created_at DESC
      `;
      orders = raw || [];
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
      rejectionReason: o.rejectionReason || o.rejection_reason || null,
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
        message: safeErrorMessage(err, "Pending procurement approvals could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}
