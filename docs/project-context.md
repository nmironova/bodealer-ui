# Bodealer UI project context

Last reviewed: 2026-11-26. This document records verified implementation details and decisions from the project conversation. Check the source when behavior changes.

## Purpose and design decisions

Bodealer UI configures bridge deal analyses and displays output from the external Bodealer/Walrus service. The main workflow is to select a hand, tune contracts and restrictions, run an analysis, inspect output, and repeat without navigating away.

The current analysis page follows the hybrid workbench proposals in `docs/design/`: spacious initial setup with inline hand selection, then an editable 35/65 setup/results workspace after submission. On mobile, workbench mode shows Setup and Results tabs rather than stacking both panels. The visual style uses compact controls, pale panels, blue primary actions, and a dark raw-output console.

Clear was subsequently added beside Load and Save. It clears board details, hand, restrictions, and combinations and restores calculation defaults. Previous results remain visible. It does not cancel a running task.

The Run action is available both beside View config/Load/Save/Clear and in its original position below setup. Both render the same button definition, target the same form, and share validation, pending, running, and cancellation disabled states.

The setup has three CSS presentation states using the same mounted components. With an inline editor expanded, the shared wrapper has no visible surface/title: Hand and Calculation are independent sections stacked in the left area, matching main’s expanded card-entry arrangement: the hand summary sits to the left of the picker on desktop. The expanded `.hand-editor-content` uses a 155px summary column and a flexible editor column with a 16px gap. The selected-hand input stays below the picker in the editor column. Below 761px they stack. No fixed/minimum editor heights are used. Browser checks verify matching top coordinates, all 13 ranks on each desktop suit row, and input alignment; actual screenshots are inspected. Closed setup and running/results presentations are unaffected. When both editors are closed, their compact summaries share one content-sized, two-column Analysis configuration surface. Restrictions stays adjacent on desktop. During running/completed analyses, Hand and Calculation remain vertically stacked as independent compact sections beside the dominant Results panel. Mobile stacks all setup sections. No fixed editor heights, placeholder space, duplicate controls, or configuration state were added. Edit calculation exposes all existing fields, and opening/closing editors preserves Save/Load and submission values.

A complete hand's editor stays open until focus or a pointer interaction moves outside its section. Hide cards also collapses it explicitly; Edit hand or the summary reopens it inline. Incomplete/invalid hands do not auto-collapse. Standard bridge suit glyphs use text rendering with red hearts/diamonds and theme-aware spades/clubs.

## Stack and repository layout

The Git repository and application root are the directory containing this file's parent `docs/`, `package.json`, and `app/`. In the current workspace this is the nested `bodealer-ui/` directory, not its enclosing workspace folder.

The app uses Next.js 16.1.1 App Router, React 19.2.3, TypeScript, Tailwind CSS 4, and plain CSS. `pnpm-lock.yaml` is the checked-in lockfile. No UI component library was added for the redesign.

| Location                            | Responsibility                                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| `app/boards/new/page.tsx`           | New analysis page and navigation                                                                |
| `app/boards/new/new-board.form.tsx` | Setup controls, file actions, form state, submission, cancellation, and configuration snapshots |
| `app/boards/new/results-panel.tsx`  | Status polling, retained output, connection retry, copy, and expanded console                   |
| `app/ui/hand-picker.tsx`            | Four-suit hand summary, text input, and interactive 52-card selector                            |
| `app/ui/button.tsx`                 | Shared button variants                                                                          |
| `app/globals.css`                   | Global styles and analysis page layout/console styles                                           |
| `app/lib/actions.ts`                | Session-checked, rate-limited task submission Server Action                                     |
| `app/lib/prepare-task.ts`           | Pure form validation and Walrus config preparation                                              |
| `app/lib/bodealer-form.ts`          | Form conversion, restriction/combinations validation, and DTO construction                      |
| `app/lib/dto/task-config.ts`        | Configuration types                                                                             |
| `app/lib/walrus-config.ts`          | Converts task configuration to Walrus text                                                      |
| `app/lib/board-config-file.ts`      | Versioned board file creation, loading, and filenames                                           |
| `app/lib/task-status.ts`            | Status and response types                                                                       |
| `app/lib/normalize-task-status.ts`  | Normalizes upstream status responses and output aliases                                         |
| `app/api/tasks/[taskId]/route.ts`   | Server-side task status and cancellation proxy                                                  |
| `app/api/tasks/route.ts`            | Separate JSON task-creation proxy; the New Board form uses the server action instead            |
| `tests/api/declarer.spec.ts`        | Declarer config uploads, validation, board-file round trips, and legacy defaults                |
| `tests/api/task-status.spec.ts`     | Status normalization and output preservation tests                                              |
| `tests/new-board.spec.ts`           | File handling, hand editing, swapping, console interaction, and responsive layout tests         |

