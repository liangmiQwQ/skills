---
outline: deep
---

# Project Setup {#setup}

## `void info` {#void-info}

```sh
void info
void info --json
```

Shows each Durable State and WebSocket definition's source file, inferred or explicit name, Worker class, and binding. WebSocket entries also include their route in JSON output. It runs locally without authentication, network requests, or file generation.

Before moving a deployed definition, copy the suggested `name` into `defineDurableState()`, `defineRoom()`, or `defineWebSocket()`. Keep that name after moving the file to preserve the resource. See [Durable State](../../guide/durable-state.md#rename-a-file-while-keeping-its-state) and [WebSockets](../../guide/websockets.md#move-a-route-while-keeping-its-state) for migration flows, including WebSocket parameter renames.

Resources recorded in `void.lock.json` without a matching definition appear separately. Adopt a suggested name only after identifying the resource you moved. If Void cannot suggest a name, restore its original source and inspect it before moving it again.

`--json` returns `resources` and `recordedResources`. Current entries contain `file`, `definition`, `name`, `nameSource` (`inferred` or `explicit`), `className`, `bindingName`, and an optional `route`. Recorded entries contain `className` and `bindingName`, with `name` and `definition` when a matching name is available.

## `void migrate` {#void-migrate}

`void migrate` converts legacy `void.json` and root `wrangler.jsonc` or `wrangler.json` files into `void.config.ts`. It also accepts one root `wrangler*.json(c)` file referenced by a supported framework adapter. Void saves backups in `.void/config-migration/`, records resource IDs in `void.lock.json`, and updates supported adapters to use its generated Cloudflare config.

`.void-wrangler.jsonc` is generated for Cloudflare tooling and belongs in `.gitignore`; migration adds the entry. Review and commit `void.config.ts`, `void.lock.json`, and `.gitignore`. `void init` and `void deploy` migrate legacy files automatically. If the project has conflicting or multiple Cloudflare configs, resolve them first. The project's installed `void` package must match the CLI version before Cloudflare deployment.

## `void init` {#void-init}

```sh
void init [--tsconfig] [--github] [--agents] [--git | --no-git]
```

Set up a new or existing Void project. In an empty directory, choose Vite+ or Vite, a framework, and a D1, PostgreSQL, MySQL, or Static Pages starter.

In an existing app, Void adds missing dependencies and scripts and updates the Vite config. If it cannot edit your config, it prints the snippet to add.

The wizard also sets up TypeScript, agent instructions, environment declarations, and a deployment target. Choose Cloudflare, a Void platform, or skip deployment setup. If you skip sign-in, run `void connect` when you're ready. See [Quick Start](../../guide/quickstart.md).

Outside an existing repository or workspace package, Void offers to initialize Git. Use `--git` to initialize without a prompt or `--no-git` to skip it. CI requires `--git` to initialize. Workspace packages do not accept these flags.

Run selected setup steps with:

| Flag         | Purpose                                                        |
| ------------ | -------------------------------------------------------------- |
| `--tsconfig` | Update TypeScript configuration, preserving existing settings. |
| `--agents`   | Set up agent instructions and skills for detected agents.      |
| `--github`   | Create the GitHub Actions deployment workflow.                 |

These flags can be combined and skip the other wizard steps. Add `--git` if you also want Git initialization.

For Cloudflare workflows, add a `CLOUDFLARE_API_TOKEN` repository secret. PostgreSQL and MySQL apps also need `DATABASE_URL`.

Void platforms with GitHub Actions support use short-lived OIDC credentials. Authorize the repository with `void github connect <project> --repo <owner/repo> --executor github_actions`. Core self-hosted platforms do not support that integration. See [Deployment](../../guide/deployment.md#github).

## `void prepare` {#void-prepare}

```
void prepare
```

Generates Void’s types and TypeScript configuration without starting the dev server or building the app. Run it after a fresh clone or before typechecking in CI.

## Agent {#agent}

### `void init --agents` {#void-init-agents}

Adds Void instructions to `AGENTS.md` and links skills for detected coding agents. Existing instructions outside the Void block are preserved.

If no supported agent is detected, `AGENTS.md` links to the bundled docs. See [Coding Agents](../../integrations/agents.md).
