import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await runtimeDdl("table:hr_candidates", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS hr_candidates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        candidate_name VARCHAR(255) NOT NULL,
        target_position VARCHAR(100) NOT NULL,
        experience_level VARCHAR(50) NOT NULL,
        current_stage VARCHAR(50) NOT NULL DEFAULT 'Applied',
        interview_score INT NOT NULL DEFAULT 0,
        contact_email VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM hr_candidates WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      candidateName: r.candidate_name,
      targetPosition: r.target_position,
      experienceLevel: r.experience_level,
      currentStage: r.current_stage,
      interviewScore: Number(r.interview_score || 0),
      contactEmail: r.contact_email,
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
        code: "HR_RECRUITMENT_FETCH_ERROR",
        message: safeErrorMessage(err, "Candidates could not be loaded"),
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
    const { candidateName, targetPosition, experienceLevel, contactEmail, currentStage } = body;
    const tenantId = ACTIVE_TENANT_ID;

    if (!candidateName || !targetPosition) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_FIELDS", message: "Candidate name and target position are required." },
        meta: null,
      }, { status: 400 });
    }

    await runtimeDdl("table:hr_candidates", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS hr_candidates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        candidate_name VARCHAR(255) NOT NULL,
        target_position VARCHAR(100) NOT NULL,
        experience_level VARCHAR(50) NOT NULL,
        current_stage VARCHAR(50) NOT NULL DEFAULT 'Applied',
        interview_score INT NOT NULL DEFAULT 0,
        contact_email VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO hr_candidates (
        tenant_id, candidate_name, target_position, experience_level, current_stage, interview_score, contact_email
      ) VALUES (
        ${tenantId}::uuid, ${candidateName}, ${targetPosition}, ${experienceLevel || "Mid Level (3-5 yrs)"},
        ${currentStage || "Applied"}, 0, ${contactEmail || ""}
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
        candidateName: created.candidate_name,
        targetPosition: created.target_position,
        experienceLevel: created.experience_level,
        currentStage: created.current_stage,
        interviewScore: Number(created.interview_score || 0),
        contactEmail: created.contact_email,
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
        code: "CANDIDATE_CREATE_ERROR",
        message: safeErrorMessage(err, "Candidate record could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}



