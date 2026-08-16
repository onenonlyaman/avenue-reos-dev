import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAccess, safeErrorMessage, envelope } from "@/lib/apiAccess";

export async function POST(request: NextRequest) {
  const auth = await requireApiAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== "string") {
      return envelope(400, {
        error: { code: "MISSING_ID", message: "Approval ID is required" },
      });
    }

    const tenantId = auth.user.tenantId;
    const reviewerName = auth.user.fullName || auth.user.email || "Governance Director";

    // Atomically authorize the approval and synchronize linked subsystem records
    const result = await prisma.$transaction(async (tx) => {
      const records = await tx.$queryRaw<any[]>`
        SELECT * FROM ai_intelligence_approvals
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;

      if (!records || records.length === 0) {
        return null;
      }

      const approval = records[0];

      await tx.$executeRaw`
        UPDATE ai_intelligence_approvals
        SET status = 'APPROVED',
            approved_by = ${reviewerName},
            reviewed_at = NOW()
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;

      // If this is a Legal Deed or linked Document, synchronize the verification status in ai_documents_legal
      if (approval.target_id) {
        await tx.$executeRaw`
          UPDATE ai_documents_legal
          SET verification_status = 'VERIFIED'
          WHERE id = ${approval.target_id}::uuid AND tenant_id = ${tenantId}::uuid
        `;
      } else if (approval.category === "LEGAL_DEED" && approval.title) {
        await tx.$executeRaw`
          UPDATE ai_documents_legal
          SET verification_status = 'VERIFIED'
          WHERE document_title = ${approval.title} AND tenant_id = ${tenantId}::uuid
        `;
      }

      return approval;
    });

    if (!result) {
      return envelope(404, {
        error: { code: "APPROVAL_NOT_FOUND", message: "Verification request not found for active tenant." },
      });
    }

    return envelope(200, {
      data: { success: true, id },
    });
  } catch (err: unknown) {
    return envelope(500, {
      error: {
        code: "AI_AUTHORIZE_ERROR",
        message: safeErrorMessage(err, "AI output could not be authorized"),
      },
    });
  }
}
