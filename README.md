# Bodealer UI

A Next.js application for configuring bridge deal analyses and reviewing Walrus output. The private beta uses one invitation password and signed sessions; it has no user accounts, database, or OAuth.

## Project knowledge

- [Working conventions](AGENTS.md)
- [Architecture and product context](docs/project-context.md)
- [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication)

## Required environment variables

Set these as **server-side** variables in Vercel Project Settings → Environment Variables for each deployment environment you intend to use. Never use a `NEXT_PUBLIC_` prefix.

| Variable              | Purpose                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `BETA_PASSWORD`       | Shared invitation password; use a strong, unique passphrase.                                                 |
| `SESSION_SECRET`      | Independent random signing secret, at least 32 bytes.                                                        |
| `BODEALER_API_URL`    | HTTPS base URL of the VPS backend, without credentials, query string, or fragment. A base path is supported. |
| `BACKEND_API_TOKEN`   | Private service credential, sent only as `Authorization: Bearer <token>`.                                    |
| `SESSION_TTL_SECONDS` | Optional session lifetime in seconds; default `604800` (7 days), allowed range 60–31536000.                  |

Generate separate secrets locally:

```sh
openssl rand -hex 32
```

Use one generated value for `SESSION_SECRET` and a different value for `BACKEND_API_TOKEN`. Do not paste private values into source code, screenshots, logs, or the test fixtures. Production initialization fails with a configuration error if required values are missing or invalid. Local development also requires explicit credentials; there is no authentication bypass.

`BODEALER_URL` and `BODEALER_API_KEY` are retired. Migrate to the variables above; legacy headers are no longer sent.

## Local development

Run from this directory (the application/Git root):

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
# Fill in .env.local with your own credentials before starting.
pnpm dev -- --hostname 127.0.0.1
```

Open [login](http://127.0.0.1:3000/login). For a local backend, `BODEALER_API_URL=http://127.0.0.1:YOUR_PORT` is permitted in development. Production requires HTTPS.

After sign-in, use the existing analysis controls normally. The selected declarer, restrictions, board files, raw output, reruns, and cancellation keep their existing behavior. The server action uploads multipart `configFile` data and returns the task ID; polling continues through local API routes rather than holding the submission open until the solver finishes. Upstream requests have a 20-second timeout. The backend must accept work asynchronously and return an ID promptly.

Sign out is available on the New analysis and dashboard pages. It is a same-origin POST that clears the cookie; no existing session is needed to clear it. A GET cannot log someone out.

## Session and backend protection

- Passwords are checked on the server using a constant-time comparison of fixed-length hashes.
- Sessions contain only a version, random session ID, issue time, and expiration. They are signed with HMAC-SHA256 using Node's cryptographic primitives; no password is stored in the cookie.
- The cookie is HttpOnly, SameSite=Lax, scoped to `/`, and Secure in production. Production uses the `__Host-bodealer_beta` name without a Domain attribute. Local HTTP development uses `bodealer_beta`.
- Signatures and expiration are checked on protected requests. Pages, task API handlers, and the task Server Action have their own checks. The Next.js Proxy provides early navigation redirects and API 401 responses; Server Actions perform their own checks to preserve Next.js redirect handling.
- Mutations require a same-origin request. Backend calls use a server-only module, disable caching and redirects, and never forward browser credentials to the VPS.
- Backend failures return sanitized messages while preserving HTTP error status codes. Backend URLs, credentials, and raw upstream error messages are not returned. Task results and intermediate Walrus output remain unchanged.
- The session lifetime is fixed rather than sliding. Logout deletes the current browser's cookie; without a session store, a copied cookie remains usable until expiry or credential rotation.

## Abuse protection before deployment

The app includes a bounded **per-process** safeguard: 5 login attempts per IP per 15 minutes, and 10 task submissions per session and IP per minute. The task limit applies to both the Server Action and JSON endpoint; polling and cancellation are not charged against submission limits.

**These counters are not production-wide rate limiting.** Serverless restarts and multiple instances reset/split them; forwarded IP headers are meaningful only behind a trusted proxy. They must not be treated as the production security boundary.

The smallest proposed production-wide solution, without introducing a database, is [Vercel Firewall rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting). Configure and verify the rules in the Vercel dashboard before inviting players:

