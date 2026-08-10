import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

async function ensureGodownTables() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS tally_godowns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      godown_name VARCHAR(255) NOT NULL,
      parent_godown_id UUID,
      rack_location VARCHAR(100),
      bin_number VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS tally_stock_batches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      godown_id UUID,
      item_name VARCHAR(255) NOT NULL,
      batch_number VARCHAR(100) NOT NULL,
      manufacture_date TIMESTAMPTZ,
      expiry_date TIMESTAMPTZ,
      quantity DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      unit_cost DECIMAL(15,2) NOT NULL DEFAULT 0.00,
      valuation_method VARCHAR(50) NOT NULL DEFAULT 'FIFO',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function GET() {
  try {
    await ensureGodownTables();
    const tenantId = ACTIVE_TENANT_ID;

    const rawGodowns = await prisma.$queryRaw<any[]>`
      SELECT g.*, p.godown_name as parent_godown_name
      FROM tally_godowns g
      LEFT JOIN tally_godowns p ON g.parent_godown_id = p.id
      WHERE g.tenant_id = ${tenantId}::uuid
      ORDER BY g.godown_name ASC
    `;

    const rawBatches = await prisma.$queryRaw<any[]>`
      SELECT *
      FROM tally_stock_batches
      WHERE tenant_id = ${tenantId}::uuid
    `;

    const mapped = rawGodowns.map((g) => {
      const batches = rawBatches.filter((b) => b.godown_id === g.id);
      return {
        id: g.id,
        godownName: g.godown_name,
        parentGodownName: g.parent_godown_name || "Main Enterprise Hub",
        rackLocation: g.rack_location || "RACK-01",
        binNumber: g.bin_number || "BIN-101",
        stockBatches: batches.map((b) => ({
          id: b.id,
          itemName: b.item_name,
          batchNumber: b.batch_number,
          quantity: Number(b.quantity),
          unitCost: Number(b.unit_cost),
          manufactureDate: b.manufacture_date ? new Date(b.manufacture_date).toISOString().split("T")[0] : "",
          expiryDate: b.expiry_date ? new Date(b.expiry_date).toISOString().split("T")[0] : "",
          valuationMethod: b.valuation_method || "FIFO",
        })),
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
        code: "GODOWNS_FETCH_ERROR",
        message: err instanceof Error ? err.message : "Failed to fetch godown stock levels",
      },
      meta: { total_records: 0 },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureGodownTables();
    const tenantId = ACTIVE_TENANT_ID;
    const body = await request.json();

    const {
      sourceGodownId,
      targetGodownId,
      itemName,
      quantity,
      batchNumber,
      unitCost,
    } = body;

    const qty = Number(quantity || 0);
    const cost = Number(unitCost || 0);

    if (!itemName || qty <= 0) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "INVALID_STOCK_JOURNAL", message: "Valid item name and quantity required" },
        meta: null,
      });
    }

    if (sourceGodownId) {
      await prisma.$executeRaw`
        UPDATE tally_stock_batches
        SET quantity = GREATEST(0, quantity - ${qty})
        WHERE godown_id = ${sourceGodownId}::uuid AND item_name = ${itemName} AND tenant_id = ${tenantId}::uuid
      `;
    }

    if (targetGodownId) {
      const existing = await prisma.$queryRaw<any[]>`
        SELECT id FROM tally_stock_batches
        WHERE godown_id = ${targetGodownId}::uuid AND item_name = ${itemName} AND tenant_id = ${tenantId}::uuid
      `;

      if (existing.length > 0) {
        await prisma.$executeRaw`
          UPDATE tally_stock_batches
          SET quantity = quantity + ${qty}
          WHERE id = ${existing[0].id}::uuid
        `;
      } else {
        const bNo = batchNumber || `BATCH-${Date.now().toString().slice(-4)}`;
        await prisma.$executeRaw`
          INSERT INTO tally_stock_batches (
            tenant_id, godown_id, item_name, batch_number, quantity, unit_cost, valuation_method
          ) VALUES (
            ${tenantId}::uuid, ${targetGodownId}::uuid, ${itemName}, ${bNo}, ${qty}, ${cost}, 'FIFO'
          )
        `;
      }
    }

    const ref = `Stock Transfer #${Date.now().toString().slice(-6)}`;

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: { stockJournalRef: ref },
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
        code: "STOCK_JOURNAL_ERROR",
        message: err instanceof Error ? err.message : "Failed to record stock transfer journal",
      },
      meta: null,
    });
  }
}