## Hybrid analysis workbench

- `new-board.form.tsx` remains the controller for string-valued configuration, file actions, submitted snapshots, Server Action execution, cancellation, and the last task. Authentication, backend routes, DTO conversion, Walrus generation, and JSON formats were not rewritten for this redesign.
- `app/ui/editor-section.tsx` provides an inline editor during setup and a native modal drawer in workbench mode. Editor children stay mounted once inside the form, so closed drawers and hidden mobile panels retain values and participate in submission and Save. Native dialogs provide focus containment and Escape/Done closure; no UI dependency was added.
- `app/ui/hand-picker.tsx` retains the original parser, selection state, rank order, and serialization. The selected hand is always four vertical suit rows. The single editor shows suit symbols, all thirteen ranks, selected states, and text input. Initial setup displays it inline; after submission the summary/Edit action opens its drawer.
- `restriction-editors.tsx` contains the extracted existing ranges, suit points, shape checkbox, and any/exclusion editors. `restrictions-panel.tsx` provides compact active summaries and per-player opening. Field names and LHO/RHO swapping are unchanged. Numeric range controls show bounds/inverted-range errors without clamping values.
- `calculation-editor.tsx` preserves all existing controls and provides the compact contract/declarer/deals/postmortem summary. It uses the same mounted fields in both modes.
- The parent adds client-side safeguards using the existing restriction/combination validators and hand parser before an explicit Run action. It retains authoritative server validation. Cross-hand feasibility checking remains deferred.
- Completed output stays visible during configuration edits. Both the setup and results show Settings modified when the editable configuration differs from the submitted snapshot. Field changes never start a calculation automatically.
- `results-panel.tsx` retains polling and output snapshots. Raw text remains untouched with two-axis scrolling, Copy, and Expand. The expanded text is mounted only while its dialog is open, and line counting avoids allocating a large array. The normal viewer is approximately 410px on desktop/390px on mobile, with a larger 75-viewport-height view.
- `workbench.module.css` owns analysis/editor layout and responsive styling. `globals.css` retains shared navigation and raw-console styles; obsolete analysis-specific layout rules were removed. The analysis page supplies a scoped mobile navigation class without changing the dashboard.
- Browser regressions cover initial setup, drawers after results, old-output retention, reruns using changed values, closed-drawer Save/Load, advanced restriction groups, mobile tabs, full-output Copy/Expand/scrolling, cancellation, and widths from 390 to 1536px.

Screenshots from synthetic test data are saved under `artifacts/workbench/`: `desktop-setup.png`, `desktop-workbench.png`, and `mobile-results.png`. Live VPS smoke testing is still separate; the suite does not contact the deployed backend.

## Dashboard design and data

`/dashboard` has a compact workspace header, New analysis action, Running/Queued/Completed summary cards, and a Recent analyses panel. The shared `app/ui/workspace-navigation.tsx` reuses the existing navy header. The dashboard includes its active Dashboard link; `/boards/new` uses the same component with its original navigation items, markup, and classes to preserve its layout. Tasks and Completed pages are unchanged.

`app/dashboard/dashboard-content.tsx` fetches the authenticated local `GET /api/tasks` on mount and refreshes every 15 seconds. That API uses the existing session guard and server-only Bearer helper to call the backend's real `GET /tasks`. It returns only `id`, `status`, and `createdAt`, excluding process paths, PIDs, errors, and other internal state. The pure `app/lib/task-list.ts` validates the complete response, derives counts, and sorts the five newest analyses. Completed counts include only `completed`, not failed/cancelled tasks. Dates display in the browser's locale/timezone.

Loading and unavailable counts use non-numeric placeholders; the empty state appears only after a successful empty response. Errors offer Retry; expired sessions offer Sign in. Unexpected response schemas are unavailable, never silently converted to an empty list.

The inspected backend stores no task name or numeric progress in its list records, so rows use an `Analysis <short ID>` fallback and omit progress. No individual task/result details page exists in this UI; recent rows deliberately have no invented or misleading detail links. View all goes to `/boards/running`, which remains a placeholder outside this redesign's scope. Adding metadata/progress or individual task views is future work.

