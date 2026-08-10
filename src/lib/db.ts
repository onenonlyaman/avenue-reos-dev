import { PrismaClient } from "@prisma/client";
import { ALLOW_RUNTIME_DDL, IS_PRODUCTION } from "@/lib/config";

const configuredUrl = process.env.DATABASE_URL;

if (!configuredUrl) {
  throw new Error("DATABASE_URL is not configured. Set it before starting the platform.");
}

export const CONFIGURED_POOL_SIZE = Number(process.env.DATABASE_POOL_SIZE) || 10;

const connectionLimit = CONFIGURED_POOL_SIZE;
const poolTimeoutSeconds = Number(process.env.DATABASE_POOL_TIMEOUT_SECONDS) || 20;
const connectTimeoutSeconds = Number(process.env.DATABASE_CONNECT_TIMEOUT_SECONDS) || 10;

function withPoolParameters(rawUrl: string): string {
  const cleanedUrl = rawUrl.replace(/"/g, "").trim();
  let url: URL;
  try {
    url = new URL(cleanedUrl);
  } catch {
    throw new Error("DATABASE_URL is not a valid connection URL.");
  }

  if (!/^postgres(ql)?:$/.test(url.protocol)) {
    throw new Error(`DATABASE_URL must be a PostgreSQL URL. Received protocol "${url.protocol}".`);
  }

  if (IS_PRODUCTION && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) {
    console.warn(
      "[db] DATABASE_URL points at localhost while NODE_ENV=production. Confirm this is the intended production database."
    );
  }

  if (!url.searchParams.has("connection_limit")) {
    url.searchParams.set("connection_limit", String(connectionLimit));
  }
  if (!url.searchParams.has("pool_timeout")) {
    url.searchParams.set("pool_timeout", String(poolTimeoutSeconds));
  }
  if (!url.searchParams.has("connect_timeout")) {
    url.searchParams.set("connect_timeout", String(connectTimeoutSeconds));
  }
  return url.toString();
}

const dbUrl = withPoolParameters(configuredUrl);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  avenueDdlApplied: Set<string> | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: dbUrl,
    log: IS_PRODUCTION ? ["error"] : ["error", "warn"],
  });

if (!IS_PRODUCTION) {
  globalForPrisma.prisma = prisma;
}

export const DATA_SERVICE_UNAVAILABLE_MESSAGE =
  "Records are temporarily unavailable while the platform restores its data connection.";

const appliedDdl = (globalForPrisma.avenueDdlApplied ??= new Set<string>());

/**
 * Guard for the `CREATE TABLE IF NOT EXISTS` statements that route handlers historically
 * issued on every request.
 *
 * Schema is owned by `migrations/`. In production this is a no-op, so no request path
 * takes a DDL lock and the application database role does not need DDL rights. Outside
 * production the statement still runs, but only once per statement per process, so local
 * work against a database that has not been migrated keeps working.
 */
export async function runtimeDdl(key: string, statement: () => Promise<unknown>): Promise<void> {
  if (!ALLOW_RUNTIME_DDL) return;
  if (appliedDdl.has(key)) return;
  appliedDdl.add(key);
  try {
    await statement();
  } catch (err) {
    appliedDdl.delete(key);
    console.error(`[db] runtime DDL "${key}" failed`, err);
    throw err;
  }
}

export async function assertDatabaseReachable(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}
