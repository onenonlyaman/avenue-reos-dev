import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureTitleSearchRegister } from "@/lib/legalDb";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const tenantId = auth.user.tenantId || ACTIVE_TENANT_ID;

  try {
    await ensureTitleSearchRegister();

    const model = (prisma as any).titleSearchLog;
    let records: any[] = [];

    if (model?.findMany) {
      records = await model.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      });
    } else {
      const raw = await prisma.$queryRaw<any[]>`
        SELECT * FROM title_search_logs
        WHERE tenant_id = ${tenantId}::uuid
        ORDER BY created_at DESC
      `;
      records = raw || [];
    }

    const mapped = records.map((r: any) => ({
      id: r.id,
      surveyNumber: r.surveyNumber || r.survey_number || "",
      legalAdvocate: r.legalAdvocate || r.legal_advocate || "",
      searchPeriodYears: Number(r.searchPeriodYears ?? r.search_period_years ?? 30),
      encumbranceStatus: r.encumbranceStatus || r.encumbrance_status || "Clear",
      extractVerified712: Boolean(r.extractVerified712 ?? r.extract_verified_712),
      riskRating: r.riskRating || r.risk_rating || "LOW",
      createdAt: r.createdAt || r.created_at || new Date().toISOString(),
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
        message: safeErrorMessage(err, "Title search register is temporarily unavailable"),
      },
      meta: { total_records: 0 },
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  const tenantId = auth.user.tenantId || ACTIVE_TENANT_ID;

  try {
    const body = await request.json();
    const surveyNumber = (body.surveyNumber || "").trim();
    const legalAdvocate = (body.legalAdvocate || "").trim();
    const { searchPeriodYears, encumbranceStatus, extractVerified712, riskRating } = body;

    if (!surveyNumber || !legalAdvocate) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INCOMPLETE_TITLE_SEARCH_RECORD",
          message: "Survey number and appointed legal advocate are required.",
        },
        meta: null,
      }, { status: 400 });
    }

    const years = Number(searchPeriodYears);
    const validYears = Number.isFinite(years) && years > 0 && years <= 100 ? Math.floor(years) : 30;

    const validEncumbrance = ["Clear", "Encumbered", "Under Verification", "Mortgage Registered", "Disputed"];
    const encumbrance = validEncumbrance.includes(encumbranceStatus) ? encumbranceStatus : "Clear";

    const validRisk = ["LOW", "MEDIUM", "HIGH"];
    const risk = validRisk.includes(riskRating) ? riskRating : "LOW";

    await ensureTitleSearchRegister();

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO title_search_logs (
        tenant_id, survey_number, legal_advocate, search_period_years,
        encumbrance_status, extract_verified_712, risk_rating
      ) VALUES (
        ${tenantId}::uuid, ${surveyNumber}, ${legalAdvocate}, ${validYears},
        ${encumbrance}, ${Boolean(extractVerified712)}, ${risk}
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
        createdAt: created.created_at,
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
        code: "TITLE_SEARCH_CREATE_ERROR",
        message: safeErrorMessage(err, "Title search record could not be registered"),
      },
      meta: null,
    }, { status: 500 });
  }
}
