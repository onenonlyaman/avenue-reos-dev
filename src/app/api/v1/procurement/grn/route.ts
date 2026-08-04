import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    const grnModel = (prisma as any).goodsReceiptNote;
    let records: any[] = [];

    if (grnModel?.findMany) {
      records = await grnModel.findMany({
        orderBy: { createdAt: "desc" },
      });
    } else {
      try {
        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM goods_receipt_notes WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
        `;
        records = raw || [];
      } catch {
        records = [];
      }
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
      unitOfMeasure: g.unitOfMeasure || g.unit_of_measure || "MT",
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
        message: err instanceof Error ? err.message : "Goods Receipt Notes could not be loaded",
      },
      meta: { total_records: 0 },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderReference, warehouseName, vendorName, materialName, acceptedQuantity, rejectedQuantity, unitOfMeasure, gatepassNumber } = body;
    const tenantId = ACTIVE_TENANT_ID;

    if (!orderReference || !warehouseName || !materialName) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_FIELDS", message: "Order reference, warehouse, and material name are required." },
        meta: null,
      });
    }

    const accepted = Number(acceptedQuantity || 0);
    const rejected = Number(rejectedQuantity || 0);
    let status = "ACCEPTED";
    if (rejected > 0 && accepted > 0) status = "PARTIALLY_ACCEPTED";
    else if (rejected > 0 && accepted === 0) status = "REJECTED";

    const grnRef = `GRN-${Date.now().toString().slice(-6)}`;
    const grnModel = (prisma as any).goodsReceiptNote;
    let created: any = null;

    if (grnModel?.create) {
      created = await grnModel.create({
        data: {
          tenantId,
          grnReference: grnRef,
          orderReference,
          warehouseName,
          vendorName: vendorName || "Supplier",
          materialName,
          acceptedQuantity: accepted,
          rejectedQuantity: rejected,
          unitOfMeasure: unitOfMeasure || "MT",
          inspectionStatus: status,
          gatepassNumber: gatepassNumber || `GP-${Date.now().toString().slice(-4)}`,
        },
      });
    } else {
      try {
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
            rejected_quantity DECIMAL(15,2) NOT NULL,
            unit_of_measure VARCHAR(50) NOT NULL,
            inspection_status VARCHAR(50) NOT NULL,
            gatepass_number VARCHAR(100) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `;
        const inserted = await prisma.$queryRaw<any[]>`
          INSERT INTO goods_receipt_notes (
            tenant_id, grn_reference, order_reference, warehouse_name, vendor_name,
            material_name, accepted_quantity, rejected_quantity, unit_of_measure,
            inspection_status, gatepass_number
          ) VALUES (
            ${tenantId}::uuid, ${grnRef}, ${orderReference}, ${warehouseName}, ${vendorName || "Supplier"},
            ${materialName}, ${accepted}, ${rejected}, ${unitOfMeasure || "MT"},
            ${status}, ${gatepassNumber || `GP-${Date.now().toString().slice(-4)}`}
          )
          RETURNING *
        `;
        created = inserted[0];
      } catch (err: unknown) {
        throw new Error(err instanceof Error ? err.message : "Goods receipt note could not be saved");
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
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      status_code: 500,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: null,
      error: {
        code: "GRN_CREATE_ERROR",
        message: err instanceof Error ? err.message : "Goods Receipt Note could not be saved",
      },
      meta: null,
    });
  }
}



