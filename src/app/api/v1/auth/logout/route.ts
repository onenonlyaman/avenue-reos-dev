import { NextRequest } from "next/server";
import { envelope } from "@/lib/apiAccess";
import { clearSessionCookie, readSessionToken, revokeSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const token = readSessionToken(request);

  if (token) {
    try {
      await revokeSession(token);
    } catch (err) {
      // The cookie is cleared regardless; a stranded server-side row expires on its own.
      console.error("[auth/logout] could not revoke session record", err);
    }
  }

  const response = envelope(200, { data: { success: true } });
  clearSessionCookie(response);
  return response;
}
