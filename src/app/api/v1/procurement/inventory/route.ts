import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { LAKH_IN_RUPEES } from "@/lib/governance";

async function ensureWarehouseInventoryRegister() {
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
}

export async function GET() {
  try {
    const invModel = (prisma as any).warehouseInventory;
    let items: any[] = [];

    if (invModel?.findMany) {
      items = await invModel.findMany({
        where: { tenantId: ACTIVE_TENANT_ID },
        orderBy: { itemDescription: "asc" },
      });
    } else {
      try {
        await ensureWarehouseInventoryRegister();
        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM warehouse_inventory WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY item_description ASC
        `;
        items = raw || [];
      } catch {
        items = [];
      }
    }

    const mapped = items.map((i: any) => {
      const avail = Number(i.availableQuantity ?? i.available_quantity ?? 0);
      const reorder = Number(i.reorderLevel ?? i.reorder_level ?? 0);
      const unitCost = Number(i.unitCost ?? i.unit_cost ?? 0);
      const valuationAmount = avail * unitCost;

      let status: "Optimal" | "Reorder Required" | "Out of Stock" = "Optimal";
      if (avail === 0) status = "Out of Stock";
      else if (avail <= reorder) status = "Reorder Required";

      return {
        id: i.id,
        category: i.category || "",
        itemDescription: i.itemDescription || i.item_description || "",
        storageLocation: i.storageLocation || i.storage_location || "",
        availableQuantity: avail,
        unitOfMeasure: i.unitOfMeasure || i.unit_of_measure || "Units",
        reorderLevel: reorder,
        stockValuationLakhs: Number((valuationAmount / LAKH_IN_RUPEES).toFixed(2)),
        unitCost,
        status,
      };
    });

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
        code: "INVENTORY_FETCH_ERROR",
        message: err instanceof Error ? err.message : "Warehouse stock register is temporarily unavailable",
      },
      meta: { total_records: 0 },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, itemDescription, storageLocation, availableQuantity, unitOfMeasure, reorderLevel, unitCost } =
      body;

    if (!category || !itemDescription || !storageLocation) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INCOMPLETE_INVENTORY_RECORD",
          message: "Material category, description and storage location are required",
        },
        meta: null,
      });
    }

    await ensureWarehouseInventoryRegister();

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO warehouse_inventory (
        tenant_id, category, item_description, storage_location,
        available_quantity, unit_of_measure, reorder_level, unit_cost
      ) VALUES (
        ${ACTIVE_TENANT_ID}::uuid, ${category}, ${itemDescription}, ${storageLocation},
        ${Number(availableQuantity) || 0}, ${unitOfMeasure || "Units"},
        ${Number(reorderLevel) || 0}, ${Number(unitCost) || 0}
      )
      RETURNING *
    `;

    const created = inserted[0];

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: created.id,
        category: created.category,
        itemDescription: created.item_description,
        storageLocation: created.storage_location,
        availableQuantity: Number(created.available_quantity),
        unitOfMeasure: created.unit_of_measure,
        reorderLevel: Number(created.reorder_level),
        unitCost: Number(created.unit_cost),
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
        code: "INVENTORY_CREATE_ERROR",
        message: err instanceof Error ? err.message : "Stock item could not be registered",
      },
      meta: null,
    });
  }
}
