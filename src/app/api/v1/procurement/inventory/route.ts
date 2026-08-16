import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { LAKH_IN_RUPEES } from "@/lib/governance";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

async function ensureWarehouseInventoryRegister() {
  await runtimeDdl("table:warehouse_inventory", async () => {
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
      CREATE INDEX IF NOT EXISTS idx_inventory_tenant_category ON warehouse_inventory (tenant_id, category)
    `;
  });
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureWarehouseInventoryRegister();
    const tenantId = auth.user.tenantId;
    const invModel = (prisma as any).warehouseInventory;
    let items: any[] = [];

    if (invModel?.findMany) {
      items = await invModel.findMany({
        where: { tenantId },
        orderBy: { itemDescription: "asc" },
      });
    } else {
      const raw = await prisma.$queryRaw<any[]>`
        SELECT * FROM warehouse_inventory 
        WHERE tenant_id = ${tenantId}::uuid 
        ORDER BY item_description ASC
      `;
      items = raw || [];
    }

    const mapped = items.map((i: any) => {
      const avail = Math.max(0, Number(i.availableQuantity ?? i.available_quantity ?? 0));
      const reorder = Math.max(0, Number(i.reorderLevel ?? i.reorder_level ?? 0));
      const unitCost = Math.max(0, Number(i.unitCost ?? i.unit_cost ?? 0));
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
        message: safeErrorMessage(err, "Warehouse stock register is temporarily unavailable"),
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
    const { category, itemDescription, storageLocation, availableQuantity, unitOfMeasure, reorderLevel, unitCost } = body;
    const tenantId = auth.user.tenantId;

    if (!category || !itemDescription || !storageLocation) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INCOMPLETE_INVENTORY_RECORD",
          message: "Material category, description and storage location are required.",
        },
        meta: null,
      }, { status: 400 });
    }

    const avail = Math.max(0, Number(availableQuantity) || 0);
    const reorder = Math.max(0, Number(reorderLevel) || 0);
    const cost = Math.max(0, Number(unitCost) || 0);
    const uom = unitOfMeasure?.trim() || "Units";

    await ensureWarehouseInventoryRegister();

    const invModel = (prisma as any).warehouseInventory;
    let created: any = null;

    if (invModel?.create) {
      created = await invModel.create({
        data: {
          tenantId,
          category: category.trim(),
          itemDescription: itemDescription.trim(),
          storageLocation: storageLocation.trim(),
          availableQuantity: avail,
          unitOfMeasure: uom,
          reorderLevel: reorder,
          unitCost: cost,
        },
      });
    } else {
      const inserted = await prisma.$queryRaw<any[]>`
        INSERT INTO warehouse_inventory (
          tenant_id, category, item_description, storage_location,
          available_quantity, unit_of_measure, reorder_level, unit_cost
        ) VALUES (
          ${tenantId}::uuid, ${category.trim()}, ${itemDescription.trim()}, ${storageLocation.trim()},
          ${avail}, ${uom},
          ${reorder}, ${cost}
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
        category: created.category,
        itemDescription: created.itemDescription || created.item_description,
        storageLocation: created.storageLocation || created.storage_location,
        availableQuantity: Number(created.availableQuantity ?? created.available_quantity),
        unitOfMeasure: created.unitOfMeasure || created.unit_of_measure,
        reorderLevel: Number(created.reorderLevel ?? created.reorder_level),
        unitCost: Number(created.unitCost ?? created.unit_cost),
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
        code: "INVENTORY_CREATE_ERROR",
        message: safeErrorMessage(err, "Stock item could not be registered"),
      },
      meta: null,
    }, { status: 500 });
  }
}
