import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";
import { ensureAccountingSchema } from "@/lib/accounting/ensureAccountingSchema";
import { explodeBomRequirements } from "@/lib/accounting/inventoryEngine";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureAccountingSchema();
    const tenantId = ACTIVE_TENANT_ID;

    const recipes = await prisma.$queryRaw<any[]>`
      SELECT b.id, b.bom_name as "bomName", b.yield_quantity as "yieldQuantity",
             si.id as "finishedItemId", si.item_name as "finishedProductName", si.uom
      FROM tally_bom_recipes b
      JOIN tally_stock_items si ON b.finished_item_id = si.id
      WHERE b.tenant_id = ${tenantId}::uuid
      ORDER BY b.bom_name ASC;
    `;

    const components = await prisma.$queryRaw<any[]>`
      SELECT bc.id, bc.bom_id as "bomId", bc.quantity, bc.scrap_rate_pct as "scrapRatePct",
             si.id as "componentItemId", si.item_name as "componentName", si.uom, si.current_stock as "currentStock"
      FROM tally_bom_components bc
      JOIN tally_stock_items si ON bc.component_item_id = si.id
      WHERE bc.tenant_id = ${tenantId}::uuid;
    `;

    const mappedBoms = recipes.map((r) => {
      const comps = components.filter((c) => c.bomId === r.id);
      return {
        id: r.id,
        bomName: r.bomName,
        finishedProductName: r.finishedProductName,
        finishedItemId: r.finishedItemId,
        yieldQuantity: Number(r.yieldQuantity),
        uom: r.uom,
        componentsCount: comps.length,
        components: comps.map((c) => ({
          componentItemId: c.componentItemId,
          componentName: c.componentName,
          quantity: Number(c.quantity),
          uom: c.uom,
          currentStock: Number(c.currentStock || 0),
          scrapRatePct: Number(c.scrapRatePct || 0),
        })),
      };
    });

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: mappedBoms,
      error: null,
      meta: { total_records: mappedBoms.length },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        status_code: 500,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: [],
        error: {
          code: "BOM_FETCH_ERROR",
          message: safeErrorMessage(err, "Failed to fetch Bill of Materials recipes"),
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

    // 1. Create BOM Recipe
    if (body.action === "CREATE_BOM" || (body.bomName && body.finishedItemId)) {
      const { bomName, finishedItemId, yieldQuantity, components } = body;

      const recipeRows = await prisma.$queryRaw<any[]>`
        INSERT INTO tally_bom_recipes (
          tenant_id, bom_name, finished_item_id, yield_quantity
        ) VALUES (
          ${tenantId}::uuid, ${bomName}, ${finishedItemId}::uuid, ${Number(yieldQuantity) || 1}
        )
        RETURNING id;
      `;
      const bomId = recipeRows[0].id;

      if (Array.isArray(components)) {
        for (const c of components) {
          await prisma.$executeRaw`
            INSERT INTO tally_bom_components (
              tenant_id, bom_id, component_item_id, quantity, scrap_rate_pct
            ) VALUES (
              ${tenantId}::uuid, ${bomId}::uuid, ${c.componentItemId}::uuid, ${Number(c.quantity)}, ${Number(c.scrapRatePct || 0)}
            );
          `;
        }
      }

      return NextResponse.json({ success: true, message: `BOM Recipe '${bomName}' created successfully.`, bomId }, { status: 201 });
    }

    // 2. Execute Manufacturing Journal Voucher
    if (body.action === "EXECUTE_MANUFACTURING_JOURNAL") {
      const { bomId, targetProductionQty } = body;
      const qtyToProduce = Number(targetProductionQty) || 1;

      const recipeRows = await prisma.$queryRaw<any[]>`
        SELECT b.*, si.item_name as "finishedItemName"
        FROM tally_bom_recipes b
        JOIN tally_stock_items si ON b.finished_item_id = si.id
        WHERE b.id = ${bomId}::uuid AND b.tenant_id = ${tenantId}::uuid;
      `;

      if (recipeRows.length === 0) {
        throw new Error("BOM Recipe not found.");
      }

      const recipe = recipeRows[0];
      const compRows = await prisma.$queryRaw<any[]>`
        SELECT bc.*, si.item_name, si.current_stock
        FROM tally_bom_components bc
        JOIN tally_stock_items si ON bc.component_item_id = si.id
        WHERE bc.bom_id = ${bomId}::uuid AND bc.tenant_id = ${tenantId}::uuid;
      `;

      const stockMap: Record<string, number> = {};
      compRows.forEach((c) => {
        stockMap[c.component_item_id] = Number(c.current_stock || 0);
      });

      const explosion = explodeBomRequirements(
        {
          id: recipe.id,
          bomName: recipe.bom_name,
          finishedItemId: recipe.finished_item_id,
          yieldQuantity: Number(recipe.yield_quantity),
          components: compRows.map((c) => ({
            componentItemId: c.component_item_id,
            quantity: Number(c.quantity),
            scrapRatePct: Number(c.scrap_rate_pct || 0),
          })),
        },
        qtyToProduce,
        stockMap
      );

      if (!explosion.canProduce) {
        const shortfalls = explosion.components.filter((c) => !c.isSufficient);
        return NextResponse.json(
          {
            success: false,
            error: {
              message: `Insufficient raw material stock to execute manufacturing journal. Shortfall items: ${shortfalls.length}`,
              shortfalls,
            },
          },
          { status: 400 }
        );
      }

      // Deduct raw materials and increment finished goods
      for (const comp of explosion.components) {
        await prisma.$executeRaw`
          UPDATE tally_stock_items
          SET current_stock = current_stock - ${comp.grossQtyNeeded}
          WHERE id = ${comp.componentItemId}::uuid AND tenant_id = ${tenantId}::uuid;
        `;
      }

      await prisma.$executeRaw`
        UPDATE tally_stock_items
        SET current_stock = current_stock + ${qtyToProduce}
        WHERE id = ${recipe.finished_item_id}::uuid AND tenant_id = ${tenantId}::uuid;
      `;

      return NextResponse.json({
        success: true,
        message: `Successfully executed manufacturing journal for ${qtyToProduce} units of ${recipe.finishedItemName}.`,
        producedQuantity: qtyToProduce,
      });
    }

    return NextResponse.json({ success: false, error: { message: "Invalid BOM action requested" } }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        status_code: 500,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "BOM_EXECUTION_ERROR",
          message: safeErrorMessage(err, "Failed to process BOM operation"),
        },
        meta: null,
      },
      { status: 500 }
    );
  }
}
