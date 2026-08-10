const NODE_ENV = process.env.NODE_ENV ?? "development";

export const IS_PRODUCTION = NODE_ENV === "production";

function readRequiredSecret(name: string, minimumLength: number): string {
  const raw = process.env[name];

  if (!raw || raw.trim().length === 0) {
    if (IS_PRODUCTION) {
      throw new Error(
        `${name} is not configured. Set it to a random value of at least ${minimumLength} characters before starting the platform in production.`
      );
    }
    return `development-only-${name.toLowerCase()}-do-not-use-in-production`;
  }

  const value = raw.trim();

  if (value.length < minimumLength) {
    throw new Error(`${name} must be at least ${minimumLength} characters.`);
  }

  if (IS_PRODUCTION && value.startsWith("development-only-")) {
    throw new Error(`${name} still holds the development placeholder value. Generate a real secret.`);
  }

  return value;
}

function readBoolean(name: string, productionDefault: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") {
    return IS_PRODUCTION ? productionDefault : false;
  }
  return raw.trim().toLowerCase() === "true";
}

function readPositiveInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number. Received "${raw}".`);
  }
  return parsed;
}

export const SESSION_SECRET = readRequiredSecret("SESSION_SECRET", 32);

export const SESSION_COOKIE_NAME = "avenue_session";

export const SESSION_TTL_HOURS = readPositiveInteger("SESSION_TTL_HOURS", 12);

export const SESSION_ABSOLUTE_TTL_HOURS = readPositiveInteger("SESSION_ABSOLUTE_TTL_HOURS", 720);

export const COOKIE_SECURE = readBoolean("COOKIE_SECURE", true);

export const ALLOW_RUNTIME_DDL = readBoolean("ALLOW_RUNTIME_DDL", false) || !IS_PRODUCTION;

export const LOGIN_MAX_ATTEMPTS = readPositiveInteger("LOGIN_MAX_ATTEMPTS", 8);

export const LOGIN_ATTEMPT_WINDOW_MINUTES = readPositiveInteger("LOGIN_ATTEMPT_WINDOW_MINUTES", 15);

export const PASSWORD_MIN_LENGTH = readPositiveInteger("PASSWORD_MIN_LENGTH", 12);

if (IS_PRODUCTION && !COOKIE_SECURE) {
  console.warn(
    "[config] COOKIE_SECURE is false in production. Session cookies will be transmitted over plain HTTP."
  );
}
