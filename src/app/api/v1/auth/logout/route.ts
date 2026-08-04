import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    status_code: 200,
    timestamp: new Date().toISOString(),
    request_id: `req-${Date.now()}`,
    data: { success: true },
    error: null,
    meta: null,
  });

  response.cookies.delete("avenue_session");
  return response;
}
