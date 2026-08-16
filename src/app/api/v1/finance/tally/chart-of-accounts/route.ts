import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";
import { ensureAccountingSchema } from "@/lib/accounting/ensureAccountingSchema";
import { BookScope, assertBookScopeAccess, buildBookScopeFilter } from "@/lib/accounting/multiBookScope";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureAccountingSchema();
    const tenantId = ACTIVE_TENANT_ID;
    const url = new URL(request.url);
    const requestedScope = (url.searchParams.get("bookScope") || "STATUTORY") as BookScope;
    const userRole = request.headers.get("x-user-role") || auth.user.role || "ACCOUNTANT";

    assertBookScopeAccess(userRole, requestedScope);

    const rawLedgers = await prisma.$queryRaw<any[]>`
      SELECT l.id, l.ledger_code as "code", l.ledger_name as "name",
             g.group_code as "groupCode", g.group_name as "group", g.nature,
             l.current_balance as "balance", l.opening_balance_type as "type",
             l.book_type as "bookType", l.currency, l.gstin, l.pan,
             l.hsn_sac_code as "hsnSacCode", l.bank_account_number as "bankAccountNumber",
             l.bank_ifsc_code as "bankIfscCode", l.is_msme as "isMsme",
             l.msme_category as "msmeCategory"
      FROM tally_account_ledgers l
      JOIN tally_account_groups g ON l.group_id = g.id
      WHERE l.tenant_id = ${tenantId}::uuid
        AND (${requestedScope} = 'BOTH' OR l.book_type = ${requestedScope})
      ORDER BY g.nature ASC, l.ledger_name ASC;
    `;

    const rawGroups = await prisma.$queryRaw<any[]>`
      SELECT id, group_code as "groupCode", group_name as "groupName",
             parent_group_id as "parentGroupId", nature, is_system as "isSystem"
      FROM tally_account_groups
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY group_name ASC;
    `;

    const rawCostCenters = await prisma.$queryRaw<any[]>`
      SELECT id, center_code as "centerCode", center_name as "centerName", category, region_code as "regionCode"
      FROM tally_cost_centers
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY center_name ASC;
    `;

    const mappedLedgers = rawLedgers.map((l) => ({
      id: l.id,
      code: l.code,
      name: l.name,
      primaryGroup: l.group,
      subGroup: l.group,
      groupCode: l.groupCode,
      group: l.group,
      nature: l.nature,
      ledgerName: l.name,
      ledgerType: l.nature === "ASSET" || l.nature === "LIABILITY" ? "BALANCE_SHEET" : "PROFIT_AND_LOSS",
      openingBalance: Number(l.balance),
      currentBalance: Number(l.balance),
      balance: Number(l.balance),
      type: l.type || "Dr",
      bookType: l.bookType || "STATUTORY",
      currencyCode: l.currency || "INR",
      gstin: l.gstin || "",
      pan: l.pan || "",
      hsnSacCode: l.hsnSacCode || "",
      bankAccountNumber: l.bankAccountNumber || "",
      bankIfscCode: l.bankIfscCode || "",
      isMsme: Boolean(l.isMsme),
      msmeCategory: l.msmeCategory || "",
    }));

    return NextResponse.json({
      success: true,
      status_code: 200,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: mappedLedgers,
      groups: rawGroups,
      costCenters: rawCostCenters,
      error: null,
      meta: { total_records: mappedLedgers.length, book_scope: requestedScope },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        status_code: 500,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: [],
        groups: [],
        costCenters: [],
        error: {
          code: "CHART_OF_ACCOUNTS_FETCH_ERROR",
          message: safeErrorMessage(err, "Failed to fetch Chart of Accounts"),
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

    // 1. Create Group Action
    if (body.action === "CREATE_GROUP") {
      const { newGroupName, newGroupNature, parentGroupId } = body;
      if (!newGroupName || !newGroupNature) {
        return NextResponse.json(
          { success: false, error: { message: "Group name and nature are required" } },
          { status: 400 }
        );
      }

      const gCode = `GRP-${Date.now().toString().slice(-4)}`;
      const inserted = await prisma.$queryRaw<any[]>`
        INSERT INTO tally_account_groups (
          tenant_id, group_code, group_name, parent_group_id, nature, is_system
        ) VALUES (
          ${tenantId}::uuid, ${gCode}, ${newGroupName}, ${parentGroupId ? `${parentGroupId}` : null}::uuid,
          ${newGroupNature}, false
        )
        RETURNING id, group_code as "groupCode", group_name as "groupName", nature;
      `;

      return NextResponse.json({ success: true, group: inserted[0] }, { status: 201 });
    }

    // 2. Create Cost Center Action
    if (body.action === "CREATE_COST_CENTER") {
      const { centerName, centerCategory } = body;
      if (!centerName) {
        return NextResponse.json(
          { success: false, error: { message: "Cost center name is required" } },
          { status: 400 }
        );
      }

      const cCode = `CC-${Date.now().toString().slice(-4)}`;
      const inserted = await prisma.$queryRaw<any[]>`
        INSERT INTO tally_cost_centers (
          tenant_id, center_code, center_name, category
        ) VALUES (
          ${tenantId}::uuid, ${cCode}, ${centerName}, ${centerCategory || 'PROJECT'}
        )
        RETURNING id, center_code as "centerCode", center_name as "centerName", category;
      `;

      return NextResponse.json({ success: true, costCenter: inserted[0] }, { status: 201 });
    }

    // 3. Create General Ledger
    const {
      name,
      ledgerName,
      groupId,
      groupCode,
      primaryGroup,
      bookType,
      balance,
      openingBalance,
      type,
      gstin,
      pan,
      hsnSacCode,
      bankAccountNumber,
      bankIfscCode,
      isMsme,
      msmeCategory,
    } = body;

    const lName = name || ledgerName;
    if (!lName) {
      return NextResponse.json(
        { success: false, error: { message: "Ledger name is required" } },
        { status: 400 }
      );
    }

    let resolvedGroupId = groupId;
    if (!resolvedGroupId) {
      const gCode = groupCode || "GRP-100";
      const gRow = await prisma.$queryRaw<any[]>`
        SELECT id FROM tally_account_groups
        WHERE tenant_id = ${tenantId}::uuid AND (group_code = ${gCode} OR group_name = ${primaryGroup || ''})
        LIMIT 1;
      `;
      if (gRow[0]) {
        resolvedGroupId = gRow[0].id;
      } else {
        const fallbackGroup = await prisma.$queryRaw<any[]>`
          SELECT id FROM tally_account_groups WHERE tenant_id = ${tenantId}::uuid LIMIT 1;
        `;
        resolvedGroupId = fallbackGroup[0]?.id;
      }
    }

    if (!resolvedGroupId) {
      return NextResponse.json(
        { success: false, error: { message: "Account group must exist to create a ledger account" } },
        { status: 400 }
      );
    }

    const lCode = `LED-${Date.now().toString().slice(-5)}`;
    const opBal = Number(balance || openingBalance || 0);

    const insertedLedger = await prisma.$queryRaw<any[]>`
      INSERT INTO tally_account_ledgers (
        tenant_id, ledger_code, ledger_name, group_id, book_type,
        opening_balance, opening_balance_type, current_balance, currency,
        gstin, pan, hsn_sac_code, bank_account_number, bank_ifsc_code,
        is_msme, msme_category
      ) VALUES (
        ${tenantId}::uuid, ${lCode}, ${lName}, ${resolvedGroupId}::uuid, ${bookType || 'STATUTORY'},
        ${opBal}, ${type || 'Dr'}, ${opBal}, 'INR',
        ${gstin || null}, ${pan || null}, ${hsnSacCode || null},
        ${bankAccountNumber || null}, ${bankIfscCode || null},
        ${Boolean(isMsme)}, ${msmeCategory || null}
      )
      RETURNING id, ledger_code as "code", ledger_name as "name", current_balance as "balance", book_type as "bookType";
    `;

    return NextResponse.json(
      {
        success: true,
        status_code: 201,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: insertedLedger[0],
        ledger: insertedLedger[0],
        error: null,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        status_code: 500,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "TALLY_LEDGER_CREATE_ERROR",
          message: safeErrorMessage(err, "Failed to create Chart of Accounts ledger"),
        },
        meta: null,
      },
      { status: 500 }
    );
  }
}
