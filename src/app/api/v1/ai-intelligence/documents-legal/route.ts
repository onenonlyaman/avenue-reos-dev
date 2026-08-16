import { NextRequest, NextResponse } from "next/server";
import { prisma, runtimeDdl } from "@/lib/db";
import { requireApiAccess, safeErrorMessage, envelope } from "@/lib/apiAccess";

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
      SELECT * FROM ai_documents_legal
      WHERE tenant_id = ${auth.user.tenantId}::uuid
      ORDER BY created_at DESC
      LIMIT 100
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
    const tenantId = auth.user.tenantId;

    if (!documentTitle || typeof documentTitle !== "string" || !documentTitle.trim()) {
      return envelope(400, {
        error: { code: "MISSING_TITLE", message: "Document title is required." },
      });
    }

    if (!documentType || typeof documentType !== "string" || !documentType.trim()) {
      return envelope(400, {
        error: { code: "MISSING_TYPE", message: "Document type is required." },
      });
    }

    const trimmedProject = (targetProjectOrBuyer && typeof targetProjectOrBuyer === "string")
      ? targetProjectOrBuyer.trim()
      : "General Corporate Repository";

    const trimmedSummary = (summaryText && typeof summaryText === "string")
      ? summaryText.trim()
      : "Document generated and stored in corporate records.";

    const isLegalDeed =
      documentType === "Legal Deed" ||
      documentType === "Sale Agreement" ||
      documentType === "Possession Affidavit";

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

    // Execute atomic dual-write transaction linking Document and Governance Approval
    const created = await prisma.$transaction(async (tx) => {
      const inserted = await tx.$queryRaw<any[]>`
        INSERT INTO ai_documents_legal (
          tenant_id, document_title, document_type, target_project_or_buyer,
          generation_timestamp, verification_status, requires_hitl, summary_text
        ) VALUES (
          ${tenantId}::uuid, ${documentTitle.trim()}, ${documentType.trim()}, ${trimmedProject},
          NOW(), ${status}, ${requiresHitl}, ${trimmedSummary}
        )
        RETURNING *
      `;

      const doc = inserted[0];

      if (requiresHitl) {
        await tx.$executeRaw`
          INSERT INTO ai_intelligence_approvals (
            tenant_id, title, category, target_reference, target_id, amount, justification, status, requires_hitl
          ) VALUES (
            ${tenantId}::uuid,
            ${documentTitle.trim()},
            'LEGAL_DEED',
            ${trimmedProject},
            ${doc.id}::uuid,
            0,
            'High-stakes legal instrument requires Governance Director verification before execution',
            'PENDING_APPROVAL',
            true
          )
        `;
      }

      return doc;
    });

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
