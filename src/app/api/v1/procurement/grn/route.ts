import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";
import { onGrnApproved } from "@/lib/finance/accountingHooks";
import crypto from "crypto";

async function ensureGrnAndInventoryTables() {
  await runtimeDdl("table:goods_receipt_notes", async () => {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS goods_receipt_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        grn_reference VARCHAR(100) NOT NULL,
        order_reference VARCHAR(100) NOT NULL,
        warehouse_name VARCHAR(255) NOT NULL,
        vendor_name VARCHAR(255) NOT NULL,
        material_name VARCHAR(255) NOT NULL,
        accepted_quantity DECIMAL(15,2) NOT NULL,
        rejected_quantity DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'Units',
        inspection_status VARCHAR(50) NOT NULL,
        gatepass_number VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_grn_tenant_order ON goods_receipt_notes (tenant_id, order_reference)
    `;
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS warehouse_inventory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        category VARCHAR(100) NOT NULL,
        item_description VARCHAR(255) NOT NULL,
        storage_location VARCHAR(255) NOT NULL,
        available_quantity NUMERIC(15,2) NOT NULL DEFAULT 0,
        unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'Units',
        reorder_level NUMERIC(15,2) NOT NULL DEFAULT 0,
        unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_inventory_tenant_item ON warehouse_inventory (tenant_id, item_description)
    `;
  });
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureGrnAndInventoryTables();
    const tenantId = auth.user.tenantId;
    const grnModel = (prisma as any).goodsReceiptNote;
    let records: any[] = [];

    if (grnModel?.findMany) {
      records = await grnModel.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      });
    } else {
      const raw = await prisma.$queryRaw<any[]>`
        SELECT * FROM goods_receipt_notes 
        WHERE tenant_id = ${tenantId}::uuid 
        ORDER BY created_at DESC
      `;
      records = raw || [];
    }

    const mapped = records.map((g: any) => ({
      id: g.id,
      grnReference: g.grnReference || g.grn_reference || "",
      orderReference: g.orderReference || g.order_reference || "",
      warehouseName: g.warehouseName || g.warehouse_name || "",
      vendorName: g.vendorName || g.vendor_name || "",
      materialName: g.materialName || g.material_name || "",
      acceptedQuantity: Number(g.acceptedQuantity ?? g.accepted_quantity ?? 0),
      rejectedQuantity: Number(g.rejectedQuantity ?? g.rejected_quantity ?? 0),
      unitOfMeasure: g.unitOfMeasure || g.unit_of_measure || "Units",
      inspectionStatus: g.inspectionStatus || g.inspection_status || "ACCEPTED",
      gatepassNumber: g.gatepassNumber || g.gatepass_number || "",
      receivedDate: g.createdAt ? new Date(g.createdAt).toISOString().split("T")[0] : "",
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
        code: "GRN_FETCH_ERROR",
        message: safeErrorMessage(err, "Goods Receipt Notes could not be loaded"),
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
    const { orderReference, warehouseName, vendorName, materialName, acceptedQuantity, rejectedQuantity, unitOfMeasure, gatepassNumber } = body;
    const tenantId = auth.user.tenantId;

    if (!orderReference || !warehouseName || !materialName) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_FIELDS", message: "Order reference, warehouse, and material name are required." },
        meta: null,
      }, { status: 400 });
    }

    const accepted = Math.max(0, Number(acceptedQuantity) || 0);
    const rejected = Math.max(0, Number(rejectedQuantity) || 0);

    if (accepted + rejected <= 0) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "INVALID_QUANTITIES", message: "Total received quantity (accepted + rejected) must be greater than zero." },
        meta: null,
      }, { status: 400 });
    }

    let status = "ACCEPTED";
    if (rejected > 0 && accepted > 0) status = "PARTIALLY_ACCEPTED";
    else if (rejected > 0 && accepted === 0) status = "REJECTED";

    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    const grnRef = `GRN-${datePrefix}-${randomHex}`;
    const gatepass = gatepassNumber?.trim() || `GP-${datePrefix.slice(2)}-${randomHex}`;
    const uom = unitOfMeasure?.trim() || "Units";

    await ensureGrnAndInventoryTables();

    const grnModel = (prisma as any).goodsReceiptNote;
    let created: any = null;

    if (grnModel?.create) {
      created = await grnModel.create({
        data: {
          tenantId,
          grnReference: grnRef,
          orderReference: orderReference.trim(),
          warehouseName: warehouseName.trim(),
          vendorName: vendorName?.trim() || "Supplier",
          materialName: materialName.trim(),
          acceptedQuantity: accepted,
          rejectedQuantity: rejected,
          unitOfMeasure: uom,
          inspectionStatus: status,
          gatepassNumber: gatepass,
        },
      });
    } else {
      const inserted = await prisma.$queryRaw<any[]>`
        INSERT INTO goods_receipt_notes (
          tenant_id, grn_reference, order_reference, warehouse_name, vendor_name,
          material_name, accepted_quantity, rejected_quantity, unit_of_measure,
          inspection_status, gatepass_number
        ) VALUES (
          ${tenantId}::uuid, ${grnRef}, ${orderReference.trim()}, ${warehouseName.trim()}, ${vendorName?.trim() || "Supplier"},
          ${materialName.trim()}, ${accepted}, ${rejected}, ${uom},
          ${status}, ${gatepass}
        )
        RETURNING *
      `;
      created = inserted[0];
    }

    // 1. Synchronize physical stock in warehouse_inventory
    if (accepted > 0) {
      try {
        const existingInventory = await prisma.$queryRaw<any[]>`
          SELECT id, available_quantity, unit_cost FROM warehouse_inventory
          WHERE tenant_id = ${tenantId}::uuid 
            AND LOWER(item_description) = LOWER(${materialName.trim()})
            AND LOWER(storage_location) = LOWER(${warehouseName.trim()})
          LIMIT 1;
        `;

        if (existingInventory && existingInventory.length > 0) {
          await prisma.$executeRaw`
            UPDATE warehouse_inventory
            SET available_quantity = available_quantity + ${accepted}, updated_at = NOW()
            WHERE id = ${existingInventory[0].id}::uuid;
          `;
        } else {
          await prisma.$executeRaw`
            INSERT INTO warehouse_inventory (
              tenant_id, category, item_description, storage_location,
              available_quantity, unit_of_measure, reorder_level, unit_cost
            ) VALUES (
              ${tenantId}::uuid, 'General Construction Materials', ${materialName.trim()}, ${warehouseName.trim()},
              ${accepted}, ${uom}, 50.00, 350.00
            );
          `;
        }
      } catch (invErr) {
        console.warn("[procurement:grn] warehouse inventory auto-update skipped:", invErr);
      }

      // 2. Automated Accounting Hook trigger to post Tally / GL Purchase Voucher
      try {
        await onGrnApproved({
          grnId: created.id,
          poNumber: orderReference.trim(),
          vendorName: vendorName?.trim() || "Supplier",
          godownId: warehouseName.trim(),
          billAmount: accepted * 350,
          gstAmount: accepted * 350 * 0.18,
          items: [{ isManualLine: false, acceptedQty: accepted, rate: 350 }],
          operatorId: auth.user.id,
        });
      } catch (accErr) {
        console.warn("[procurement:grn] accounting hook deferred (ledgers may need initialization):", accErr);
      }
    }

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: created.id,
        grnReference: created.grnReference || created.grn_reference,
        orderReference: created.orderReference || created.order_reference,
        warehouseName: created.warehouseName || created.warehouse_name,
        vendorName: created.vendorName || created.vendor_name,
        materialName: created.materialName || created.material_name,
        acceptedQuantity: Number(created.acceptedQuantity ?? created.accepted_quantity ?? accepted),
        rejectedQuantity: Number(created.rejectedQuantity ?? created.rejected_quantity ?? rejected),
        unitOfMeasure: created.unitOfMeasure || created.unit_of_measure,
        inspectionStatus: created.inspectionStatus || created.inspection_status,
        gatepassNumber: created.gatepassNumber || created.gatepass_number,
        receivedDate: created.createdAt ? new Date(created.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
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
        code: "GRN_CREATE_ERROR",
        message: safeErrorMessage(err, "Goods Receipt Note could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}
