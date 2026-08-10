import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_ID } from "@/lib/tenant";
import { envelope } from "@/lib/apiAccess";
import { checkPasswordPolicy, hashPassword } from "@/lib/password";
import { clientAddress } from "@/lib/session";
import { checkLoginRateLimit, recordLoginAttempt } from "@/lib/rateLimit";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function trimmedString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

/**
 * Self-service onboarding request.
 *
 * The submitted account is always created as PENDING_APPROVAL with the lowest-privilege
 * role. Role, status and tenant are never taken from the request body, so registration
 * cannot be used to mint an administrator. The response is deliberately identical whether
 * or not the address is already registered, so the endpoint cannot enumerate accounts.
 */
export async function POST(request: NextRequest) {
  const ipAddress = clientAddress(request);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return envelope(400, {
      error: { code: "MALFORMED_REQUEST", message: "Request body must be valid JSON." },
    });
  }

  const fullName = trimmedString(body.fullName, 255);
  const email = trimmedString(body.email, 255)?.toLowerCase() ?? null;
  const department = trimmedString(body.department, 100) ?? "Operations";
  const designation = trimmedString(body.designation, 100) ?? "Associate";
  const password = body.password;

  if (!fullName || !email) {
    return envelope(400, {
      error: { code: "MISSING_FIELDS", message: "Full name and email address are required." },
    });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return envelope(400, {
      error: { code: "INVALID_EMAIL", message: "Enter a valid email address." },
    });
  }

  const policy = checkPasswordPolicy(password);
  if (!policy.valid) {
    return envelope(400, {
      error: { code: "WEAK_PASSWORD", message: policy.message ?? "Password does not meet policy." },
    });
  }

  const acknowledgement = {
    submitted: true,
    message:
      "Your onboarding request has been recorded. An administrator must approve the account before sign-in is possible.",
  };

  try {
    const limit = await checkLoginRateLimit(email, ipAddress);
    if (!limit.allowed) {
      const response = envelope(429, {
        error: {
          code: "TOO_MANY_ATTEMPTS",
          message: "Too many onboarding requests from this origin. Try again later.",
        },
      });
      response.headers.set("Retry-After", String(limit.retryAfterSeconds));
      return response;
    }

    const passwordHash = await hashPassword(password as string);

    await prisma.$executeRaw`
      INSERT INTO system_users (
        tenant_id, full_name, email, password_hash, department, designation,
        role, status, mfa_enabled, password_changed_at
      ) VALUES (
        ${ACTIVE_TENANT_ID}::uuid, ${fullName}, ${email}, ${passwordHash},
        ${department}, ${designation}, 'Site Engineer', 'PENDING_APPROVAL', false, NOW()
      )
      ON CONFLICT (email) DO NOTHING
    `;

    await recordLoginAttempt(email, ipAddress, false);

    return envelope(201, { data: acknowledgement });
  } catch (err) {
    console.error("[auth/register] failed", err);
    return envelope(503, {
      error: {
        code: "REGISTRATION_UNAVAILABLE",
        message: "Onboarding requests cannot be accepted at the moment. Please retry shortly.",
      },
    });
  }
}
