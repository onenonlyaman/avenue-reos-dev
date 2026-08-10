import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { requireApiAccess, safeErrorMessage } from "@/lib/apiAccess";

export async function GET(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await runtimeDdl("table:ai_documents_legal", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS ai_documents_legal (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        document_title VARCHAR(255) NOT NULL,
        document_type VARCHAR(100) NOT NULL,
        target_project_or_buyer VARCHAR(255) NOT NULL,
        generation_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        verification_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
        requires_hitl BOOLEAN NOT NULL DEFAULT false,
        summary_text TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const raw = await prisma.$queryRaw<any[]>`
      SELECT * FROM ai_documents_legal WHERE tenant_id = ${ACTIVE_TENANT_ID}::uuid ORDER BY created_at DESC
    `;

    const mapped = (raw || []).map((r: any) => ({
      id: r.id,
      documentTitle: r.document_title,
      documentType: r.document_type,
      targetProjectOrBuyer: r.target_project_or_buyer,
      generationTimestamp: r.generation_timestamp,
      verificationStatus: r.verification_status,
      requiresHitl: Boolean(r.requires_hitl),
      summaryText: r.summary_text,
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
        code: "DOCUMENTS_LEGAL_FETCH_ERROR",
        message: safeErrorMessage(err, "Document drafts could not be loaded"),
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
    const { documentTitle, documentType, targetProjectOrBuyer, summaryText } = body;
    const tenantId = ACTIVE_TENANT_ID;

    if (!documentTitle || !documentType) {
      return NextResponse.json({
        success: false,
        status_code: 400,
        timestamp: new Date().toISOString(),
        request_id: `req-${Date.now()}`,
        data: null,
        error: { code: "MISSING_FIELDS", message: "Document title and type are required." },
        meta: null,
      }, { status: 400 });
    }

    const isLegalDeed = documentType === "Legal Deed" || documentType === "Sale Agreement" || documentType === "Possession Affidavit";
    const requiresHitl = isLegalDeed;
    const status = requiresHitl ? "PENDING_APPROVAL" : "VERIFIED";

    await runtimeDdl("table:ai_documents_legal", () => prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS ai_documents_legal (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        document_title VARCHAR(255) NOT NULL,
        document_type VARCHAR(100) NOT NULL,
        target_project_or_buyer VARCHAR(255) NOT NULL,
        generation_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        verification_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
        requires_hitl BOOLEAN NOT NULL DEFAULT false,
        summary_text TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const inserted = await prisma.$queryRaw<any[]>`
      INSERT INTO ai_documents_legal (
        tenant_id, document_title, document_type, target_project_or_buyer,
        generation_timestamp, verification_status, requires_hitl, summary_text
      ) VALUES (
        ${tenantId}::uuid, ${documentTitle}, ${documentType}, ${targetProjectOrBuyer || "Gangapur Road Site"},
        NOW(), ${status}, ${requiresHitl}, ${summaryText || "AI generated document draft"}
      )
      RETURNING *
    `;

    const created = inserted[0];

    if (requiresHitl) {
      await runtimeDdl("table:ai_intelligence_approvals", () => prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS ai_intelligence_approvals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          title VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          target_reference VARCHAR(255) NOT NULL,
          amount NUMERIC(15,2) NOT NULL DEFAULT 0,
          justification TEXT NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
          requires_hitl BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await prisma.$executeRaw`
        INSERT INTO ai_intelligence_approvals (
          tenant_id, title, category, target_reference, amount, justification, status, requires_hitl
        ) VALUES (
          ${tenantId}::uuid, ${documentTitle}, 'LEGAL_DEED', ${targetProjectOrBuyer || "Gangapur Road Site"},
          0, 'Executable legal deed generation requires Governance Director verification',
          'PENDING_APPROVAL', true
        )
      `;
    }

    return NextResponse.json({
      success: true,
      status_code: 201,
      timestamp: new Date().toISOString(),
      request_id: `req-${Date.now()}`,
      data: {
        id: created.id,
        documentTitle: created.document_title,
        documentType: created.document_type,
        targetProjectOrBuyer: created.target_project_or_buyer,
        generationTimestamp: created.generation_timestamp,
        verificationStatus: created.verification_status,
        requiresHitl: Boolean(created.requires_hitl),
        summaryText: created.summary_text,
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
        code: "DOCUMENT_GENERATE_ERROR",
        message: safeErrorMessage(err, "Document draft could not be saved"),
      },
      meta: null,
    }, { status: 500 });
  }
}



