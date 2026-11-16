import { expect, test } from "@playwright/test";
import {
  authConfig,
  cookieName,
  cookieOptions,
  correctPassword,
  createSession,
  verifySession,
} from "../../app/lib/auth/session";
import { LocalRateLimiter } from "../../app/lib/auth/rate-limit";
import { testEnvironment } from "../fixtures/test-env.mjs";

const config = authConfig(testEnvironment);

test("correct and incorrect passwords use server-side verification", () => {
  expect(correctPassword(testEnvironment.BETA_PASSWORD, config)).toBe(true);
  for (const password of ["", "incorrect", `${testEnvironment.BETA_PASSWORD} `])
    expect(correctPassword(password, config)).toBe(false);
});

test("signed sessions expire and honor configurable lifetime", () => {
  const session = createSession(config, 1000);
  expect(verifySession(session, config, 1000)?.exp).toBe(1000 + 604800);
  expect(verifySession(session, config, 1000 + 604800)).toBeNull();
  expect(verifySession(session, config, 999)).toBeNull();
  const short = { ...config, ttlSeconds: 60 };
  expect(verifySession(createSession(short, 1000), short, 1060)).toBeNull();
});

test("missing, invalid and tampered sessions fail closed", () => {
  const session = createSession(config, 1000);
  const [payload, signature] = session.split(".");
  const altered = Buffer.from(
    JSON.stringify({ v: 1, iat: 1000, exp: 9999999, id: "a".repeat(32) }),
  ).toString("base64url");
  for (const value of [
    undefined,
    "",
    "not-a-session",
    session + ".extra",
    `${altered}.${signature}`,
    `${payload}.bad`,
    "x".repeat(2000),
  ])
    expect(verifySession(value, config, 1001)).toBeNull();
  expect(
    verifySession(
      session,
      { ...config, secret: config.secret + "rotated" },
      1001,
    ),
  ).toBeNull();
  expect(
    verifySession(session, { ...config, password: "rotated-password" }, 1001),
  ).toBeNull();
  expect(session).not.toContain(config.password);
  expect(Buffer.from(payload, "base64url").toString()).not.toContain(
    config.password,
  );
});

test("production cookie attributes and missing secrets", () => {
  const production = { ...config, production: true };
  expect(cookieName(production)).toBe("__Host-bodealer_beta");
  expect(cookieOptions(production)).toEqual({
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 604800,
  });
  expect(() => authConfig({})).toThrow("BETA_PASSWORD");
  expect(() =>
    authConfig({ BETA_PASSWORD: "x", SESSION_SECRET: "short" }),
  ).toThrow("SESSION_SECRET");
  expect(() =>
    authConfig({ ...testEnvironment, SESSION_TTL_SECONDS: "NaN" }),
  ).toThrow("SESSION_TTL_SECONDS");
});

test("local abuse protection rejects bursts and resets after its window", () => {
  const limiter = new LocalRateLimiter();
  expect(limiter.check("login:ip", 2, 1000, 100).allowed).toBe(true);
  expect(limiter.check("login:ip", 2, 1000, 200).allowed).toBe(true);
  expect(limiter.check("login:ip", 2, 1000, 300)).toEqual({
    allowed: false,
    retryAfter: 1,
  });
  expect(limiter.check("login:ip", 2, 1000, 1100).allowed).toBe(true);
});
