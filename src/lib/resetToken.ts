import { createHmac } from "node:crypto";
import { SESSION_SECRET } from "@/lib/config";

export const RESET_TTL_MINUTES = 30;

export function hashResetToken(token: string): string {
  return createHmac("sha256", SESSION_SECRET).update(token).digest("hex");
}
