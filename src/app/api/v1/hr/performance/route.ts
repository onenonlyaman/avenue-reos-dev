import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await runtimeDdl("table:hr_performance_goals", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS hr_performance_goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        employee_name VARCHAR(255) NOT NULL,
        is_trainee BOOLEAN NOT NULL DEFAULT false,
        department VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        target_score INT NOT NULL DEFAULT 100,
        achieved_score INT NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'ON_TRACK',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM hr_performance_goals 
      WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid 
      ORDER BY created_at DESC
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      employeeName: r.employee_name,
      isTrainee: Boolean(r.is_trainee),
      department: r.department,
      title: r.title,
      targetScore: Number(r.target_score || 100),
      achievedScore: Number(r.achieved_score || 0),
      status: r.status,
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
        code: "HR_PERFORMANCE_FETCH_ERROR",
        message: safeErrorMessage(err, "Performance goals could not be loaded"),
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
    const { employeeName, department, title, targetScore, achievedScore, isTrainee, status } = body;

    if (!employeeName || !department || !title) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: {
          code: "INCOMPLETE_GOAL_RECORD",
          message: "Employee, department and objective title are required",
        },
        meta: null,
      }, { status: 400 });
    }

    await runtimeDdl("table:hr_performance_goals", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS hr_performance_goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        employee_name VARCHAR(255) NOT NULL,
        is_trainee BOOLEAN NOT NULL DEFAULT false,
        department VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        target_score INT NOT NULL DEFAULT 100,
        achieved_score INT NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'ON_TRACK',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO hr_performance_goals (
        tenant_id, employee_name, is_trainee, department, title, target_score, achieved_score, status
      ) VALUES (
        ${ACTIVE_TENANT_ID}::uuid, ${employeeName}, ${Boolean(isTrainee)}, ${department}, ${title},
        ${Number(targetScore) || 100}, ${Number(achievedScore) || 0}, ${status || "ON_TRACK"}
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
        employeeName: created.employee_name,
        isTrainee: Boolean(created.is_trainee),
        department: created.department,
        title: created.title,
        targetScore: Number(created.target_score),
        achievedScore: Number(created.achieved_score),
        status: created.status,
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
        code: "GOAL_CREATE_ERROR",
        message: safeErrorMessage(err, "Performance objective could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}