## Login visual design

The login uses a centered card with a 512px maximum width on a pale blue-gray background, Bodealer branding and Private beta badge, a decorative CSS fan of four suits, and the heading “Welcome to the table.” Styles are isolated in `app/login/login.module.css`; dashboard and analysis layouts are unaffected. The form has a show/hide toggle and retains its password locally after validation errors. Server-side authentication, rate limits, session/cookie settings, and environment configuration remain unchanged. There are no animations or external image/UI dependencies. Browser tests cover keyboard navigation, focus, Enter submission, password retention/visibility, mobile overflow, and a reduced-height viewport simulating keyboard constraints.

## Beta authentication

The shared-password beta is implemented without accounts, a database, or OAuth. See [README](../README.md) for required environment variables, deployment, rotation, and security limitations.

- `/login` verifies `BETA_PASSWORD` server-side. `app/lib/auth/session.ts` signs sessions with HMAC-SHA256 and checks signatures and expiration. Cookies are HttpOnly, SameSite=Lax, and Secure in production; default lifetime is 7 days via `SESSION_TTL_SECONDS`.
- Signatures are bound to both the password and `SESSION_SECRET`; rotating either invalidates sessions on the updated deployment. Logout is a same-origin POST to `/logout` that clears the browser cookie.
- `proxy.ts` redirects unauthenticated page visits and returns API 401 responses. Every protected page and task operation also checks authentication. Server Actions perform their own checks so session-expiry redirects use Next.js's action protocol.
- `app/lib/backend.ts` is server-only, rechecks the session, and sends `Authorization: Bearer <BACKEND_API_TOKEN>` to `BODEALER_API_URL`. Redirects are disabled; requests time out after 20 seconds. Tokens and backend URLs are not passed as client props.
- `instrumentation.ts` validates production configuration during server initialization. No auth bypass is provided for local development.
- Local login/submission counters are bounded, per-process safeguards only. Production-wide limits must be configured in Vercel Firewall as documented in README; no external infrastructure has been provisioned.
- Synthetic credentials in `tests/fixtures/test-env.mjs` are test-only values. The test harness uses a fake backend, never the VPS.

## Color themes

Light, Dark, and System are available through a shared native select in the workspace navigation and below the login form. System is the default and follows live `prefers-color-scheme` changes. An explicit preference is saved locally under `bodealer-theme`, synchronized between tabs, and independent of analysis settings and board files. Storage failures fall back to an in-memory preference for the current page.

`app/lib/theme.ts` owns the theme values/type, default, storage/event keys, media query, and startup script generated from those constants. CSS selectors retain literal `data-theme="dark"` because CSS cannot import TypeScript constants.

`app/layout.tsx` sets the resolved `data-theme` before body rendering using a small static head script, preventing a light flash for stored dark preferences. The root `ThemeSync` keeps the theme current across all routes; `theme-selector.tsx` uses the browser preference as an external store, with a deterministic server snapshot. The hydration effect reads the real browser preference rather than temporarily applying the server snapshot.

`globals.css` defines the dark semantic palette and native `color-scheme`. CSS modules use shared surface/text/border/status/focus variables with their original light colors as fallbacks. Existing Tailwind editor utilities map to the same dark palette. Navigation and terminal/code output keep their deliberately dark palettes in both modes. No additional theme library or backend changes were introduced.

Hearts/diamonds remain red, with a brighter red for contrast in dark mode. Spades/clubs use light text in dark mode. Shared suit classes cover the hand picker, restriction labels, contract buttons, and summary symbols; `suit-text.tsx` colors symbols in summaries without changing their text or configuration serialization.

Theme tests cover persistence, cross-tab synchronization, live system changes, pre-hydration application, unavailable storage, desktop/mobile layouts, suit colors, login errors, drawers, and retention of settings/results while switching. Synthetic screenshots are written under `artifacts/theme/`. The results summary uses a semantic surface in `results-panel.module.css` rather than an opacity-modified Tailwind background, so starting/running/completed notes and task IDs retain readable contrast in dark mode.

## Live upload preview

View config beside Load/Save/Clear opens a read-only Walrus text drawer (nonmodal desktop, full-screen modal mobile). The backend accepts multipart `configFile`, not JSON; the agreed preview shows its exact text, with Copy config and Download .txt. It does not expose credentials or replace version-1 board Save/Load files.

