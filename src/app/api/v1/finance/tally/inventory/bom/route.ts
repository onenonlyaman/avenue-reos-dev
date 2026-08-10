import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

async function ensureBomTable() {
  await runtimeDdl("table:tally_bill_of_materials", () => prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS tally_bill_of_materials (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      recipe_name VARCHAR(255) NOT NULL,
      finished_goods_item_name VARCHAR(255) NOT NULL,
      component_item_name VARCHAR(255) NOT NULL,
      standard_quantity DECIMAL(15,4) NOT NULL DEFAULT 1.0,
      overhead_cost_allocation_pct DECIMAL(5,2) NOT NULL DEFAULT 5.0,
      scrap_rate_pct DECIMAL(5,2) NOT NULL DEFAULT 1.0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureBomTable();
    const tenantId = ACTIVE_TENANT_ID;

    const recipes = await prisma.$queryRaw<any[]>`
      SELECT *
      FROM tally_bill_of_materials
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY created_at DESC
    `;

    const mapped = recipes.map((r) => ({
      id: r.id,
      recipeName: r.recipe_name,
      finishedGoodsItemName: r.finished_goods_item_name,
      componentItemName: r.component_item_name,
      standardQuantity: Number(r.standard_quantity),
      overheadCostAllocationPct: Number(r.overhead_cost_allocation_pct),
      scrapRatePct: Number(r.scrap_rate_pct),
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
        code: "BOM_FETCH_ERROR",
        message: safeErrorMessage(err, "Failed to fetch BOM recipes"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureBomTable();
    const tenantId = ACTIVE_TENANT_ID;
    const body = await request.json();

    const { recipeId, producedQuantity } = body;
    const qty = Number(producedQuantity || 1);

    if (!recipeId) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "INVALID_PRODUCTION_RECORD", message: "BOM recipe ID required" },
        meta: null,
      }, { status: 400 });
    }

    const recipes = await prisma.$queryRaw<any[]>`
      SELECT * FROM tally_bill_of_materials
      WHERE id = ${recipeId}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    if (recipes.length > 0) {
      const rec = recipes[0];
      const reqRawQty = Number(rec.standard_quantity) * qty;

      await prisma.$executeRaw`
        UPDATE tally_stock_batches
        SET quantity = GREATEST(0, quantity - ${reqRawQty})
        WHERE item_name = ${rec.component_item_name} AND tenant_id = ${tenantId}::uuid
      `;

      const fgBatch = `FG-BATCH-${Date.now().toString().slice(-4)}`;
      await prisma.$executeRaw`
        INSERT INTO tally_stock_batches (
          tenant_id, item_name, batch_number, quantity, unit_cost, valuation_method
        ) VALUES (
          ${tenantId}::uuid, ${rec.finished_goods_item_name}, ${fgBatch}, ${qty}, 1250.00, 'FIFO'
        )
      `;
    }

    const ref = `Production Voucher #${Date.now().toString().slice(-6)}`;

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: { productionVoucherRef: ref },
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
        code: "PRODUCTION_VOUCHER_ERROR",
        message: safeErrorMessage(err, "Failed to post production voucher"),
      },
      meta: null,
    }, { status: 500 });
  }
}
