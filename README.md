# Bodealer UI

A Next.js application for configuring bridge deal analyses and reviewing output from the Bodealer/Walrus service.

## Project knowledge

- [Working conventions](AGENTS.md): guidance for contributors and coding agents.
- [Project context](docs/project-context.md): architecture, product decisions, file compatibility, validation commands, and known limitations.

## Local development

Run commands from this directory, which is the application and Git root.

```sh
pnpm install --frozen-lockfile
npm run dev -- --hostname 127.0.0.1
```

Open [New analysis](http://127.0.0.1:3000/boards/new). Live task execution requires server-side `BODEALER_URL` and, for the proxy routes, `BODEALER_API_KEY` configuration. Keep credentials in local environment settings rather than source control.

See the [development and validation notes](docs/project-context.md#development-and-validation) for checks, browser test prerequisites, and existing tooling limitations.