The preview derives from current configuration values and existing calculation defaults through the pure `prepareTask` function, also used by the server action and client submission guard. Validation errors replace the preview and disable Run/Copy/Download. Whole-number and valid/distinct-card checks now live in shared validation, so server submission also rejects values that previously only the browser rejected. Empty settings remain empty rather than reverting to defaults during edits. Browser tests compare copied/downloaded text byte-for-byte with the parsed multipart upload on desktop/mobile and cover live configuration updates.

## Configuration and data flow

1. A signed session is required. The client form stores string field values and submits with React `useActionState`.
2. `createBodealerTask` checks the session, origin, and submission limit. `prepareTask` validates input, creates a task DTO, and generates Walrus config text.
3. The server action sends the config as a multipart `configFile` to `${BODEALER_API_URL}/tasks` and expects an `id` in the response.
4. The results panel polls the local `/api/tasks/:taskId` route about every two seconds while running. It stops after a terminal status or five consecutive request failures; a Retry connection control is available.
5. The local route fetches upstream task status, using the shared normalizer. Cancellation uses DELETE through the same local route.

Server configuration now requires `BETA_PASSWORD`, `SESSION_SECRET`, `BODEALER_API_URL`, and `BACKEND_API_TOKEN`; `SESSION_TTL_SECONDS` is optional. The previous `BODEALER_URL`/`BODEALER_API_KEY` names and mixed unauthenticated/`X-API-Key` behavior are retired. All backend task requests now use Bearer authentication. Confirm that the VPS supports this contract before deployment; the backend repository is outside this change. Do not copy secret values from `.env.local` into documentation.

Supported statuses are running, completed, failed, and cancelled. The normalizer accepts the `result` alias for `resultText`, preserves available `logTail`, and maps `canceled` to `cancelled`. It also handles a known upstream detached-process error (`Cannot read properties of null (reading 'on')`) by continuing to poll, or treating an available result as completed. Preserve that compatibility behavior unless the upstream issue is verified resolved.

## Setup behavior and compatibility

Required-name and incomplete-hand messages are deferred until the user leaves the corresponding field/hand section. A fresh or cleared setup shows guidance and disabled Run buttons without an error banner. Explicitly loaded files validate immediately; View config still explains all invalid settings on request.

Each opponent has an explicit No overcall checkbox (`lho.noOvercall` / `rho.noOvercall`). A checked flag emits `EAST: NoOvercall` / `WEST: NoOvercall` alongside any other restrictions. Flags persist in version-1 board files, participate in opponent swapping and dirty-state detection, and appear in compact summaries. No partner option is exposed. Unchecked/absent flags emit no NoOvercall line: the old implicit fallback for otherwise-unrestricted opponents has been removed, so legacy boards must explicitly enable this option if desired.

Walrus config must repeat the selected `TASK NAME` as the task-body heading after the opening divider. Descriptions follow that heading; they must not replace it. Otherwise Walrus remains in its task-search state and reports “Task not found.” Regression coverage uses the reported ABC123 board with and without descriptions.

- Default calculation: `ONE_SIDED_BIDDING_LEVEL`, contract 4 spades with Partner (South) declaring, 10 thousand boards, postmortem `AUTO`, empty hand.
- Enabled task types: one-sided bidding level and seek opening lead. Other listed types are disabled.
- Declarer is selectable under Calculation: We (North) or Partner (South). The `contractDeclarer` form/file field is `N` or `S`; it becomes `calculation.targetContract.declarer` and the Walrus `PRIMARY SCORER: V<level><strain> BY <seat>` directive in the uploaded config. The fixed hand and restriction seats stay unchanged. Changing declarer participates in stale-results detection.
- Missing declarer values in older board files default to Partner (South), preserving the previous behavior. Clear also restores Partner. The config builder retains its legacy partner fallback when a DTO omits declarer.
- Hand text has four whitespace-separated suits in spades, hearts, diamonds, clubs order. `10` denotes ten; `-` denotes an empty suit. Example: `K865 AK1083 Q74 K`.
- The picker permits editing incomplete hands and selecting/deselecting cards, up to 13. Submission requires exactly 13 cards. Clicking the displayed hand (or activating it with Enter/Space) opens the existing editor and focuses the text input. The Edit hand action remains available.
- Board name is required, at most 100 characters; description is optional, at most 1000 characters. Board count is 1–200 thousands.
- Per-player restrictions use `partner`, `lho`, and `rho` prefixes. The fixed North view labels these Partner (South), East (LHO), and West (RHO).
- Existing restrictions include HCP, suit lengths, suit points, no 6+ card suit, and advanced combinations. Keep their existing validation and Walrus translation intact.
- Board files use `{ "format": "bodealer-board", "version": 1, "values": { ... } }`, with string field values. `combinations` is a JSON-encoded array string. Use the existing file helper rather than rebuilding the schema.
- Saving downloads a sanitized `<name>.bodealer.json` filename. Loading changes setup without discarding results.

