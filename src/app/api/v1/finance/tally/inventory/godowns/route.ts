import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";
import { ensureAccountingSchema } from "@/lib/accounting/ensureAccountingSchema";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureAccountingSchema();
    const tenantId = ACTIVE_TENANT_ID;

    // 1. Fetch Godowns
    const rawGodowns = await prisma.$queryRaw<any[]>`
      SELECT g.id, g.godown_code as "godownCode", g.godown_name as "godownName",
             g.location_address as "locationAddress", g.is_active as "isActive"
      FROM tally_inventory_godowns g
      WHERE g.tenant_id = ${tenantId}::uuid
      ORDER BY g.godown_name ASC;
    `;

    // 2. Fetch Stock Items
    const rawItems = await prisma.$queryRaw<any[]>`
      SELECT i.id, i.item_code as "itemCode", i.item_name as "itemName",
             sg.group_name as "groupName", i.uom, i.hsn_code as "hsnCode",
             i.gst_rate as "gstRate", i.reorder_level as "reorderLevel",
             i.valuation_method as "valuationMethod", i.current_stock as "currentStock",
             i.standard_rate as "standardRate"
      FROM tally_stock_items i
      LEFT JOIN tally_stock_groups sg ON i.group_id = sg.id
      WHERE i.tenant_id = ${tenantId}::uuid
      ORDER BY i.item_name ASC;
    `;

    const mappedGodowns = rawGodowns.map((g) => ({
      id: g.id,
      name: g.godownName,
      location: g.locationAddress || "Primary Warehouse",
      supervisor: "Site Warehouse Officer",
      capacityUtilizationPct: 65,
      activeItemsCount: rawItems.length,
      valuationInr: rawItems.reduce((acc, it) => acc + Number(it.currentStock) * Number(it.standardRate), 0),
    }));

    const mappedStockItems = rawItems.map((it) => {
      const stock = Number(it.currentStock || 0);
      const rate = Number(it.standardRate || 0);
      const reorder = Number(it.reorderLevel || 0);
      return {
        id: it.id,
        itemCode: it.itemCode,
        itemName: it.itemName,
        groupName: it.groupName || "Raw Materials",
        uom: it.uom,
        hsnCode: it.hsnCode || "6810",
        currentStock: stock,
        reorderLevel: reorder,
        valuationMethod: it.valuationMethod,
        standardRate: rate,
        totalValuation: Math.round(stock * rate * 100) / 100,
        isShortfall: stock <= reorder,
      };
    });

    const totalValuation = mappedStockItems.reduce((acc, it) => acc + it.totalValuation, 0);

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        godowns: mappedGodowns,
        stockItems: mappedStockItems,
        summary: {
          totalGodowns: mappedGodowns.length,
          totalStockItems: mappedStockItems.length,
          totalInventoryValuation: totalValuation,
          shortfallCount: mappedStockItems.filter((it) => it.isShortfall).length,
        },
      },
      error: null,
      meta: { godowns_count: mappedGodowns.length, items_count: mappedStockItems.length },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        status_code: 500,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: { godowns: [], stockItems: [], summary: {} },
        error: {
          code: "INVENTORY_GODOWNS_FETCH_ERROR",
          message: safeErrorMessage(err, "Failed to fetch godowns and inventory"),
        },
        meta: null,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureAccountingSchema();
    const tenantId = ACTIVE_TENANT_ID;
    const body = await request.json();

    // 1. Create Godown Location
    if (body.action === "CREATE_GODOWN" || body.name) {
      const gName = body.godownName || body.name;
      const gLocation = body.locationAddress || body.location || "Site Yard Location";
      const gCode = `GDN-${Date.now().toString().slice(-4)}`;

      const inserted = await prisma.$queryRaw<any[]>`
        INSERT INTO tally_inventory_godowns (
          tenant_id, godown_code, godown_name, location_address
        ) VALUES (
          ${tenantId}::uuid, ${gCode}, ${gName}, ${gLocation}
        )
        RETURNING id, godown_code as "godownCode", godown_name as "name", location_address as "location";
      `;

      return NextResponse.json({ success: true, godown: inserted[0] }, { status: 201 });
    }

    // 2. Create Stock Item
    if (body.action === "CREATE_STOCK_ITEM") {
      const { itemName, uom, hsnCode, gstRate, standardRate, currentStock, reorderLevel, valuationMethod } = body;
      const iCode = `ITEM-${Date.now().toString().slice(-5)}`;

      const inserted = await prisma.$queryRaw<any[]>`
        INSERT INTO tally_stock_items (
          tenant_id, item_code, item_name, uom, hsn_code, gst_rate, standard_rate, current_stock, reorder_level, valuation_method
        ) VALUES (
          ${tenantId}::uuid, ${iCode}, ${itemName}, ${uom || 'NOS'}, ${hsnCode || '6810'},
          ${Number(gstRate) || 18.0}, ${Number(standardRate) || 0}, ${Number(currentStock) || 0},
          ${Number(reorderLevel) || 0}, ${valuationMethod || 'WEIGHTED_AVG'}
        )
        RETURNING id, item_code as "itemCode", item_name as "itemName", current_stock as "currentStock";
      `;

      return NextResponse.json({ success: true, stockItem: inserted[0] }, { status: 201 });
    }

    return NextResponse.json({ success: false, error: { message: "Invalid inventory action" } }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        status_code: 500,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INVENTORY_ACTION_ERROR",
          message: safeErrorMessage(err, "Failed to process inventory modification"),
        },
        meta: null,
      },
      { status: 500 }
    );
  }
}
