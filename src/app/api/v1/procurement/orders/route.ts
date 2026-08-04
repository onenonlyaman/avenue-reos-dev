import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { HITL_PROCUREMENT_LIMIT } from "@/lib/governance";

export async function GET() {
  try {
    const poModel = (prisma as any).purchaseOrder;
    let orders: any[] = [];

    if (poModel?.findMany) {
      orders = await poModel.findMany({
        orderBy: { createdAt: "desc" },
      });
    } else {
      try {
        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM purchase_orders WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
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
      status: o.status || "PENDING_APPROVAL",
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
        message: err instanceof Error ? err.message : "Purchase orders could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteName, vendorName, materialDescription, quantity, unitRate, freightAmount, deliveryDueDate } = body;
    const tenantId = ACTIVE_TENANT_ID;

    if (!siteName || !vendorName || !materialDescription) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_FIELDS", message: "Site name, vendor name, and material description are required." },
        meta: null,
      });
    }

    const qty = Number(quantity || 0);
    const rate = Number(unitRate || 0);
    const freight = Number(freightAmount || 0);
    const baseValue = qty * rate + freight;
    const gst = baseValue * 0.18;
    const totalValue = baseValue + gst;

    const requiresHitl = totalValue > HITL_PROCUREMENT_LIMIT;
    const status = requiresHitl ? "PENDING_APPROVAL" : "APPROVED";
    const orderRef = `PO-${Date.now().toString().slice(-6)}`;

    const poModel = (prisma as any).purchaseOrder;
    let created: any = null;

    if (poModel?.create) {
      created = await poModel.create({
        data: {
          tenantId,
          orderReference: orderRef,
          siteName,
          vendorName,
          materialDescription,
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
      try {
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
            freight_amount DECIMAL(15,2) NOT NULL,
            gst_amount DECIMAL(15,2) NOT NULL,
            order_value_amount DECIMAL(15,2) NOT NULL,
            delivery_due_date DATE NOT NULL,
            requires_hitl BOOLEAN NOT NULL DEFAULT false,
            status VARCHAR(50) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `;
        const inserted = await prisma.$queryRaw<any[]>`
          INSERT INTO purchase_orders (
            tenant_id, order_reference, site_name, vendor_name, material_description,
            quantity, unit_rate, freight_amount, gst_amount, order_value_amount,
            delivery_due_date, requires_hitl, status
          ) VALUES (
            ${tenantId}::uuid, ${orderRef}, ${siteName}, ${vendorName}, ${materialDescription},
            ${qty}, ${rate}, ${freight}, ${gst}, ${totalValue},
            ${new Date(deliveryDueDate || Date.now())}::date, ${requiresHitl}, ${status}
          )
          RETURNING *
        `;
        created = inserted[0];
      } catch (err: unknown) {
        throw new Error(err instanceof Error ? err.message : "Purchase order could not be saved");
      }
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
        quantity: qty,
        unitRate: rate,
        freightAmount: freight,
        gstAmount: gst,
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
        code: "PO_CREATE_ERROR",
        message: err instanceof Error ? err.message : "Purchase order could not be saved",
      },
      meta: null,
    });
  }
}