## Results and raw output decisions

The app retains the last task and its submitted configuration separately from current form values. Editing settings displays a stale-results notice. Previous results also survive a subsequent submission that fails validation. Results live in component state; durable storage across reloads is not implemented.

The console uses the latest available `resultText`, falling back to `logTail`. These responses are snapshots; do not append overlapping tails. A server-provided tail may contain only part of the process output. The client cannot recover text the server never provided.

The workbench console's normal height is approximately 410px with scrolling in both directions, monospace type, preserved whitespace, and no line wrapping. Expand opens a native modal dialog with a roughly 75-viewport-height console. Close and Escape return to the dashboard. Copy uses the Clipboard API to copy the entire displayed output snapshot, regardless of scroll position.

Probability, number of deals analyzed, average score, and trick histogram are intentionally omitted. The available API returns text, and no reliable extraction contract or representative real-output fixtures were established. The reference image is a design reference, not evidence for a parser. A future parser must be separate from presentation and tested against real output samples before adding metrics.

## Development and validation

Run commands from the application/Git root. Install dependencies using the existing lockfile, for example `pnpm install --frozen-lockfile`.

```sh
npm run dev -- --hostname 127.0.0.1
npx tsc --noEmit
npx eslint .
npx prettier --check AGENTS.md README.md docs/project-context.md
npm run build
```

For focused changes, pass the changed source files to ESLint and Prettier. `npm run lint` and `lint:fix` both modify files; use `npx eslint` for a read-only check. `format:check` checks formatting across the repository.

The test runner is now declared in `package.json` and the lockfile. Install Chromium once with `pnpm exec playwright install chromium`, then run:

```sh
pnpm test
```

Playwright starts and stops an isolated Next.js app on port 3210 and a fake backend on 3211. It uses a separate `.next-test/` build directory and synthetic server-side credentials. The board UI fixture receives a valid test cookie; the auth suite explicitly exercises login, invalid/expired sessions, logout, CSRF checks, both task submission formats, output polling, cancellation, and credential absence from browser scripts/responses. No real solver run occurs.

Pure tests in `tests/api/` cover configuration preparation, declarer/file compatibility, session cryptography and expiry, local rate-limit windows, and task-status normalization. `tests/api/declarer.spec.ts` now tests pure preparation; the auth suite verifies the actual multipart Server Action upload.

Dashboard tests cover real-list proxy authentication/field filtering, counts, five newest records, loading/error/empty states, Retry, navigation, and responsive layout. The UI suite also checks incomplete-hand editing by clicking the hand summary, keyboard activation, Save/Load/Clear, restriction swapping, output expansion, responsive overflow, and desktop run-button visibility. Test server ports must be free; the harness deliberately does not reuse unrelated servers.

## Known limitations and previous validation

- Running Boards and Completed Boards pages remain placeholders. The dashboard now lists task summaries through the backend’s existing listing endpoint; individual task details pages are still missing.
- Live VPS/solver execution and production Firewall enforcement still need manual verification. The test backend proves UI integration behavior only.
- At redesign delivery on 2026-11-09, nine tests, the production build, TypeScript, changed-file lint, and formatting checks passed. After adding Clear, TypeScript, focused lint, and formatting checks passed. These are historical results, not a claim that checks were rerun for every later change.
- On 2026-11-13, the declarer setting passed 11 API/config tests (including mocked multipart uploads), five browser tests, TypeScript, focused lint, formatting checks, and a production build. No live solver run was performed.
- Repository-wide lint reported a pre-existing `@typescript-eslint/no-require-imports` error in `eslint/index.js`.
- Next.js downloads configured Geist fonts during builds; builds can fail when Google Fonts is unreachable.
- Local server/browser execution can require sandbox permission. The Playwright harness stops its own servers automatically; do not stop unrelated development processes.

## Keeping this knowledge useful

Record new product decisions and verified limitations here when they affect future work. Use `AGENTS.md` for working conventions and this document for project facts. Keep task-specific discussion and temporary command output out of both files.
