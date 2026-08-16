import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { HITL_PROCUREMENT_LIMIT } from "@/lib/governance";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";
import crypto from "crypto";

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
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      });
    } else {
      const raw = await prisma.$queryRaw<any[]>`
        SELECT * FROM purchase_orders 
        WHERE tenant_id = ${tenantId}::uuid 
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
      status: o.status || "PENDING_APPROVAL",
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
        code: "PO_FETCH_ERROR",
        message: safeErrorMessage(err, "Purchase orders could not be loaded"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { siteName, vendorName, materialDescription, quantity, unitRate, freightAmount, deliveryDueDate } = body;
    const tenantId = auth.user.tenantId;

    if (!siteName || !vendorName || !materialDescription) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_FIELDS", message: "Site name, vendor name, and material description are required." },
        meta: null,
      }, { status: 400 });
    }

    const qty = Number(quantity);
    const rate = Number(unitRate);
    const freight = Math.max(0, Number(freightAmount) || 0);

    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "INVALID_QUANTITY", message: "Order quantity must be a positive number greater than 0." },
        meta: null,
      }, { status: 400 });
    }

    if (isNaN(rate) || rate <= 0) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "INVALID_RATE", message: "Unit rate must be a positive number greater than 0." },
        meta: null,
      }, { status: 400 });
    }

    const baseValue = qty * rate + freight;
    const gst = Math.round(baseValue * 0.18 * 100) / 100;
    const totalValue = Math.round((baseValue + gst) * 100) / 100;

    const requiresHitl = totalValue > HITL_PROCUREMENT_LIMIT;
    const status = requiresHitl ? "PENDING_APPROVAL" : "APPROVED";
    
    // Cryptographically collision-safe reference code
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    const orderRef = `PO-${datePrefix}-${randomHex}`;

    await ensurePurchaseOrdersTable();

    const poModel = (prisma as any).purchaseOrder;
    let created: any = null;

    if (poModel?.create) {
      created = await poModel.create({
        data: {
          tenantId,
          orderReference: orderRef,
          siteName: siteName.trim(),
          vendorName: vendorName.trim(),
          materialDescription: materialDescription.trim(),
          quantity: qty,
          unitRate: rate,
          freightAmount: freight,
          gstAmount: gst,
          orderValueAmount: totalValue,
          deliveryDueDate: new Date(deliveryDueDate || Date.now()),
          requiresHitl,
          status,
        },
      });
    } else {
      const inserted = await prisma.$queryRaw<any[]>`
        INSERT INTO purchase_orders (
          tenant_id, order_reference, site_name, vendor_name, material_description,
          quantity, unit_rate, freight_amount, gst_amount, order_value_amount,
          delivery_due_date, requires_hitl, status
        ) VALUES (
          ${tenantId}::uuid, ${orderRef}, ${siteName.trim()}, ${vendorName.trim()}, ${materialDescription.trim()},
          ${qty}, ${rate}, ${freight}, ${gst}, ${totalValue},
          ${new Date(deliveryDueDate || Date.now())}::date, ${requiresHitl}, ${status}
        )
        RETURNING *
      `;
      created = inserted[0];
    }

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: created.id,
        orderReference: created.orderReference || created.order_reference,
        siteName: created.siteName || created.site_name,
        vendorName: created.vendorName || created.vendor_name,
        materialDescription: created.materialDescription || created.material_description,
        orderValueLakhs: Number((Number(created.orderValueAmount ?? created.order_value_amount ?? totalValue) / 100000).toFixed(2)),
        deliveryDueDate: created.deliveryDueDate ? new Date(created.deliveryDueDate).toISOString().split("T")[0] : "",
        requiresHitl: Boolean(created.requiresHitl ?? created.requires_hitl),
        status: created.status,
        rejectionReason: null,
        quantity: qty,
        unitRate: rate,
        freightAmount: freight,
        gstAmount: gst,
      },
      error: null,
      meta: null,
    }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "PO_CREATE_ERROR",
        message: safeErrorMessage(err, "Purchase order could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}