1. Limit `POST /login` attempts per client IP (start with 5 attempts per 15 minutes, or the nearest supported window).
2. Limit `POST /api/tasks` and **all POST requests carrying the `Next-Action` header outside `/login`**. This covers task Server Actions even if called at a different page URL or with a changed action ID. Start with 10 submissions per IP per minute.
3. Return 429 when a limit is exceeded; verify enforcement using separate clients/instances. Exclude GET polling from these rules.

Plan availability, rule quotas, supported windows, and charges must be checked in the Vercel dashboard. If separate rules are unavailable, a stricter combined POST rule is an option for this small beta; agree on its usability tradeoff before launch. No paid service or firewall rule has been provisioned by this change. Do not launch relying only on the in-memory safeguard.

## VPS integration requirements

This repository does not contain or modify `bodealer-server` or the C++ solver. Configure the VPS service to validate `Authorization: Bearer <token>` on **every calculation endpoint**, using the same private token value as Vercel's `BACKEND_API_TOKEN`. Use the backend's actual environment-variable name (if adopting this contract, `BACKEND_API_TOKEN`); this UI cannot verify or change its configuration.

The VPS does **not** need `BETA_PASSWORD` or `SESSION_SECRET`. Browser sessions are validated by the UI, not by the solver service. Keep the VPS token private and terminate HTTPS with a valid certificate.

Required upstream contracts remain:

- `POST /tasks`: multipart `configFile` for the UI form; the existing JSON proxy also forwards JSON. Return a task record containing `id` without waiting for the calculation.
- `GET /tasks/:id`: running/completed/failed/cancelled status with available `resultText` or `result` and/or `logTail`.
- `DELETE /tasks/:id`: cancel the task; HTTP 204 is supported.

The old setup mixed unauthenticated multipart uploads with `X-API-Key` proxy calls. All paths now use Bearer authentication. Confirm backend support before deploying the UI. The dashboard uses the backend’s existing `GET /tasks` through an authenticated local proxy for counts and the five newest task summaries. Names and numeric progress are not available in list records, and no individual task details page exists yet. Running/Completed list pages remain placeholders. Invited players share access; there is no per-player task ownership.

## Deployment and rotation

Nothing is deployed automatically by this change.

1. Configure the VPS HTTPS endpoint, asynchronous task contract, and Bearer-token verification. Verify JSON and multipart creation, running output, final results, and cancellation.
2. Set the Vercel variables above, including Preview if using it. Secrets are required for production initialization/build workers as well as runtime. Use separate credentials for preview/testing where appropriate.
3. Configure and verify the Firewall rules described above. Restrict preview deployment access as appropriate for a private beta.
4. Run validation, deploy a preview intentionally, and manually verify login/logout and a real solver run on desktop/mobile.
5. Promote/deploy production only after those checks. Confirm unauthenticated APIs return 401 and browser requests never contain the backend token.

To rotate the shared password, update `BETA_PASSWORD` in Vercel and redeploy. Session signatures are bound to that password, so the new deployment rejects existing sessions. Rotating `SESSION_SECRET` also invalidates all existing sessions. Disable or remove older deployments that still have old credentials; changing environment variables alone does not retroactively update an already-running deployment.

To rotate the service token, generate a new independent value and coordinate the VPS and Vercel updates, then restart/redeploy each. Unless the backend supports a short overlap with two valid tokens, expect a brief interruption. Password/session rotation and backend-token rotation are independent.

## Validation

```sh
pnpm exec tsc --noEmit
pnpm exec eslint .
pnpm exec prettier --check .
pnpm test
pnpm build
```

`pnpm test` manages isolated local Next.js and fake-backend servers on ports 3210/3211, uses synthetic credentials, and stops its servers when finished. It never contacts the VPS. Chromium must be installed (`pnpm exec playwright install chromium` on first setup). Test output lives in ignored `test-results/`; the separate test Next.js build is `.next-test/`.

Tests cover password verification, signed/expired/tampered sessions, cookie flags, logout, protected pages and APIs, CSRF checks, local rate limits, multipart and JSON submission, intermediate polling, cancellation, declarer/config compatibility, responsive UI, and credential absence from browser responses/scripts. Real VPS integration and production Firewall enforcement require manual verification.

`pnpm lint` and `lint:fix` modify files; use `pnpm exec eslint .` for a read-only check. The existing CommonJS plugin entry at `eslint/index.js` has historically triggered `@typescript-eslint/no-require-imports`; report that separately from changes to app code.
