import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

export async function GET() {
  try {
    const accounts = await prisma.masterChartOfAccounts.findMany({
      where: { tenantId: ACTIVE_TENANT_ID },
      orderBy: { accountCode: "asc" },
    });

    const mapped = accounts.map((a) => ({
      id: a.id,
      accountCode: a.accountCode,
      accountName: a.accountName,
      accountType: a.accountType,
      formattedLabel: `${a.accountCode} - ${a.accountName}`,
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
        code: "FETCH_ACCOUNTS_ERROR",
        message: err instanceof Error ? err.message : "Chart of accounts register is temporarily unavailable",
      },
      meta: { total_records: 0 },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountCode, accountName, accountType } = body;

    if (!accountCode || !accountName || !accountType) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INCOMPLETE_ACCOUNT_RECORD",
          message: "Account code, account name and account class are required",
        },
        meta: null,
      });
    }

    const created = await prisma.masterChartOfAccounts.create({
      data: {
        tenantId: ACTIVE_TENANT_ID,
        accountCode,
        accountName,
        accountType,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: created.id,
        accountCode: created.accountCode,
        accountName: created.accountName,
        accountType: created.accountType,
        formattedLabel: `${created.accountCode} - ${created.accountName}`,
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
        code: "ACCOUNT_CREATE_ERROR",
        message: err instanceof Error ? err.message : "Ledger account could not be saved",
      },
      meta: null,
    });
  }
}
