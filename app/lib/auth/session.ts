import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

type Environment = Record<string, string | undefined>;
export type AuthConfig = {
  password: string;
  secret: string;
  ttlSeconds: number;
  production: boolean;
};
export type Session = { v: 1; iat: number; exp: number; id: string };

export function authConfig(env: Environment = process.env): AuthConfig {
  if (!env.BETA_PASSWORD) throw new Error("BETA_PASSWORD is required.");
  if (!env.SESSION_SECRET || Buffer.byteLength(env.SESSION_SECRET) < 32)
    throw new Error("SESSION_SECRET must contain at least 32 bytes.");
  if (env.SESSION_SECRET === env.BETA_PASSWORD)
    throw new Error("SESSION_SECRET must differ from BETA_PASSWORD.");
  const ttlSeconds = Number(env.SESSION_TTL_SECONDS ?? 604800);
  if (
    !Number.isSafeInteger(ttlSeconds) ||
    ttlSeconds < 60 ||
    ttlSeconds > 31536000
  )
    throw new Error(
      "SESSION_TTL_SECONDS must be an integer between 60 and 31536000.",
    );
  return {
    password: env.BETA_PASSWORD,
    secret: env.SESSION_SECRET,
    ttlSeconds,
    production: env.NODE_ENV === "production",
  };
}

export function cookieName(config: AuthConfig) {
  return config.production ? "__Host-bodealer_beta" : "bodealer_beta";
}

export function cookieOptions(config: AuthConfig) {
  return {
    httpOnly: true,
    secure: config.production,
    sameSite: "lax" as const,
    path: "/",
    maxAge: config.ttlSeconds,
  };
}

export function correctPassword(password: string, config: AuthConfig) {
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(password), hash(config.password));
}

function signature(payload: string, config: AuthConfig) {
  // Binding the key to the password also invalidates sessions on password rotation.
  const key = createHmac("sha256", config.secret)
    .update("bodealer-beta-session:v1:")
    .update(config.password)
    .digest();
  return createHmac("sha256", key).update(payload).digest();
}

export function createSession(
  config: AuthConfig,
  now = Math.floor(Date.now() / 1000),
) {
  const session: Session = {
    v: 1,
    iat: now,
    exp: now + config.ttlSeconds,
    id: randomBytes(16).toString("hex"),
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${signature(payload, config).toString("base64url")}`;
}

export function verifySession(
  value: string | undefined,
  config: AuthConfig,
  now = Math.floor(Date.now() / 1000),
): Session | null {
  if (!value || value.length > 1024) return null;
  const parts = value.split(".");
  if (
    parts.length !== 2 ||
    !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))
  )
    return null;
  const [payload, encodedSignature] = parts;
  const actual = Buffer.from(encodedSignature, "base64url");
  const expected = signature(payload, config);
  if (
    actual.toString("base64url") !== encodedSignature ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    return null;
  try {
    const decoded = Buffer.from(payload, "base64url");
    if (decoded.toString("base64url") !== payload) return null;
    const session = JSON.parse(decoded.toString("utf8")) as Session;
    if (
      !session ||
      session.v !== 1 ||
      !Number.isSafeInteger(session.iat) ||
      !Number.isSafeInteger(session.exp) ||
      session.iat > now ||
      session.exp <= now ||
      session.exp <= session.iat ||
      session.exp - session.iat > config.ttlSeconds ||
      !/^[a-f0-9]{32}$/.test(session.id)
    )
      return null;
    return session;
  } catch {
    return null;
  }
}
