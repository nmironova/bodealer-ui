# Working on Bodealer UI

This file applies to this repository. Read [docs/project-context.md](docs/project-context.md) for architecture, product decisions, commands, and known limitations.

## Working conventions

- Inspect the existing implementation before changing behavior. Reuse the existing components, form validation, state, and API integration where practical.
- Keep changes focused on the user's request. Preserve unrelated work and avoid introducing large UI libraries for small changes.
- Use the existing TypeScript, React, Tailwind, and CSS approach. Keep controls responsive and accessible, including keyboard interaction and visible focus.
- Keep backend URLs and credentials on the server. Never include secret values in documentation or client code.
- When starting a local server for verification, stop the process you started when finished unless the user asks to keep it running. Do not stop unrelated processes.

## Product invariants

- Preserve backend API contracts, solver behavior, board file compatibility, and restriction validation unless the requested task explicitly changes them.
- The primary workflow is repeated analysis of the same hand. Keep setup and results visible together on desktop and stack them on small screens.
- Configuration edits must retain previous results and mark them as belonging to a previous configuration. Starting a new run may replace the displayed output.
- Keep incomplete hands editable. Require exactly 13 cards when submitting an analysis.
- Preserve every restriction editor, advanced combinations, and LHO/RHO swapping. Compact summaries must reflect actual field values.
- Load and Save retain the existing versioned JSON format. Clear resets setup to defaults, including the hand and restrictions, while retaining results.
- Preserve the original server-provided Walrus text and whitespace. Support horizontal and vertical scrolling, copying all available output, collapsing the console, and opening a larger view.
- Do not invent result statistics. Any future parser belongs outside visual components and needs tests with representative real output; omit metrics that cannot be extracted reliably.

## Validation and maintenance

- Run checks appropriate to the change; see the commands and caveats in the project context. Do not run autofixing repository-wide commands merely to inspect lint status.
- Use meaningful tests for behavior changes. Documentation-only changes need formatting and link checks, not a running app.
- Report checks actually run, failures, and any untested behavior. Distinguish existing issues from regressions.
- Update the project context when architecture, commands, important behavior, or known limitations change. Keep verified facts separate from future work; do not store transient logs or secrets here.
