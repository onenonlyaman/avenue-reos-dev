import { PrismaClient } from "@prisma/client";

const configuredUrl = process.env.DATABASE_URL;

if (!configuredUrl) {
  throw new Error("DATABASE_URL is not configured. Set it before starting the platform.");
}

export const CONFIGURED_POOL_SIZE = Number(process.env.DATABASE_POOL_SIZE) || 10;

const connectionLimit = CONFIGURED_POOL_SIZE;
const poolTimeoutSeconds = Number(process.env.DATABASE_POOL_TIMEOUT_SECONDS) || 20;
const connectTimeoutSeconds = Number(process.env.DATABASE_CONNECT_TIMEOUT_SECONDS) || 10;

function withPoolParameters(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
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
  } catch {
    return rawUrl;
  }
}

const dbUrl = withPoolParameters(configuredUrl);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: dbUrl,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export const DATA_SERVICE_UNAVAILABLE_MESSAGE =
  "Records are temporarily unavailable while the platform restores its data connection.";

export async function withDatabase<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch {
    return fallback;
  }
}
