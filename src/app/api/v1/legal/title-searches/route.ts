import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";

async function ensureTitleSearchRegister() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS title_search_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      survey_number VARCHAR(100) NOT NULL,
      legal_advocate VARCHAR(255) NOT NULL,
      search_period_years INTEGER NOT NULL DEFAULT 30,
      encumbrance_status VARCHAR(100) NOT NULL DEFAULT 'Clear',
      extract_verified_712 BOOLEAN NOT NULL DEFAULT false,
      risk_rating VARCHAR(50) NOT NULL DEFAULT 'LOW',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function GET() {
  try {
    const model = (prisma as any).titleSearchLog;
    let records: any[] = [];

    if (model?.findMany) {
      records = await model.findMany({
        where: { tenantId: ACTIVE_TENANT_ID },
        orderBy: { createdAt: "desc" },
      });
    } else {
      try {
        await ensureTitleSearchRegister();
        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM title_search_logs WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
        `;
        records = raw || [];
      } catch {
        records = [];
      }
    }

    const mapped = records.map((r: any) => ({
      id: r.id,
      surveyNumber: r.surveyNumber || r.survey_number || "",
      legalAdvocate: r.legalAdvocate || r.legal_advocate || "",
      searchPeriodYears: Number(r.searchPeriodYears ?? r.search_period_years ?? 0),
      encumbranceStatus: r.encumbranceStatus || r.encumbrance_status || "",
      extractVerified712: Boolean(r.extractVerified712 ?? r.extract_verified_712),
      riskRating: r.riskRating || r.risk_rating || "LOW",
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
        code: "TITLE_SEARCHES_FETCH_ERROR",
        message: err instanceof Error ? err.message : "Title search register is temporarily unavailable",
      },
      meta: { total_records: 0 },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { surveyNumber, legalAdvocate, searchPeriodYears, encumbranceStatus, extractVerified712, riskRating } = body;

    if (!surveyNumber || !legalAdvocate) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INCOMPLETE_TITLE_SEARCH_RECORD",
          message: "Survey number and appointed advocate are required",
        },
        meta: null,
      });
    }

    await ensureTitleSearchRegister();

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO title_search_logs (
        tenant_id, survey_number, legal_advocate, search_period_years,
        encumbrance_status, extract_verified_712, risk_rating
      ) VALUES (
        ${ACTIVE_TENANT_ID}::uuid, ${surveyNumber}, ${legalAdvocate}, ${Number(searchPeriodYears) || 30},
        ${encumbranceStatus || "Clear"}, ${Boolean(extractVerified712)}, ${riskRating || "LOW"}
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
        surveyNumber: created.survey_number,
        legalAdvocate: created.legal_advocate,
        searchPeriodYears: Number(created.search_period_years),
        encumbranceStatus: created.encumbrance_status,
        extractVerified712: Boolean(created.extract_verified_712),
        riskRating: created.risk_rating,
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
        code: "TITLE_SEARCH_CREATE_ERROR",
        message: err instanceof Error ? err.message : "Title search record could not be registered",
      },
      meta: null,
    });
  }
}
