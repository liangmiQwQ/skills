---
outline: deep
---

# CLI

`void` is a local binary from the installed `void` package.

Use this page as a command reference. If you are setting up a project for the first time, start with [Quickstart](../guide/quickstart.md) and come back here when you need exact command behavior or flags.

## Cheat Sheet

| Command                           | Purpose                                                                       |
| --------------------------------- | ----------------------------------------------------------------------------- |
| `void deploy`                     | Build and deploy to the configured platform                                   |
| `void prepare`                    | Generate `.void` artifacts without starting Vite                              |
| `void gen model <name> [cols...]` | Scaffold migration + CRUD routes                                              |
| `void gen route <path>`           | Create an API route                                                           |
| `void db push`                    | Apply schema directly without migration files                                 |
| `void db generate`                | Generate SQL migrations from schema changes                                   |
| `void db status`                  | Show local/remote migration status                                            |
| `void db reset`                   | Drop and re-apply all migrations                                              |
| `void db seed`                    | Reset + seed local database                                                   |
| `void db execute <sql>`           | Run SQL against the database (--remote for deployed)                          |
| `void db studio`                  | Open Drizzle Studio (--remote for a deployed external database)               |
| `void secret put <name=value>`    | Set a production secret                                                       |
| `void secret list`                | List production secrets                                                       |
| `void secret sync .env`           | Bulk upload secrets from dotenv file                                          |
| `void env check [--remote]`       | Validate env.ts schema                                                        |
| `void env types`                  | Regenerate .void/env.d.ts from env.ts                                         |
| `void auth login`                 | Authenticate with Void                                                        |
| `void cloudflare login`           | Authenticate with Cloudflare through Void                                     |
| `void platform install`           | Install a company Void platform in Cloudflare                                 |
| `void connect <url>`              | Connect the CLI to a Void platform                                            |
| `void project link`               | Link directory to a project                                                   |
| `void project logs`               | Show runtime logs from deployed project                                       |
| `void project requests`           | Show request-level traffic (status, method, timing)                           |
| `void project rollback`           | Roll back to a previous deployment                                            |
| `void project cancel`             | Cancel an active deployment                                                   |
| `void project purge-cache`        | Purge all cached pages                                                        |
| `void build logs`                 | Stream, tail, or download build logs                                          |
| `void email status`               | Show email readiness on your own Cloudflare account (`--platform cloudflare`) |
| `void email setup`                | Set email up on your own Cloudflare account, without deploying                |
| `void email usage`                | Show monthly recipient attempts, inbound receipts, and quota                  |
| `void email logs`                 | Show recent email delivery activity                                           |
| `void email destinations`         | List verified recipient addresses                                             |
| `void email allow <address>`      | Add a recipient and send a verification email                                 |
| `void email disallow <address>`   | Remove a recipient from the allowlist                                         |
| `void email domain`               | Send and receive at your own domain on a Cloudflare zone                      |
| `void init`                       | Setup wizard for new or existing projects                                     |

## Binary Invocation

The docs use `void` for brevity. Outside package scripts, run it with your package manager: `npx void`, `pnpm void`, `yarn void`, or `bunx void`.

Alternatively, you can add `./node_modules/.bin` to your `PATH` so that you can invoke `void` directly when you are in the root directory of your app.

:::warning ⚠️ Prefer local install
Install `void` in your project so the CLI and runtime use the same version.
:::

## Help

```
void --help
void help
void help <command>
void help <group> <command>
void <command> --help
void <group> <command> --help
void <group> help <command>
```

Use `void --help` for the command list. For a specific command, try `void deploy --help` or `void db execute --help`. Help runs without signing in, validating the project, or making network requests.

## Setup

### `void init`

```
void init [--tsconfig] [--github] [--agents] [--git | --no-git]
```

Setup wizard for Void projects (new or existing).

Outside an existing Git repository or workspace package, the interactive wizard first asks **Initialize a git repository?**, with Yes selected. Accepting runs `git init` using your Git default branch. At the end, Void suggests an optional `git add -A && git commit -m "chore: initial commit"` command; it does not stage files or commit automatically. Git initialization failures produce a warning and setup continues.

Use `--git` to initialize without the Git prompt, or `--no-git` to skip it. In CI or without an interactive terminal, Git initialization requires `--git`. Existing repositories, including parent repositories, are preserved. Workspace packages skip Git initialization and do not accept these two flags.

Void's `.gitignore` defaults exclude dependencies, generated files, `.env`, and `.env.*`, while allowing `.env.example` to be committed.

In an empty project, `void init` asks you to choose:

- **Toolchain:** Vite+ (the default) or plain Vite.
- **Framework:** React, Vue, Svelte, or Solid. If one Pages adapter is already installed, Void uses it.
- **Starter:** D1, PostgreSQL, MySQL, or Static Pages.

Database starters include the framework config, a page and server loader, schema, seed, initial migration, and `routes/api/hello.ts`. Static Pages includes the framework config and home page. Vite+ starters use `vp dev`, `vp build`, and `vp preview`.

If the directory contains other files but isn't an app yet, Void offers to create a subfolder. You can choose to continue in the current directory instead.

In an existing app, Void adds missing dependencies and scripts, then updates `vite.config.*` with `voidPlugin()`. Existing scripts are preserved. If the config is too dynamic to edit, Void prints the snippet for you to add.

After that, the full interactive flow walks through:

1. **TypeScript:** creates or updates `tsconfig.json`, including `extends .void/tsconfig.json`, `void/env` types, and root-level `files` / `compilerOptions.paths` merges when an existing config would otherwise replace Void's generated entries.
2. **Database:** asks whether you want D1, PostgreSQL, MySQL, or no database yet. PostgreSQL writes `"database": "pg"`; MySQL writes `"database": "mysql"`; D1 stays implicit.
3. **Agent instructions:** always creates or updates `AGENTS.md` with brief Void instructions and the bundled docs path, preserving content outside the versioned block.
4. **Skills:** links Void skills for detected coding agents.
5. **Demo code:** for existing non-Pages projects, optionally scaffolds a `db/migrations/` directory plus an API route and typed fetch example.
6. **Deployment platform:** asks where `void deploy` should send the app: Cloudflare (the default), Void, or Skip deployment setup. The choice is stored as `platform` in `.void/project.json`. Choosing Cloudflare creates or augments `wrangler.jsonc`, checks the Cloudflare session through Void's bundled tooling, opens secure browser sign-in when needed, and writes the selected account as `account_id` (automatically when only one account is available).
7. **GitHub Actions:** optionally creates `.github/workflows/void-deploy.yml` for the selected target. Cloudflare workflows run `void deploy --platform cloudflare` with `CLOUDFLARE_API_TOKEN` and pass the optional `DATABASE_URL` secret needed by PostgreSQL/MySQL apps. Void workflows use the selected platform's API URL and are offered only when its discovery document advertises GitHub Actions support.
8. **`env.ts` scaffold:** if the project has no `env.ts` but has a root `.env`, generates an `env.ts` pre-populated with its keys. Values get conservative type inference (`boolean`/`url`/`number`/`string`) — the file carries a banner nudging you to tighten anything the heuristic got wrong.
9. **Void project setup:** when Void is selected, optionally logs you in, lets you select or create a project, and adds the link to `.void/project.json` so your first deploy can just be `void deploy`.

If Cloudflare sign-in is declined or does not complete, initialization still finishes with the configuration in place. Rerun `void init`, or use `void cloudflare login`, when you are ready.

Agent setup never asks which coding agent you use. If no agent is detected, skill linking is skipped; `AGENTS.md` still points to the complete docs at `node_modules/void/skills/void/docs/`.

Use flags to run individual steps without prompts:

| Flag         | Purpose                                        |
| ------------ | ---------------------------------------------- |
| `--tsconfig` | Only update `tsconfig.json`                    |
| `--agents`   | Set up agent instructions and skills           |
| `--github`   | Only create the GitHub Actions deploy workflow |

These step flags can be combined. When any of them is provided, only the specified steps run and interactive prompts are skipped. Git setup is skipped unless `--git` is also supplied. `--git` and `--no-git` alone keep the full setup wizard and control only its Git step.

For Cloudflare, the generated workflow needs a `CLOUDFLARE_API_TOKEN` repository secret with access to your app's account and resources. PostgreSQL and MySQL apps also need `DATABASE_URL`.

For a Void platform with GitHub Actions support, the workflow uses that platform's API URL and short-lived GitHub OIDC credentials. Authorize the repository with `void github connect <project> --repo <owner/repo> --executor github_actions`. Core self-hosted platforms don't yet support this integration, so Void explains that limitation instead of generating a workflow.

For projects that already have `"extends"`, `void init --tsconfig` preserves the existing config and adds `./.void/tsconfig.json`. If the existing config defines `files` or `compilerOptions.paths`, Void also merges its generated declaration files and aliases into the root config because TypeScript replaces those fields across `extends` instead of deeply merging them.

### `void prepare`

```
void prepare
```

Generates the project-local `.void/` artifacts used by TypeScript and runtime codegen without starting `vite dev` or running a full `vite build`.

This is the intended command for CI, fresh clones, editor bootstrap, and any workflow that needs `routes.d.ts`, `db.d.ts`, `queues.d.ts`, `env.d.ts`, and `.void/tsconfig.json` in place before typechecking.

## Connect

```sh
void connect
void connect https://platform.example.com
void connect --platform cloudflare
void connect --platform void
```

Connect a project to its deployment destination. With no arguments, choose Cloudflare or a Void platform interactively. A URL selects a Void platform directly. `--platform void` offers saved platforms and an option to enter another URL.

For Cloudflare, Void signs in through the browser when needed, selects an accessible account, and saves `account_id` in the root `wrangler.jsonc` or `wrangler.json`. It shares this setup with `void init`. An existing account selection is preserved; conflicting or inaccessible account settings must be resolved before continuing.

For a Void platform, Void validates its discovery document, reuses a valid session or opens browser login using the platform's supported providers, and saves the verified API and proxy origins. Credentials are stored in the operating-system keychain for that API origin. A sole login provider is selected automatically.

The deployment preference is saved in `.void/project.json`. Connecting to another Void platform preserves an existing project link; the CLI explains when that link or an environment override still selects a different destination. Use `void project link` to explicitly choose a project. Cloudflare selection also retains existing Void project metadata so you can switch back later.

In a non-interactive shell, supply a URL or explicit target. Cloudflare requires usable credentials and an unambiguous account (`CLOUDFLARE_ACCOUNT_ID` when needed). For a Void platform, provide `VOID_TOKEN` with a matching `VOID_API_URL`, or reuse a valid origin-scoped keychain session. Use `void connect <url> --no-login` to save the verified connection without authenticating; this option is only available for Void platforms.

## Auth

### `void auth login`

Browser login through one of the platform's currently enabled methods. The token is saved in the operating-system keychain, scoped to the platform origin. Login fails closed when no keychain is available instead of writing the token to a plaintext file; headless environments use `VOID_TOKEN` from their secret manager.

Set `VOID_API_URL` alongside `VOID_TOKEN` to identify the platform that issued it.
A token without an API URL is only used for Void Cloud's production API; a saved
connection or project cannot forward it to another platform. To use a platform's
saved login instead, unset `VOID_TOKEN`.

This is optional if you already completed auth during `void connect` or the interactive `void init` flow.

### `void auth link [connection-id]`

Link another enabled login method to your current account. Sign in again if your
session is no longer recent, complete the additional provider's browser login,
and confirm the displayed identity. With no connection ID, choose an enabled
method interactively. The optional dashboard exposes the same flow in **Account**.

### `void auth logout`

Removes saved credentials.

### `void auth whoami`

Prints your current login.

### `void auth token`

Copies your human auth token to the system clipboard. It is intended for
interactive troubleshooting and remains subject to login-method revocation. Do
not combine it with a Cloudflare Access service token for CI; machine Access
proof cannot turn a human Void token into an automation identity. Create a
project-scoped credential with `void project token create` instead.

## Cloudflare authentication

Void ships and invokes compatible Cloudflare tooling itself. Users do not need to install or run a separate Cloudflare CLI. Browser credentials are stored in an encrypted file protected by the operating-system keychain. When Void adopts an existing browser session, it persists the secure-storage preference so subsequent logins through compatible tooling use the same credential store.

- `void cloudflare login` — open a fresh browser OAuth sign-in, including when already signed in. Use this to switch Cloudflare users without first logging out; Void does not remove the prior session before opening sign-in.
- `void cloudflare status` — show the authenticated email, authentication method, accessible account names and IDs, and the pinned deployment account and its source. Credential values are never printed.
- `void cloudflare logout` — remove the local browser session.

Interactive `void connect --platform cloudflare`, `void init`, and `void deploy --platform cloudflare` invoke the same login flow automatically when necessary. Non-interactive CI must set `CLOUDFLARE_API_TOKEN`.
When a browser session is required, Void opens Cloudflare login immediately and prints `Press Ctrl+C to cancel`; there is no redundant terminal confirmation.

Signing in changes the browser session, not `account_id` in the project configuration. Check `void cloudflare status` after switching users; if the new user cannot access the pinned account, resolve the project target separately before deploying.

An API token or global API key pair in the environment takes precedence over browser credentials. Explicit browser login stops with the names of these overrides; remove them from that shell before signing in. `status` reports the active credential source, and `logout` warns if environment credentials remain active. Explicit browser login requires an interactive terminal; automatic deployment checks continue to reuse valid sessions.

## Project commands

### `void project status [name]`

Show deployments for the configured target.

- Void targets show recent hosted deployments; `[name]` looks up a project by slug and otherwise the linked project is used.
- Cloudflare targets list Worker Versions, identify the active version, and show the recorded migration count. A project name is not accepted because the Worker name comes from root `wrangler.jsonc`.

### `void project link [name]`

Link current directory to an existing hosted Void project by slug, or select interactively if omitted. State is stored in `.void/project.json`. Direct Cloudflare apps use the Worker name in the root config and do not need linking.

### `void project list`

List all accessible hosted projects (slug, role, type, URL). Shared projects are included and the role column distinguishes them from projects you own. For a saved Cloudflare target, this displays the current Worker's versions instead because there is no Void project registry.

### `void project team`

Manage access to a project hosted on a Void platform:

```sh
void project team list [--project <slug>]
void project team invite <email> --role <reader|collaborator|admin> [--project <slug>]
void project team invitations [--project <slug>]
void project team role <user-id> <reader|collaborator|admin> [--project <slug>]
void project team remove <user-id> [--project <slug>]
void project team revoke <invitation-id> [--project <slug>]
void project team leave [--project <slug>]
void project team pending
void project team accept <invitation-id>
void project team decline <invitation-id>
```

Project-scoped commands use `--project`, then `VOID_PROJECT`, then the linked project. Invitations can target only an email address already registered to a user on that platform; they do not create accounts or grant signup access. Only the invited account can accept or decline its invitation.

Readers can view the project but cannot deploy. Collaborators can deploy and manage deploy prerequisites. Project administrators can additionally manage domains, email destinations, GitHub configuration, and the project team. The owner alone can delete the project. See [Project Collaboration](../guide/project-collaboration.md) for the full role boundaries.

Project-scoped team management commands are not available for projects deployed
directly to Cloudflare. The account-scoped `pending`, `accept`, and `decline`
commands use the active connection selected by `void connect <url>`, regardless
of the current project's link or deploy target. `VOID_API_URL` takes precedence;
an unscoped `VOID_TOKEN` selects Void Cloud. These commands display their
platform, and accepting an invitation leaves directory links intact. To link
the invited application, run `void project link` in an unlinked checkout of
that application.

### `void project token <create|list|renew|revoke>`

Manage revocable `aud: deploy` credentials for one Void platform project. The
credential can only call the endpoints used by `void deploy`; it cannot access
operator, account, secret-writing, project-deletion, or other projects' routes.

```sh
void project token create --name github-actions --expires-in 30
void project token list
void project token renew <credential-id> --expires-in 30
void project token revoke <credential-id>
```

Pass `--project <name>` outside a linked project. Expiry is bounded to 1–90
days. Create and renew display the bearer value once; replace the stored secret
immediately after renewal because the previous credential is revoked in the
same operation. Project deletion and owner suspension also stop its use. Login
method disablement does not revoke these independent deploy credentials.

Store the printed `VOID_TOKEN` and `VOID_API_URL` in the CI secret manager. The
Access pair passes the perimeter; the scoped Void credential authorizes only
this project's deploy workflow. When prerendering or remote proxy bindings are
used on an Access-protected platform, store `VOID_ACCESS_CREDENTIALS` as an
origin-keyed JSON secret containing both exact HTTPS origins, even if both use
the same service-token pair:

```json
{
  "https://void-company-api.example.workers.dev": {
    "CF_ACCESS_CLIENT_ID": "<service-token client ID>",
    "CF_ACCESS_CLIENT_SECRET": "<service-token client secret>"
  },
  "https://void-company-proxy.example.workers.dev": {
    "CF_ACCESS_CLIENT_ID": "<service-token client ID>",
    "CF_ACCESS_CLIENT_SECRET": "<service-token client secret>"
  }
}
```

`VOID_ACCESS_ORIGIN` scopes a pair to one origin, so selecting only the API
origin is insufficient for a workflow that calls the proxy. Use distinct pairs
in the two entries when the Access policies require them.

### `void project logs`

```
void project logs [--level <level>] [--filter <text>] [--range <duration>] [--deployment <id>]
```

Show runtime logs from the deployed target. Hosted Void targets query retained log history. Cloudflare targets open a live tail for the Worker named in root `wrangler.jsonc`; they do not provide historical log storage.

| Flag                 | Purpose                                                                                                                                                                                                         | Default |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `--range <duration>` | How far back to look. Format: `<number><unit>` (m/h/d). Max 7d.                                                                                                                                                 | `1h`    |
| `--level <level>`    | Filter by log level. One of `error`, `warn`, `info`, `log`, `debug`, `all`. `error` also includes uncaught exceptions, non-`ok` outcomes, and any 5xx response — even when the worker neither threw nor logged. | `all`   |
| `--filter <text>`    | Case-insensitive **substring** match against log message text and exception name/message — not a level filter. Shows the full request entry on any hit.                                                         | none    |
| `--deployment <id>`  | Filter logs to a specific deployment ID.                                                                                                                                                                        | none    |

Output shows one line per request (`HH:MM:SS METHOD URL STATUS`) with indented console log and exception lines beneath. Errors and exceptions are colored red, warnings yellow.

Examples:

```
void project logs --level error --range 12h
void project logs --level error --filter websocket
```

Logs include top-level `console.*` calls and uncaught errors captured by Cloudflare Tail. If you catch an error and save it only to your database, it won't appear here. Also log it with `console.error()` or `logger.error()` from `void/log`.

For errors that never reach your Worker, such as edge routing errors or static site requests, use `void project requests --status 5xx`.

On a direct Cloudflare target, `--filter` becomes Cloudflare's live search, `--deployment` selects a Worker Version, and `--level error` selects error invocations. Other individual console levels cannot be filtered, and `--range` does not select history. `void project requests` is hosted-only.

### `void project requests`

```
void project requests [--status <filter>] [--range <duration>]
```

Show request-level traffic recorded at the edge for the linked project: one line per request with time, method, HTTP status, request type, and server timing. Unlike `void project logs` (which only has rows for invoked user workers), this reads the edge request-metering data, so it also surfaces:

- **5xx the edge router generated itself** — missing deployment manifest, static-asset read timeouts, SSR dispatch timeouts — which never invoke your worker and so never appear in logs.
- **Requests to static/SPA projects**, which are served directly from storage and never run a worker.

| Flag                 | Purpose                                                                                       | Default |
| -------------------- | --------------------------------------------------------------------------------------------- | ------- |
| `--status <filter>`  | Filter by status: a class (`2xx`, `3xx`, `4xx`, `5xx`) or an exact 3-digit code (e.g. `500`). | none    |
| `--range <duration>` | How far back to look. Format: `<number><unit>` (m/h/d). Max 7d.                               | `1h`    |

Output shows one line per request (`HH:MM:SS METHOD STATUS TYPE DURATION`). 5xx are colored red, 4xx yellow. Note: request paths are not recorded, so this view shows status and type rather than URLs — use `void project logs` for per-URL, per-log detail on requests that do reach your worker.

Examples:

```
void project requests --status 5xx
void project requests --range 24h
```

### `void project rollback [deployId]`

```
void project rollback [deployId]
```

Roll back to a previous deployment or Worker Version.

- If `[deployId]` is omitted, shows an interactive select menu of retained deployments
- If the target deployment has fewer applied migrations than the current one, a warning is shown listing the migration diff before confirmation

On a Void platform, you can select a retained deployment. On Cloudflare, use a complete Worker Version ID or an unambiguous prefix. Void activates that version at 100%. When both versions have complete trigger snapshots, it also restores the selected version's schedules, queues, workflows, routes, and custom domains. Otherwise, rollback keeps the current triggers and restores the code, including versions originally deployed outside Void.

Rollback doesn't reverse database migrations. If older code may run against a newer schema, or migration metadata is missing, Void explains the risk and asks for confirmation.

### `void project cancel [deployId]`

```
void project cancel [deployId]
```

Cancel an active deployment.

- If `[deployId]` is omitted, shows an interactive select menu of active deployments for the linked project
- If `[deployId]` is provided, cancels that deployment directly

This command is hosted-only. Direct Cloudflare deploys are local operations and do not expose a remote build to cancel.

### `void project delete [name]`

Permanently delete a hosted Void project and all its resources (databases, KV namespaces, R2 buckets, deployments). Requires typing the project slug to confirm.

If `[name]` is omitted, uses the linked project.

For direct Cloudflare targets this command refuses to run. Inferred resources can be shared, so Void never performs automatic teardown; verify ownership and remove resources explicitly with Cloudflare tooling.

### `void project purge-cache`

```
void project purge-cache [--project <name>]
```

Purge all cached pages for the linked project. The edge cache will clear within seconds.

If `--project` is provided, purges that project's cache instead of the linked project.

This command is currently hosted-only. Direct Cloudflare cache purge fails closed with guidance.

## Platform management

Void-managed projects deploy to an explicitly selected platform. Join one with [`void connect`](#connect). Connections are stored per API origin, and credentials are scoped to that origin.

### Connection commands

```sh
void platform list
void platform use [id]
void platform status [id]
```

`use` and `status` auto-select the only configured platform; with multiple platforms they show a picker interactively and require an id or URL in non-interactive use. A project with a recorded platform URL keeps using that platform when the global default changes.

### Operator commands

Use `void platform` to administer the users and apps on your selected platform. Start with the [Platform Administration guide](../guide/platform-administration.md) for signing in, giving people access, and investigating deployments.

Every command below accepts `--connection <registered-id-or-url>` to select a platform and `--json` for structured output. Without `--connection`, Void uses `VOID_API_URL` if set, then the active platform connection. Application project files do not change this selection.

#### Making Changes

Commands that change users, projects, signup access, invitations, or Workers show a preview before asking for confirmation:

```sh
void platform user plan <user-id> pro --plan
void platform user plan <user-id> pro --yes
```

`--plan` validates the change and prints its effect without applying it. `--yes` applies the change without prompting, which is required in scripts. Use one or the other; they cannot be combined. These flags also apply to deployment cancellation and maintenance commands, but not to authentication commands.

Each preview and apply request allows five minutes. Set `--timeout <seconds>` to an integer from 1 to 3600 to change that limit. Read requests and individual log polls allow 30 seconds.

Void does not automatically retry changes. If a request loses its connection or times out, inspect the affected objects and `void platform system events` before repeating it. Partial results describe the work that completed and exit with a nonzero status.

#### Authentication {#operator-authentication}

Sign in, inspect your session, or sign out:

```sh
void platform auth login [--provider <connection-id>] [--token-stdin]
void platform auth status
void platform auth logout
void platform auth token [--token-stdin]
```

With no `--provider`, browser login offers the platform's enabled login methods.

#### Authentication configuration

`void platform config auth` opens interactive configuration. These commands use
your administrator session from `void platform auth login`:

```sh
void platform config auth list
void platform config auth show company
void platform config auth add google
void platform config auth add oidc --id company
void platform config auth add cloudflare-access --id access
void platform config auth configure company
void platform config auth test company
void platform config auth link company
void platform config auth enable company
void platform config auth disable github
void platform config auth admission
void platform config auth protection show
void platform config auth protection enable --installation <id>
void platform config auth protection disable --installation <id>
void platform config auth recover company --installation <id> --file recovery.json
```

When configuring an existing installation for the first time, run
`void platform config auth initialize`, then sign in again. Its current login
methods and signup policy are preserved.

Adding or editing a method saves a pending configuration. Enabling it verifies the
login in your browser before applying it. Linking the verified identity to your
account is a separate, explicit action. Before disabling a method, verify a linked
alternative; the last method cannot be disabled. Disabling revokes human sessions
created through that method, including operator sessions. Scoped deployment tokens
remain valid; a human login token used as `VOID_TOKEN` is still revoked.

Commands accept `--connection <registered-id-or-url>` and `--json`. Changes accept
`--plan` or `--yes`. For scripted configuration, use `--file <path>` for the
nonsecret fields and `--client-secret-env <name>` for the environment variable
containing the secret. Omit the secret when editing to retain its saved value.
For `enable` or `link` in scripts, supply `--test-id <id>` from a completed test.
`test --json` returns a browser URL, test ID, and expiry without waiting for completion.

`admission` chooses invited/allowlisted, company-approved, or public signup.
Company-approved signup creates ordinary accounts automatically when a user
passes a configured company rule. Select an enabled, company-restricted OIDC or
Google Workspace method, or an enabled Cloudflare Access gate. In scripts,
`admission --file <path> --yes` reads a policy such as
`{"mode":"company","connections":["company"],"access":false}`.

Browser login offers the platform's enabled methods; `--provider <connection-id>` selects one. Login saves a one-hour administrator session in your system keychain. Logout revokes that session and removes its local credential.

`protection enable` creates or connects Cloudflare Access applications independently
of login methods. Its `--file` accepts the `cloudflareAccess` object described in
[installation setup](../guide/self-hosted-platform.md#configure-github-oauth).
Protection changes require installation ownership, the saved recovery credentials,
and a human administrator session. They revoke current human sessions. Before
removing protection, change any signup rule that depends on that gate. Cloudflare
applications are retained for deliberate cleanup.

`recover <connection-id>` restores an existing administrator when normal login is
unavailable. Its file contains `administratorUserId`, optional nonsecret provider
`configuration`, and an `expectedIdentity` object with exact `issuer` and `subject`
when using `--yes`. Recovery requires Cloudflare management/database authority,
original recovery keys, and a successful browser provider test. Use
`--client-secret-env <name>` for new or rotated credentials.

`auth token` prints your current operator token. With `--token-stdin`, it exchanges a full administrator API login session from standard input for a new operator token. `auth login --token-stdin` saves the exchanged token to the keychain instead of printing it.

For automation, supply `VOID_OPERATOR_TOKEN` with an explicit `VOID_API_URL` or `--connection`. Operator tokens are stored separately from application deployment credentials. The API checks your current administrator access on every request. See [Using Scripts](../guide/platform-administration.md#using-scripts) for an example.

#### Users {#operator-users}

Find a user by login, email, or ID, then inspect their projects and usage:

```sh
void platform user list [--search <text>] [--page <n>] [--limit <n>]
void platform user show <id>
```

Use the same ID to change a plan, suspend or restore the account, or delete it:

```sh
void platform user plan <id> <free|solo|pro|sponsored|custom>
void platform user suspend <id> [--reason <text>]
void platform user restore <id>
void platform user delete <id>
```

Suspending a user blocks their applications. Deleting a user also deletes their project resources. A plan change updates resource limits while preserving any administrator suspension.

The last active administrator cannot be deleted or suspended. Both previews and
actual mutations enforce this rule, including in the browser admin UI. Allowed
administrator removals revoke administrator access before resource cleanup; if
cleanup fails, access stays revoked and the partial result reports it.

#### Projects {#operator-projects}

List projects across the platform, filter them by owner, or inspect one project's resources:

```sh
void platform project list [--user <user-id>] [--search <text>] [--page <n>] [--limit <n>]
void platform project show <id>
void platform project delete <id>
void platform project owner <project-id> <user-id>
```

Search matches a project's slug, ID, or owner's login. `show` includes resources, domains, the latest 10 deployments, and the latest 20 builds. `delete` removes the project and its resources.

`owner` transfers a project to another registered user. Preview it with `--plan`; apply it interactively or with `--yes`. The preview reports active-work blockers and the account plan that will apply. The former owner becomes a project administrator, existing project-scoped CI deploy credentials are revoked, and usage already incurred remains with the former owner.

#### Deployments {#operator-deployments}

Find a deployment, inspect its manifest, or request cancellation:

```sh
void platform deployment list [--project <id-or-slug>] [--status <status>] [--search <text>] [--page <n>] [--limit <n>]
void platform deployment show <id>
void platform deployment cancel <id>
```

Cancellation applies while a deployment is pending, uploading, migrating, or prerendering, and can be requested again while it is canceling. A deployment that has begun switching traffic, is compensating for a failure, or has finished cannot be canceled through this command.

Read its runtime logs with:

```sh
void platform deployment logs <id> [--since <time>] [--cursor <cursor>] [--limit <n>] [--follow]
```

The default is the last hour, oldest first, with up to 100 records. `--since` accepts a duration such as `10m`, `2h`, or `1d`, an ISO date, or epoch milliseconds. Set `--limit` from 1 to 500 and pass the response's `nextCursor` as `--cursor` to read another page.

`--follow` reads the remaining pages and checks for new logs every two seconds until you press Ctrl+C. It checks a five-minute overlap for delayed records and suppresses replayed rows. Records that arrive later may need a subsequent historical query. Following stops with an error if a window exceeds 10,000 records; use a narrower historical query in that case.

#### Builds {#operator-builds}

Inspect a build or read its output:

```sh
void platform build show <id>
void platform build logs <id> [--since <sequence>] [--limit <n>] [--follow]
```

Build logs start at sequence `0` and return up to 500 lines. Use the returned `lastSeq` as `--since` to continue; `--limit` accepts 1 to 500. Container log retrieval requires managed builds to be enabled. GitHub Actions builds return an external log URL.

Following waits for the final logs after the build becomes terminal. If completion cannot be confirmed within two minutes, the command exits with an error. Older builds without a completion signal may wait for 30 seconds without new lines before following stops.

#### Signup Access {#operator-signup}

Inspect signup restrictions, open signup to everyone, or require an allowlist match:

```sh
void platform signup show
void platform signup open
void platform signup restrict
```

Add and remove GitHub or email entries by their type and pattern:

```sh
void platform signup allow <github|email> <pattern> [--note <text>]
void platform signup disallow <github|email> <pattern>
void platform signup remove <github|email> <pattern>
```

`remove` remains available as an alias for existing scripts. GitHub entries match a login. Email entries match an address or a domain pattern such as `*@example.com`, across sign-in providers. Quote wildcard patterns in your shell.

For an OIDC identity that has no verified email, grant access using its configured connection ID and stable provider subject:

```sh
void platform signup allow identity <connection-id> <subject> [--note <text>]
void platform signup disallow identity <connection-id> <subject>
```

Connection IDs are shown by `void platform config auth list`. Identity subjects match exactly and case-sensitively; wildcards, email inference, and account linking are not applied. The login method's domain or group restrictions must still pass, and a newly admitted account has the ordinary user role. With restrictions enabled and an empty allowlist, nobody new can sign up.

#### Invitations {#operator-invitations}

Invite people by email and track whether they have joined:

```sh
void platform invitation list [--page <n>] [--limit <n>]
void platform invitation send <email[,email...]>
void platform invitation revoke <id>
```

Send accepts up to 100 comma-separated addresses. Invitations grant signup access even if email delivery is unavailable or fails; delivery is reported separately. Revoking a pending invitation removes its exact email grant. A broader domain entry can still allow that person to sign up.

#### Email {#operator-email}

Decide who mail from the shared sender may reach, who registers email domains, and a project's outbound caps:

```sh
void platform email policy
void platform email policy-set <verified|domains|any> [--domains <domain[,domain...]>]
void platform email settings
void platform email settings-set --domains <self-serve|admin>
void platform email limit <project-id|slug> [--monthly <n>] [--burst <n>]
void platform email logs <project-id|slug> [--page <n>] [--limit <n>] [--json]
void platform email attempts [--project <id|slug>] [--page <n>] [--limit <n>]
void platform email attempt-resolve <attempt-id> --ended --reason <text>
void platform email operation-resolve <operation-id> --ended --outcome <applied|not-applied> --reason <text>
```

`policy` decides which recipients a project's `<slug>+tag@<mail domain>` sender reaches: `verified` (the default) means only that project's verified destinations; `domains` adds every address on the listed domains; `any` lifts the check. Neither widens delivery to addresses on the platform's own mail domain: those stay verified-destination-only, so no project reaches another project's inbox without its consent. Cloudflare still refuses a destination it has not verified until the platform mail domain is onboarded for Email Sending, so under `domains` or `any` such refusals arrive as per-recipient `UNVERIFIED_DESTINATION` results. Custom-domain sends are not affected.

`settings-set --domains admin` tells `void email domain add` to print the administrator's command instead of starting token setup. `limit` overrides the project's monthly and rolling 60-second caps (defaults 200 and 10); a project page in the admin UI shows and clears them.

`logs` inspects retained receipt and recipient outcomes, including operation IDs, provider references, error codes, and policy versions. Pages contain at most 100 records, newest first; use `--json` for all fields. After project deletion, use its project ID to inspect metadata until the 30-day retention period expires. Message content and credentials are never included.

`attempts` lists interrupted provider calls and their earliest resolution time. Once
the original Worker execution has ended and the attempt is at least 24 hours old,
`attempt-resolve` records `outcome_unknown`, retains its quota charge, and releases
the project/domain cleanup fence. `--ended` is your attestation that the call is no
longer active; `--reason` is stored in the operator audit log. Keep recipient
addresses and message content out of the reason. The send is never retried. Use
`--plan` to preview and `--yes` to apply without a prompt.

`operation-resolve` recovers a Cloudflare routing, Worker, secret, catch-all, or
Sending mutation whose outcome remains unknown. After the original execution
has ended and the operation is at least 24 hours old, inspect the exact resource
named by the preview and attest whether its write was `applied` or `not-applied`.
Applied writes continue at the next step; not-applied writes retry the same
persisted intent. The running platform version must match that intent, so restore
the matching version before recovering an operation created by older code. The
preview pins the step, attempt, connection and route generations, resource
identity, and digest used by the apply request. Time alone never retries a write.

Register and maintain email domains for projects whose owners hold no Cloudflare credential:

```sh
void platform email domains [--project <id|slug>]
void platform email domain-add <domain> --project <id|slug> [--token-stdin]
void platform email domain-status <domain>
void platform email domain-sync <domain>
void platform email domain-rotate-secret <domain>
void platform email domain-remove <domain> [--token-stdin]
```

`domain-add` uses the platform's Cloudflare credential for zones in its account. For another account, pipe a scoped Cloudflare API token on standard input with `--token-stdin --yes`. Name the exact mail domain (`mail.example.com`, or the apex when it receives no mail yet). `domain-status` shows inbound, outbound, and credential-management readiness with the latest operation. A blocked operation resumes through `domain-sync`; a blocked rotation resumes through `domain-rotate-secret`, preserving already confirmed steps and its staged credential. An uncertain operation remains stopped until read-back proves the result or an administrator uses `operation-resolve`. Domains an administrator adds show `managed_by: admin`; their owners can list and inspect them but use these commands for `sync`, `domain-rotate-secret`, and `remove`.

If project deletion leaves cleanup blocked by an expired or revoked Cloudflare token, use `domain-remove <domain> --token-stdin --yes` with a replacement scoped to the same account and zone. This resumes the retained cleanup only when no other project uses the connection. For a live project, renew its token through `domain-add` instead.

#### System {#operator-system}

Inspect activity, check service health, or review administrative changes:

```sh
void platform system overview
void platform system health
void platform system cli-versions
void platform system events [--page <n>] [--limit <n>]
void platform system backfill-queue-tokens
void platform system sandbox-drain [--cursor <opaque-cursor>]
```

`overview` shows platform totals and recent activity. `health` checks the configured services and database, and exits with a nonzero status if a check fails. `cli-versions` reports the CLI versions used by deployments.

`events` shows the administrator, target, and outcome of changes. A pending event means the outcome has not been recorded. Previews and session login/logout do not create these events. `backfill-queue-tokens` repairs older queue entries that are missing authentication tokens and supports `--plan` before applying the repair.

Use `sandbox-drain` when an upgrade asks you to finish Sandbox cleanup. Preview with `--plan`; pass the returned `nextCursor` as `--cursor` to inspect later pages. Apply with `--yes` and rerun until it reports `complete: true`, then rerun the interrupted upgrade. Application traffic stays paused during cleanup, while administrator login remains available.

<span id="operator-workers"></span>

Use the [platform lifecycle commands](#lifecycle-commands) to maintain your installation's Workers.

#### Pagination and JSON

User, project, deployment, invitation, and event lists default to page `1` with 20 items. `--limit` accepts 1 to 100 for these lists. Their JSON responses include the page, limit, and total count.

With `--json`, results go to standard output and command errors go to standard error as JSON. Errors and partial failures exit with a nonzero status. An unhealthy `system health` result stays on standard output and also exits nonzero. Log following writes one JSON object per response, including each page and empty responses.

### `void platform install`

```sh
void platform install [options] [--yes]
```

| Option                            | Purpose                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| `--name <slug>`                   | Installation name used in `void-<name>-<role>` resource names; choose an unused name |
| `--display-name <name>`           | Human-readable platform name                                                         |
| `--account <id>`                  | Cloudflare account id                                                                |
| `--auth-config <path>`            | Login methods, signup policy, and environment references for provider secrets        |
| `--application-domain <domain>`   | Base domain for deployed apps                                                        |
| `--workers-dev`                   | Explicit testing mode; add an application domain later                               |
| `--zone <domain>`                 | Cloudflare zone containing the application domain                                    |
| `--dedicated-zone`                | Add zone-wide catch-all routes; valid only when the app domain is the whole zone     |
| `--control-plane-domain <domain>` | Optional API custom hostname; defaults to `workers.dev`                              |
| `--plan`                          | Resolve and print a read-only plan                                                   |
| `--resume`                        | Continue the matching checkpointed installation                                      |
| `--runtime <path>`                | Deploy a locally built, integrity-checked runtime directory                          |
| `--yes`                           | Acknowledge Cloudflare changes in non-interactive use                                |

For a first installation, follow [Install a Void Platform](../guide/self-hosted-platform.md). The interactive installer recommends using a domain and offers **Use workers.dev for testing** as a visible alternative. Void creates the platform infrastructure and tables. External PostgreSQL and GitHub OAuth are required in either mode. `--workers-dev` skips zone/DNS/certificate operations and cannot be combined with `--application-domain`, `--zone`, or `--dedicated-zone`.

Read-only plans, workers.dev installations with the default API hostname, and supported lifecycle operations can use Cloudflare browser login and the system keychain. Installation that writes DNS or creates a zone needs an explicit management token through `CLOUDFLARE_API_TOKEN` or `CF_API_TOKEN`.

The installed platform needs a separate runtime token to provision resources for apps. The interactive installer prompts for it and the other setup values. For non-interactive installs, inject the variables listed in [Install from CI](../guide/self-hosted-platform.md#install-from-ci).

To enable email during install or upgrade, set both `VOID_EMAIL_SENDER_DOMAIN` and `VOID_EMAIL_SHARED_ZONE_ID`. Void records the pair for later upgrades; supplying only one is an error.

`--plan` prints the actual resource names, selected login methods, login callback, and direct setup links without opening credential pages or saving a draft; Cloudflare browser login still opens if needed. New platform resources use `void-<name>-<role>` names without random suffixes. Existing installations keep their recorded names, and unowned name conflicts stop installation without overwriting resources. After you confirm an interactive install, Void opens each missing credential's setup page and shows a short permission/checklist fallback. The runtime-token link preselects all required account permissions, including Workers Tail, Hyperdrive, and AI Gateway when needed; domain installations must also select the indicated zone. Supplied credentials skip browser opening. Setup drafts pin Worker names and the login callback and save partial credentials encrypted locally. Interactive installs list unfinished installations, including interrupted provisioning, or offer a new install. Entering an existing unfinished name asks to resume it; declining returns to name entry. Starting new leaves previous setup, credentials, and resources untouched. Completed platforms are not offered for resumption. `--resume` skips the choice and is required for non-interactive recovery.

Use an empty PostgreSQL database dedicated to the installation. You can correct a failed initial connection, but after the database is claimed or Hyperdrive is provisioned, commands reject a different URL.

Recovery secrets are encrypted with AES-256-GCM using a key in your system keychain. The encrypted data is tied to the installation identity. Without a keychain, supply a canonical base64-encoded 32-byte `VOID_PLATFORM_RECOVERY_KEY`; otherwise Void stops before saving secrets. CI can generate a temporary key when its original credentials remain in protected secrets.

If a newly created zone is waiting for registrar delegation, resume after it becomes active:

```sh
void platform install --resume --name <installation-id>
```

See [Self-host a Void platform](../guide/self-hosted-platform.md) for prerequisites, token scope, exact footprint, domain behavior, and an end-to-end walkthrough.

### `void platform domain set`

```sh
void platform domain set <domain> [--installation <id>] [--zone <domain>] [--dedicated-zone] [--plan] [--yes]
```

Add an application domain to a workers.dev test platform. Domain-based installations remain the recommended default. The command detects the zone when possible, creates missing DNS and routes after confirmation, and checks HTTPS before making the domain canonical. If DNS or certificates are pending, rerun the same command to resume. `--plan` is read-only; non-interactive mutations require `--yes`.

Existing workers.dev URLs remain available, and the platform API origin, OAuth callback, projects, and deployments stay unchanged. The command verifies the running runtime token's Cache Purge permission for the new zone. A disabled platform stays disabled. Use the database URL from the original installation when administering from another machine. Replacing an already configured application domain is not supported. See [Add a Domain Later](../guide/self-hosted-platform.md#add-a-domain-later).

### Lifecycle commands

Use these commands to recover, update, pause, or remove an installation:

```sh
void platform discover [--account <id>] [--installation <id-or-name>]
void platform upgrade [id] [--runtime <path>] [--plan] [--yes]
void platform rollback [id] --runtime <earlier-path> [--from-runtime <current-path>] [--plan] [--yes]
void platform repair [id] [--runtime <path>] [--plan] [--yes]
void platform disable [id] [--plan] [--yes]
void platform enable [id] [--runtime <path>] [--plan] [--yes]
void platform uninstall [id] [--plan] [--purge-data] [--keep-zone] [--yes]
```

`discover --installation` limits recovery and endpoint verification to one installation in a shared Cloudflare account.

Omit `id` when only one installation is configured, or choose from the interactive picker. Non-interactive commands need an ID when several installations exist. Commands that make changes also require `--yes`; `--plan` only previews changes.

After discovery on another machine, set `VOID_PLATFORM_DATABASE_URL`. An upgrade that preserves every deployed Worker also preserves its secrets. For an email-enabled installation without its encrypted recovery file, restore `VOID_PLATFORM_EMAIL_SIGNING_SECRET`; recreating only the email gateway needs that key and does not need the Cloudflare runtime token or JWT signing key. Recreating the API or proxy also requires the email key when email is enabled, in addition to their normal secrets. Recreating the API requires its original runtime-token, GitHub, R2, JWT, and project-encryption values; recreating the proxy requires the runtime token and JWT signing key.

| Command     | Behavior                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------- |
| `discover`  | Verifies remote ownership and restores local installation records without downloading secrets |
| `repair`    | Recreates missing resources owned by the installer                                            |
| `upgrade`   | Deploys the selected runtime and supported pending migrations                                 |
| `rollback`  | Restores a declared-compatible earlier runtime without reversing PostgreSQL migrations        |
| `disable`   | Blocks platform traffic through routing storage without removing data                         |
| `enable`    | Restores traffic after checking the platform                                                  |
| `uninstall` | Blocks traffic and removes eligible resources, retaining data by default                      |

Repair and upgrade preserve disabled state. New, resumed, and previously disabled installations block user traffic until all target Workers pass verification; the installer's health probes can still run. Routes and custom domains remain attached.

Commands preserve existing routes and domains, verify the configured database, and coordinate concurrent administrators before making changes.

`--runtime` selects a custom platform build. Relative paths resolve from your current directory. Void verifies the build before making changes; see [Platform Development](../guide/platform-development.md#deploying-your-runtime) for creating one.

Without `--runtime`, the CLI uses its packaged platform version.

Platform migrations only move forward. Void checks compatibility before updating the database and tells you if an intermediate release is needed.

An upgrade completes after the new Workers pass health checks. If rollout fails, Void attempts to restore the previous Workers. Retrying does not repeat completed migrations.

`platform rollback` restores a compatible earlier runtime without reversing database migrations. Pass its files with `--runtime`. If the installed version is a custom build, also supply that version with `--from-runtime`. Void refuses targets that are incompatible with the current database or predate installed authentication, sandbox-drain, or ownership-aware usage protocols. A later `upgrade` can move forward again.

Uninstall verifies remote ownership before removing anything. Data resources are retained unless you pass `--purge-data`. Workers, R2, AI Gateway, DNS records, routes, custom domains, adopted resources, external PostgreSQL, and zones are always retained for manual review.

Resources that may have been shared or repurposed are retained for manual review. Platform traffic stays blocked. External PostgreSQL and its data are never deleted.

See [Disable and safely uninstall](../guide/self-hosted-platform.md#disable-and-safely-uninstall) for the full removal policy.

## Deploy

### `void deploy`

```
void deploy [--project <name>] [--dir <path>] [--spa] [--skip-build] [--debug]
void deploy [--platform <cloudflare|void>] [--require-email]
```

Auto-detects your project type and chooses the right pipeline. See [Supported App Types](../guide/app-types.md) and [Deployment](../guide/deployment.md) for details.

An unlinked project with a root `wrangler.jsonc` or `wrangler.json` gets a prompt to link and deploy to Cloudflare using its existing Worker and resources. Accepting verifies the target, saves Cloudflare as the destination, and continues deployment. A failed build retains the link for retry. Declining changes nothing. Explicit platform/project selections and saved destinations take precedence; CI must select a destination explicitly.

The first handoff preserves production bindings, variables, secrets, event handlers, and triggers. The active version must be the latest uploaded version so inherited secrets have an unambiguous source. Apart from an explicitly enabled ISR cache, new resources, migrations, runtime features, auth setup, or local secret overrides must be handled separately. See [Deploy an existing Worker](../integrations/cloudflare.md#deploy-an-existing-worker).

When prerendered or revalidated pages need a cache during migration, Void asks whether to enable ISR and saves `routing.isr` in `void.json`. Yes provisions the KV cache during this handoff; No keeps ISR disabled on every later deploy until you change the setting. CI must set `routing.isr` explicitly if a pending migration has no saved choice. Existing ISR namespaces are reused; application KV bindings are still required.

For Drizzle projects, deploy performs a read-only schema drift check. If a new migration would be generated, deploy stops and tells you to run `void db generate`, review the migration, commit it yourself, and rerun `void deploy`.

| Flag                            | Purpose                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `--platform <cloudflare\|void>` | Override the platform stored in `.void/project.json`                                               |
| `--project <name>`              | Target a specific Void project by slug; not supported with `--platform cloudflare`                 |
| `--dir <path>`                  | Deploy a pre-built static directory (skips build)                                                  |
| `--spa`                         | Use SPA mode instead of SSG for static deploys                                                     |
| `--skip-build`                  | Skip the build step; on Cloudflare this is supported for static/SPA/SSG deploys only               |
| `--require-email`               | Fail when email cannot be set up instead of deploying without it; requires `--platform cloudflare` |
| `--debug`                       | Mirror the structured deploy log to stderr (also written to `~/.void/logs/`)                       |

The older `--backend cloudflare` spelling remains available as a compatibility alias for `--platform cloudflare`.

Every deploy writes a structured JSONL trace to `~/.void/logs/deploy-<timestamp>.jsonl` regardless of `--debug`. On failure the path is printed at the end of the error message so you can attach it when reporting platform issues. `VOID_DEPLOY_DEBUG=1` is accepted as an alternate trigger for stderr mirroring.

Cloudflare upload failures include a detailed error message and stack locations when available. Use that message to identify the cause; the numeric error code alone may not be sufficient. The details are also available in the deploy log.

When a deploy fails after it starts, the CLI also prints a summary of that trace under the error, so the cause is visible where the file is not — a CI runner, for example, is discarded with the job. The summary has two blocks: every `error` record with its flattened cause chain, then the last 20 records as a timeline.

Pre-flight failures print no summary. A missing project, a rejected flag combination, or an unsupported `--platform cloudflare` feature stops before any trace exists, and each of those prints its own message explaining what to change. A build failure prints no summary either — the build streams its own output straight to the terminal.

Void masks the credentials it emits itself: signed query parameters, bearer tokens, and any field whose key names a credential.

Masking your own values is left to your CI platform, which holds the secrets and masks them before the log is written. GitHub Actions does this for everything under `secrets.*`. Void does not guess at credential-shaped variable names, and it does not parse credentials out of values you supplied — a password inside a `DATABASE_URL` in your build command prints as written. Register such values as CI secrets, or keep them out of the build command.

```
■  deploy: Deploy failed: deploy in progress
│  Deployment: dpl_7zgitxdrxxz9
│  Detailed log: ~/.void/logs/deploy-2026-08-21T03-24-19-764Z.jsonl
│
│  Errors
│     9.0s  deploy_server_error
│           deploymentId=dpl_7zgitxdrxxz9
│           message=deploy in progress
│
│  Last 20 of 26 entries
│     8.4s  info   finalize_start        assets=98 workers=0
│     8.6s  info   stream_deployment_id  deploymentId=dpl_7zgitxdrxxz9
│     9.0s  error  deploy_server_error   message=deploy in progress
```

Platform resolution precedence:

1. `--platform <cloudflare|void>` (or the legacy `--backend cloudflare` alias)
2. `platform` in `.void/project.json`
3. Void for projects initialized by an older SDK without a saved platform

Selecting Skip deployment setup stores `"platform": "none"`; a later `void deploy` stops with guidance until a platform override is provided.

For the Void platform, project resolution precedence is:

1. `--project <name>`
2. `VOID_PROJECT`
3. linked project in `.void/project.json`

If no project is linked and no override is provided, CLI prompts to link or create one. In CI (non-TTY), `void deploy` errors out instead — set `VOID_PROJECT` or pass `--project <slug>`.

A new project's slug is lowercase alphanumeric with interior dashes, at most 56 characters — it is also the project's email sender, `<slug>+noreply@<mail domain>`, and that local part must fit RFC 5321's 64 octets. Slugs of 5 characters or fewer need a paid plan. Creating a project also registers the owner's own email address as a recipient (see `void email allow`); the CLI says so, and `void email destinations` shows whether it is verified yet.

That fallback is mainly for projects that skipped Void project setup during `void init`.

### `void deploy --platform cloudflare`

Build and deploy to your Cloudflare account using the root `wrangler.jsonc`:

```sh
void deploy --platform cloudflare
void deploy --platform cloudflare --require-email   # fail instead of deploying without email
```

Void signs you in through your browser when needed and saves the selected account. In CI, set `CLOUDFLARE_API_TOKEN` and, if the token can access several accounts, `CLOUDFLARE_ACCOUNT_ID`.

| Option or setting              | Cloudflare behavior                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| `--dir`, `--spa`               | Deploy static output through a small Worker and Workers Assets                         |
| `--skip-build`                 | Reuse existing static, SPA, or SSG output; unavailable for Worker apps                 |
| `--project`                    | Unavailable; the Worker and account come from the Cloudflare config                    |
| Named environments             | Unavailable; use the top-level root config                                             |
| `CLOUDFLARE_WORKERS_SUBDOMAIN` | Needed in fresh CI when versions have no preview URL; cached locally after a deploy    |
| `--require-email`              | Fail instead of deploying without email when the email step cannot run, as in CI       |
| `DATABASE_URL`                 | Required in the deploy environment for PostgreSQL or MySQL provisioning and migrations |

The token needs Workers Scripts: Edit, read access to bound resources, and edit permissions for products Void provisions. First-time Hyperdrive provisioning specifically needs `CLOUDFLARE_API_TOKEN` with Hyperdrive edit permission, or an existing config ID in `wrangler.jsonc`.

Email setup needs a browser session from `void cloudflare login`, which carries the Email Routing and Email Sending scopes (a session created by older Cloudflare tooling lacks them: `void cloudflare logout`, then sign in again), or a `CLOUDFLARE_API_TOKEN` that also has Email Routing Edit and Email Sending Edit. A Global API Key pair is refused.

Sandbox apps need Docker, [Workers Paid](https://dash.cloudflare.com/?to=/:account/workers/plans), and Containers access. API tokens need Account / Containers: Edit and Account / Cloudchamber: Edit. Void checks access before provisioning or building; apps without Sandbox skip that check.

Void provisions inferred resources, builds and validates the app, applies migrations, validates remote secrets, and checks the uploaded Worker Version before sending it traffic. After activation it synchronizes routes, custom domains, cron triggers, queue consumers, and the Email Routing rules derived from `addresses`. Static, hybrid, and SSR output from supported frameworks is also supported. A brand-new Worker may need one ordinary deployment before the Versions API can be used.

If Cloudflare Access protects readiness URLs, supply an allowed `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` pair, or a short-lived local `CF_ACCESS_TOKEN`. These credentials are used only for matching HTTPS readiness requests. Versions without accessible previews can be checked at 0% traffic through the stable hostname.

Secrets and migrations are validated after the build, so a failed check may leave provisioned resources. It doesn't apply remote D1 migrations or upload the application Worker. PostgreSQL migrations are transactional; MySQL schema changes may partially apply on error.

Provisioning reuses known resource IDs and writes newly resolved IDs into `wrangler.jsonc`, preserving comments but possibly changing indentation. Commit that file for other machines and CI. Run the first deploy from one machine at a time because provisioning locks are local. The old `--provision` flag is accepted but no longer needed.

`.env` is local-only and isn't emitted into Worker vars. Store every schema-declared server key with `void secret put <NAME>`; Void emits required names through `secrets.required` and blocks plaintext server vars. On a new Worker, set required secrets before retrying if the initial remote check reports them missing. Custom D1 layouts are accepted only when Cloudflare's exact file set, bytes, and numeric order match the migrations Void validated. Direct deploy and operational commands use the top-level root config and reject named environments and alternate config-path overrides.

Existing remote secrets are preserved. Void also preserves or creates `BETTER_AUTH_SECRET` for auth apps.

**Email.** When the app uses email (`sendEmail()` or `email/` handlers) and `void.json` has `email.from`, the deploy reads the state of that address's zone before the build — session scopes, zone, MX records, Email Routing, subaddressing, routing rules, Email Sending, and what `wrangler.jsonc` holds — prints a checklist of what it would change in your account, and asks once (default Yes). On Yes it enables what is missing, writes `send_email: [{ "name": "SEND_EMAIL" }]`, the `__VOID_EMAIL_FROM` var and the `addresses` array into `wrangler.jsonc`, and lets wrangler create the routing rules when the activated version's triggers are synchronized; the deploy ends with the address map. A deploy with nothing left to set up asks nothing. Without `email.from` the deploy prints `add "email": { "from": "you@mail.acme.com" } to void.json` and continues without email. Non-interactive runs (CI, or stdin/stdout not a terminal) never prompt: they print the checklist plus `Run void email setup --platform cloudflare once locally, commit wrangler.jsonc, then redeploy` and deploy without email (or with the setup `wrangler.jsonc` already carries, when the binding is committed) — unless `--require-email` is passed, which fails instead. If setup has committed the exact subdomain `addresses` plan but the deploy's resolver still sees no MX records, Void preserves the plan and stops before build or upload until DNS can be verified. A deploy whose account rows all read ready reconciles the two config rows — `addresses` against the current derivation and `vars.__VOID_EMAIL_FROM` against `email.from` — with a plain file write and no prompt. See [Your own Cloudflare account](../guide/email.md#your-own-cloudflare-account) for the whole flow, including the subdomain-vs-apex rule and what stays manual.

See the [Cloudflare guide](../integrations/cloudflare.md#deploy-to-your-own-cloudflare-account) for the complete deployment sequence, first-deploy exceptions, secret precedence, and recovery behavior.

## Database

### `void db push`

Apply your Drizzle schema directly to the development database without creating migration files. D1 updates the local database; PostgreSQL and MySQL use `DATABASE_URL` from `.env`.

Use this for quick schema iteration while prototyping. Before deploying, generate and review migration files with `void db generate`.

### `void db generate`

Generate SQL migration files from schema changes.

The command compares your current `db/schema.ts` or `db/schema/` modules against the last generated Drizzle snapshot and writes new migration artifacts under `db/migrations/`. When Void-managed auth is enabled, it also resolves the Better Auth schema in production mode and includes those tables automatically, including configured renames and plugin tables. This works for auth-only apps without an application schema. Review and commit the generated files before deploying.

For SQLite, Void checks that the migration history applies to a fresh database. If generation fails this check, the previous SQL, snapshots, and journal are restored. If an existing migration fails, repair that unapplied migration first: rerunning generation compares snapshots and does not repair existing SQL. This check does not verify that a migration preserves existing data; review table rebuilds and foreign-key actions carefully.

### `void db status`

Show migration status. Displays which migrations are applied or pending locally, then uses the saved deployment target for remote status: the hosted API for Void projects, the pinned D1 database and its configured migration table for direct Cloudflare SQLite projects, or the shell `DATABASE_URL` for direct Cloudflare PostgreSQL/MySQL projects. If the remote credential or service is unavailable, local status is still shown.

### `void db reset`

Drop the local D1 database and re-apply all migrations. Does not affect the remote database.

### `void db seed`

```
void db seed [--file <path>]
```

Reset the local database, re-apply all migrations, then execute a seed file.

If `--file` is omitted, Void looks for default seed files in this order: `db/seed.ts`, `db/seed.mts`, `db/seed.js`, `db/seed.mjs`, `db/seed.sql`.

If more than one default seed file exists, the CLI stops and asks you to pass `--file <path>`.

Programmatic seed modules must export either a default function or a named `seed` function.

### `void db execute`

```
void db execute <sql>
void db execute --file <path>
void db execute --remote <sql>
```

Run ad-hoc SQL against the database. Provide SQL inline or from a file. SELECT queries display results as a formatted table; other statements execute silently.

By default, targets the local database. Pass `--remote` to run against the deployed database selected in `.void/project.json`:

- **Hosted D1 projects**: routes the query through the Void proxy (`proxy.void.cloud/d1/query`) using your auth token.
- **Direct Cloudflare D1 projects**: invokes Cloudflare against the pinned D1 binding from root `wrangler.jsonc`.
- **Hosted PostgreSQL and MySQL projects**: fetches the stored connection string from the platform and connects directly.
- **Direct Cloudflare PostgreSQL and MySQL projects**: uses `DATABASE_URL` from the current shell; Cloudflare cannot return the password from Hyperdrive.

For destructive statements (`DELETE`, `UPDATE`, `DROP`, etc.) when running in a TTY, you will be prompted to confirm before the query is sent to the deployed database. Non-TTY environments (CI) skip the prompt.

### `void db migrate`

```
void db migrate [--remote]
```

Apply pending migrations to the local database without resetting. Unlike `void db reset`, this preserves existing data and only runs migrations that haven't been applied yet.

Pass `--remote` to apply pending migrations to the saved target. Hosted projects require a Void login and link. Direct Cloudflare D1 projects use the binding's configured migration directory, table, and pattern; direct PostgreSQL and MySQL projects use the shell `DATABASE_URL`.

### `void db studio`

```
void db studio [--remote]
```

Open [Drizzle Studio](https://orm.drizzle.team/docs/drizzle-kit-studio) for the database. Launches a web-based GUI for browsing and editing your data.

By default, targets the local database. Pass `--remote` to open Studio against the deployed database:

- **PostgreSQL and MySQL projects**: fetch the stored connection string from the platform and open Studio against it. If the URL isn't stored yet, run `void db set-url` first.
- **D1 projects**: remote Studio is not yet supported. Use `void db execute --remote` for ad-hoc queries against your deployed D1 database.

On direct Cloudflare PostgreSQL/MySQL targets, remote Studio uses `DATABASE_URL` from the current shell. Direct D1 Studio remains unsupported; use `void db execute --remote`.

### `void db rename-migrations`

Rename existing migrations from the old numeric prefix format (`0001_name.sql`) to timestamp-based format (`20260410161500_name.sql`). Updates local tracking table and remote records if logged in with a linked project.

### `void db connect`

Connect an existing PostgreSQL/MySQL database or provision one through an adapter:

```sh
void db connect 'postgresql://user:password@host/database'
NEON_API_KEY=... void db connect --provider neon --name my-app
void db connect --provider @acme/void-db-provider --region region-id
```

The command saves `DATABASE_URL` in `.env`. When authenticated with a linked Void project, it also updates the encrypted deployment URL; pass `--local-only` to skip that sync. `neon` is built in. Other adapters are project dependencies or local modules exporting a `DatabaseProviderAdapter` from `void/database-provider`.

Provider-created credentials are never printed. For direct Cloudflare deploys, configure the same URL as a protected `DATABASE_URL` in the shell or CI environment that runs deploy.

### `void db set-url`

Update the PostgreSQL or MySQL connection string for deployment. Available for projects with `"database": "pg"` or `"database": "mysql"`.

Prompts for a connection string and sends it to the platform API to create or update the Hyperdrive configuration.

### `void db export`

```
void db export [--output <path>] [--no-data] [--no-schema] [--table <name>]
```

Dump the local database as SQL. Outputs to stdout by default (pipeable), or to a file with `--output`.

Data exports preserve SQLite AUTOINCREMENT and PostgreSQL SERIAL counters, including IDs consumed by deleted rows. PostgreSQL schema exports create serial sequences before their tables and restore ownership, constraints, and indexes afterward. `--no-schema` restores counter values into an existing schema; `--no-data` starts counters at their schema-defined starting values.

| Flag              | Purpose                            |
| ----------------- | ---------------------------------- |
| `--output <path>` | Write to a file instead of stdout  |
| `--no-data`       | Schema only (no INSERT statements) |
| `--no-schema`     | Data only (no CREATE TABLE)        |
| `--table <name>`  | Export a single table              |

## Code Generation

### `void gen model`

```
void gen model <name> [columns...]
```

Scaffold a complete model: migration file, CRUD API routes, and regenerated DB types in one command.

```sh
void gen model posts title:string body:text published:boolean
```

Creates:

- `db/migrations/NNN_create_posts.sql`: `CREATE TABLE` with `id` (autoincrement), your columns, and `created_at`
- `routes/api/posts/index.ts`: `GET` for list and `POST` for insert with validation
- `routes/api/posts/[id].ts`: `GET` by id with `404` handling
- Regenerated `.void/db.d.ts`

The generated routes automatically detect your validation library from `package.json` (`valibot`, `zod`, or `arktype`). If none is found, you will be prompted to choose one or skip validation. See [Database: Scaffolding](../guide/database.md#scaffolding) for the full type mapping.

Column format: `name:type` or `name:type?` (nullable). Types: `string`, `text`, `datetime`, `integer`, `boolean`, `real`, `blob`.

Model names must be lowercase alphanumeric with underscores (e.g. `posts`, `user_roles`). Existing files are never overwritten.

### `void gen migration`

```
void gen migration <name>
```

Create an empty migration file with a timestamp prefix (`YYYYMMDDHHMMSS`).

```sh
void gen migration add_avatar_to_users
# → db/migrations/20260410161500_add_avatar_to_users.sql
```

Existing projects using the old numeric prefix (`0001_`, `0002_`, ...) can rename with `void db rename-migrations`.

### `void gen route`

```
void gen route <path> [--methods get,post,...]
```

Create a route file with `defineHandler` exports. Defaults to GET.

```sh
void gen route api/health
void gen route api/users --methods get,post,delete
```

Creates `routes/<path>.ts` with an exported handler for each method. Supported methods: `get`, `post`, `put`, `patch`, `delete`.

### `void gen middleware`

```
void gen middleware <name>
```

Create a numbered middleware file with `defineMiddleware` default export.

```sh
void gen middleware auth
# → middleware/01.auth.ts (or 02, 03, etc.)
```

The prefix is auto-detected from existing middleware files.

### `void gen ssr`

```
void gen ssr [--react | --vue | --svelte | --solid]
```

Scaffold SSR entry points and a minimal App component for your framework.

Creates three files:

- `src/main.ssr.{tsx,ts}`: server entry with `defineRender`
- `src/main.client.{tsx,ts}`: client entry with hydration
- `src/App.{tsx,vue,svelte}`: minimal interactive component

If no flag is provided, the framework is auto-detected from `package.json` dependencies.

### `void gen cron`

```
void gen cron <name>
```

Create a cron job file in `crons/` with `defineScheduled` and a placeholder cron expression.

```sh
void gen cron hourly-sync
```

### `void gen queue`

```
void gen queue <name>
```

Create a queue consumer file in `queues/` with `defineQueue`, a `Message` interface, and commented-out batch options.

```sh
void gen queue emails
```

## Secrets

### `void secret list`

```
void secret list [--project <name>]
```

List production secret names for the saved target. Secret values are never printed. Direct Cloudflare targets query the Worker named in root `wrangler.jsonc`; `--project` is hosted-only.

### `void secret put`

On hosted projects, secret writes and deletes return a retryable conflict while a deployment or rollback is in progress. Wait for that operation to finish and retry; the rejected operation leaves the stored secret unchanged.

```
void secret put <name> [--project <name>]
void secret put <name=value> [--project <name>]
```

Value input modes:

- inline: `void secret put API_KEY=abcd`
- prompt (TTY): `void secret put API_KEY` (masked input)
- stdin: `echo -n "abcd" | void secret put API_KEY`

On a direct Cloudflare target, the value is sent to Cloudflare over stdin and stored as an encrypted Worker secret.

### `void secret sync`

```
void secret sync <file> [--project <name>]
```

Bulk upload secrets from a dotenv file. Each `KEY=value` line in the file is uploaded as a secret.

```sh
void secret sync .env             # validates and uploads declared server values
```

Direct Cloudflare targets use Cloudflare's bulk-secret API. Existing remote secrets absent from the file are not pruned.
Every entry must be a non-client key declared in `env.ts`, and its plaintext value must pass the schema before upload.

### `void secret delete`

```
void secret delete <name> [--project <name>]
```

Secret commands use the platform saved in `.void/project.json`. Hosted project resolution follows the same order as deploy (`--project`, env var, linked project). Direct Cloudflare targets reject `--project` and use the pinned root Cloudflare config.

## Env Schema

### `void env check`

```
void env check [--remote]
```

Without `--remote`, validate `.env` plus the shell for local development. With `--remote`, validate build-shell client values and the remote server-secret names. Exits non-zero if a required key is missing or a readable value is invalid.

### `void env types`

```
void env types
```

Regenerate `.void/env.d.ts` from `env.ts`. Normally happens automatically on dev server start and HMR; use this command after a fresh clone or to refresh stale types in non-dev contexts.

::: tip Deploy validation
`void deploy` runs the same schema validation automatically (with remote secrets) and refuses to upload if any required key is missing — no need to call `env check` separately when deploying.
:::

See [Environment Variables](../guide/env-vars.md) for the full guide.

## GitHub

Deploy-on-GitHub works from **any** Void login — Google, GitHub, or other SSO. The first time you connect GitHub, Void links your GitHub identity to your current account (a one-time step, independent of how you logged in); it never creates a second account.

### `void github link`

```
void github link
```

Link your current Void account to a GitHub identity. Opens your browser to authorize Void on GitHub (a localhost + PKCE handshake, the same mechanics as `void auth login`), then binds that GitHub identity to the logged-in account. Requires an authenticated CLI (`void auth login` first).

You normally don't need to run this directly — `void github install` runs the link automatically when your account has no GitHub identity yet. Run it on its own to link ahead of time, or to link a GitHub identity without installing the App.

::: warning Existing GitHub sign-in
Void accounts cannot be merged. If the GitHub account you authorize is already linked to a different Void account, including one created through GitHub sign-in, `void github link` is refused with `This GitHub account is already linked to another Void account.` Run `void auth logout` and sign in to that existing account, or authorize a different GitHub account. The command is also refused if your current Void account is already linked to a different GitHub identity. Re-authorizing the GitHub account attached to your current Void account is allowed and reports `GitHub account already linked.`
:::

### `void github install`

```
void github install
```

Open the GitHub App install page in your browser. If your account has no linked GitHub identity yet, `void github install` first runs the GitHub link automatically (browser authorize), then continues. After installing, run `void github connect` to link a repository to your project.

### `void github installations`

```
void github installations
```

List all GitHub App installations linked to your account. Each entry includes the `[id: <installation_id>]` needed for `--installation` in non-interactive use.

### `void github join`

```
void github join
```

Join the GitHub App installations your organization already has. If a teammate installed the Void GitHub App on a shared GitHub organization, run `void github join` to discover those installations without re-installing. Void opens your browser to authorize (a localhost + PKCE handshake, the same mechanics as `void github link`), confirms which installations GitHub makes visible to you, and records that visibility. Afterwards `void github installations` lists them without exposing the installation-wide private repository list; `void github connect` separately proves access to the repository you name.

In an interactive terminal you rarely need to run this yourself — `void github connect` runs the same join automatically when no active installations are linked to your account. Running `void github join` yourself matters mainly for non-interactive use (without a TTY, `void github connect` never opens a browser), or to link installations ahead of time.

Requires an authenticated CLI (`void auth login` first) and organization-installation sharing enabled on your Void instance; when it is not enabled the command fails closed with a clear message. You can only join installations your GitHub authorization actually returns — you cannot name or join one you cannot access on GitHub.

### `void github connect`

```
void github connect [project] [options]
```

Connect a GitHub repository to a Void project for automatic deploys. On every push to the configured branch, Void builds and deploys your project automatically.

Interactively (TTY), if your account has no active installations linked, `void github connect` first runs the same browser authorize as `void github join` automatically — if a teammate already installed the Void GitHub App on your organization, you join it on the spot and the connect continues. Only when no shared installation is found does it ask you to run `void github install`. The same recovery runs when `--installation <id>` names an installation your account is not linked to yet. Without a TTY, connect never opens a browser: it fails closed and tells you to run `void github install`, or `void github join` if your organization already installed the App.

**Options**

| Flag                  | Description                                                                       |
| --------------------- | --------------------------------------------------------------------------------- |
| `--project <name>`    | Project name (alias for the positional argument)                                  |
| `--installation <id>` | GitHub App installation ID (required when you have multiple installations)        |
| `--repo <owner/repo>` | Repository full name — required unless the installation grants exactly one repo   |
| `--branch <name>`     | Branch to deploy from — **required in non-interactive mode**                      |
| `--executor <type>`   | Build executor: `container` (default) or `github_actions`                         |
| `--workflow <path>`   | Authorized deploy workflow file — defaults to `.github/workflows/void-deploy.yml` |

The `--workflow` path is the workflow file the GitHub OIDC exchange authorizes to mint this project's deploy token. It defaults to the scaffolded `.github/workflows/void-deploy.yml`; set it only if your deploy step lives in a different workflow file (it must be under `.github/workflows/` and end in `.yml`/`.yaml`). Because the exchange is secretless, **only this one workflow** can mint a deploy token — any other workflow in the repo (including an unsafe `pull_request_target`) is rejected. Pointing it at a broad, multi-purpose workflow widens that trust, so prefer a dedicated file.

Interactively (TTY), after resolving the repository and branch, `void github connect` prompts for the **build executor** (defaulting to `container`). If you pick `github_actions`, it then prompts for the **deploy workflow file**, defaulting to `.github/workflows/void-deploy.yml` and validated locally before it is sent. Pass `--executor` and/or `--workflow` to skip the respective prompt. The workflow prompt is skipped entirely for the `container` executor, which does not use a workflow file.

**Non-interactive use (CI)**

When stdin is not a TTY, `void github connect` never prompts — it fails closed and names any flag it needs. `--branch` is always required. `--project` must be resolvable (positional / `--project` / `VOID_PROJECT` / linked `.void/project.json`). `--installation` is required only when your account has more than one installation; otherwise the sole installation is used. `--repo` is required when the installation grants access to all repos or to more than one selected repo; when it grants exactly one repo that repo is used automatically. `--repo` is also required when the installation does not expose a repository list to your account (shared org installations hide it). Use `void github installations` to discover the `installation_id`.

```
void github connect my-app \
  --installation 42 \
  --repo owner/my-app \
  --branch main
```

**Project resolution** follows the same order as deploy: positional / `--project`, `VOID_PROJECT`, linked project (`.void/project.json`).

**Connecting as an organization member**

For every organization installation, `void github connect` confirms that you personally have access to the specific repository, including when you originally installed the App. Interactively (TTY), it opens your browser once to authorize access to that repo on GitHub (a localhost + PKCE handshake), then completes the connection automatically. Without a TTY, this per-repo authorization never opens a browser: connect fails closed with an error explaining that the installation requires per-repo authorization and telling you to run `void github connect` locally. Interactively, connect joins the shared installation automatically when your account has no active installations linked, so running `void github join` first is optional. You can only connect repositories you can access on GitHub; seeing the organization installation never grants access to its other private repositories.

After upgrading from a platform version that treated an organization installer as an owner, existing organization connections show **Reconnect required** and stop starting builds until their repository access is proven. Run `void github connect <project> --repo <owner/repo>` again. The command reauthorizes the same connection in place after the browser proof; if the repository or installation changed, disconnect it first and connect the intended repository.

### `void github update`

```
void github update [project] [options]
```

Update an existing connection's deploy **branch**, **build executor**, and/or authorized **workflow file**. Use this to change settings on a project that is already connected — for example, flipping the executor from `container` to `github_actions` for a monorepo whose Void app lives in a subdirectory, moving the deploy branch, or pointing the OIDC trust at a different workflow file. The project must already be connected (run `void github connect` first); the repository and installation are not changed.

**Options**

| Flag                | Description                                                      |
| ------------------- | ---------------------------------------------------------------- |
| `--project <name>`  | Project name (alias for the positional argument)                 |
| `--branch <name>`   | New branch to deploy from                                        |
| `--executor <type>` | New build executor: `container` or `github_actions`              |
| `--workflow <path>` | New authorized deploy workflow file (under `.github/workflows/`) |

Interactively (TTY), `void github update` shows the current branch and executor and prompts for new values, defaulting each to the current setting. If the resulting executor is `github_actions`, it then prompts for the **deploy workflow file**, defaulting to the current path and validated locally; pass `--workflow` to skip that prompt. The workflow prompt is skipped when the executor is `container`, which does not use a workflow file. When stdin is not a TTY, it never prompts: pass at least one of `--branch` / `--executor` / `--workflow`, or it fails closed. If nothing actually changes, the command reports "no changes" and does not call the API.

```
void github update my-app --executor github_actions
```

**Project resolution** follows the same order as deploy: positional / `--project`, `VOID_PROJECT`, linked project (`.void/project.json`).

### `void github status`

```
void github status [project]
```

Show a project's current GitHub connection: the connected **repository**, the deploy **branch**, the **build executor** (`container` or `github_actions`), and the authorized **deploy workflow file**. Read-only — it never changes anything. The workflow file is the OIDC pin used only for `github_actions` builds; on a `container` connection it is still shown but marked unused. Legacy organization connections also show **Reconnect required** until `void github connect` proves current access to that repository. The project must already be connected (run `void github connect` first, otherwise it reports that and exits).

**Options**

| Flag               | Description                                      |
| ------------------ | ------------------------------------------------ |
| `--project <name>` | Project name (alias for the positional argument) |

```
void github status my-app
```

**Project resolution** follows the same order as deploy: positional / `--project`, `VOID_PROJECT`, linked project (`.void/project.json`).

### `void github disconnect`

```
void github disconnect [project]
```

Disconnect a project from its GitHub repository, stopping automatic deploys. Any in-flight builds for the project are cancelled (their deploy tokens are revoked) before the connection is removed. If the project has no connection, it reports that and exits successfully. To point a project at a different repository, disconnect first, then run `void github connect`.

You are asked to confirm before anything is removed. Pass `--yes` to skip the prompt; `--yes` is **required** in a non-interactive shell (CI), where there is no prompt to answer.

**Options**

| Flag               | Description                                                       |
| ------------------ | ----------------------------------------------------------------- |
| `--project <name>` | Project name (alias for the positional argument)                  |
| `--yes`            | Skip the confirmation prompt (required in non-interactive shells) |

```
void github disconnect my-app --yes
```

**Project resolution** follows the same order as deploy: positional / `--project`, `VOID_PROJECT`, linked project (`.void/project.json`).

## Build

Inspect Deploy-on-GitHub builds.

### `void build logs`

```
void build logs [build] [--follow] [--output <file>] [--project <slug>]
```

Stream, tail, or download the build logs for a **container** build. With no
`[build]` argument, targets the project's most recent build.

| Flag                     | Purpose                                                           | Default |
| ------------------------ | ----------------------------------------------------------------- | ------- |
| `--follow`, `-f`         | Live-tail: poll until the build reaches a terminal status.        | off     |
| `--output <file>`, `-o`  | Write logs to a file instead of stdout (appends while following). | stdout  |
| `--project <slug>`, `-p` | Target project.                                                   | linked  |

**Project resolution** follows the same order as deploy: positional / `--project`,
`VOID_PROJECT`, linked project (`.void/project.json`).

Builds run on **GitHub Actions** keep their logs on GitHub — the command prints
the Actions run URL instead of streaming. Only the last 10,000 log lines of a
container build are retained.

Examples:

```
void build logs                     # print the latest build's logs
void build logs -f                  # follow the latest build until it finishes
void build logs bld_123 -o build.log  # download a specific build's logs
```

## Custom Domains

### `void domain add`

```
void domain add <hostname> [--project <name>]
```

Add a custom domain to the saved target. Hosted Void projects print the DNS records needed for SaaS hostname validation. Direct Cloudflare projects add a `custom_domain` route and immediately synchronize only the route configuration, leaving cron, queue, and workflow triggers unchanged; Cloudflare manages the DNS record and TLS certificate in a zone on the pinned account. Convert a legacy singular `route` field to a `routes` array first so adding the domain cannot shadow the existing route.

> Wildcard custom hostnames (`*.example.com`) are not supported — register each subdomain individually.

### `void domain delete`

```
void domain delete <hostname> [--project <name>]
```

Direct Cloudflare projects apply the change immediately. Deleting the final custom domain requires `CLOUDFLARE_API_TOKEN` with Workers Scripts: Edit permission because the standard trigger operation does not reconcile an empty custom-domain set; Void fails before changing local or remote state when that token is unavailable.

Remove a custom domain from the saved target. For Cloudflare, this removes the matching `custom_domain` route and synchronizes triggers. If Cloudflare rejects the update, Void restores the exact previous local config and immediately reapplies it remotely. If that second synchronization also fails, the CLI reports that remote route state may be partial instead of claiming a successful rollback.

### `void domain list`

```
void domain list [--project <name>]
```

List all custom domains. Hosted projects show active/pending state from the platform; direct Cloudflare projects list the custom-domain routes currently configured in root `wrangler.jsonc`.

### `void domain status`

```
void domain status <hostname> [--project <name>] [--verbose]
```

Check verification and SSL status for a specific domain. Prints a rolled-up state (`awaiting_dns`, `verifying_dns`, `issuing_cert`, `deploying_cert`, `awaiting_deployment`, `active`, `error`, or `pending`) with a one-line diagnostic explaining what Cloudflare is doing and any user action required. While the certificate is not yet active, the command also surfaces the records to configure — the traffic **CNAME** and the `_cf-custom-hostname` ownership **TXT** — so you can verify them. Activation is automatic: a background job reconciles pending domains (about every 2 minutes for the first 30 minutes after adding, then hourly), so this command is for instant feedback rather than required polling.

Pass `--verbose` to additionally print the raw multi-line status breakdown (DB status, SSL status, ownership state, verification errors) underneath the rollup.

Project resolution for domain commands follows the same order as deploy (`--project`, `VOID_PROJECT`, linked project).

For direct Cloudflare projects, status reports whether the route is present in the root config. It does not claim to inspect remote certificate issuance; Cloudflare owns that state and exposes it in the dashboard. `--project` is hosted-only.

## Email

Inspect email usage and manage the recipients a project is allowed to send to. See [Email](../guide/email.md) for the runtime API.

Project resolution for email commands follows the same order as deploy (`--project`, `VOID_PROJECT`, linked project). `void email setup` and `void email status --platform cloudflare` are the exception: they act on your own Cloudflare account through your Cloudflare sign-in (`void cloudflare login`) and need no Void project.

### `void email usage`

```
void email usage [--project <name>]
```

Show the current month's recipient attempts and inbound receipts, the monthly attempt limit, and how much of it is left. Reserved submissions count toward the limit; started attempts remain charged even if delivery fails or its outcome is unknown. A suspended project is flagged in the output.

### `void email logs`

```
void email logs [--limit <n>] [--project <name>]
```

Show recent email operation metadata retained for 30 days: timestamp, direction, operation ID, recipient, and state. `--limit` accepts 1–100. Subjects, bodies, and attachments are not stored. Provider acceptance does not confirm mailbox delivery; inspect unknown outcomes before retrying.

### `void email destinations`

```
void email destinations [--project <name>]
```

List the project's recipient addresses and their state (`verified`, `pending`, or `failed`). Outbound mail is only delivered to verified addresses.

### `void email allow`

```
void email allow <address> [--project <name>]
```

Add one recipient to the project's destination list. Cloudflare emails that address a verification link — the recipient clicks it, with no Void or Cloudflare account required. Then run `void email destinations`: the listing is what records the click, and until it has, a send to that address returns `UNVERIFIED_DESTINATION` for that recipient. If the link did not arrive or has expired, run `void email allow <address>` again while the address is still pending — the CLI re-sends the link, or tells you how to get a fresh one.

The project owner's email is added automatically when the project is created, so it skips this step but not the verification: unless Cloudflare already had it verified for an earlier project of yours, click the link it mailed and run `void email destinations`; until then a send to yourself returns `UNVERIFIED_DESTINATION` for that recipient.

### `void email disallow`

```
void email disallow <address> [--project <name>]
```

Remove one recipient from the project's destination list. New sends to that address are refused immediately; previously admitted attempts may finish. No deploy is involved.

### `void email domain`

```
void email domain <add|status|list|sync|rotate-secret|remove> [<domain>] [--project <name>]
```

Send and receive at your own domain on a Cloudflare zone you own, registered to the project. Void platform only — on your own Cloudflare account the mail domain comes from `email.from` instead (see `void email setup`). The walkthrough is [Your own domain on the platform](../guide/email.md#your-own-domain-on-the-platform).

#### `void email domain add`

```
void email domain add <domain> [--subdomain <label|host>] [--project <name>]
```

Register an exact domain with the project using a scoped Cloudflare API token. The CLI opens a token template, accepts a masked paste or newly copied token, and asks you to confirm account and zone restrictions. Credentials are encrypted for the zone connection. The CLI proposes `mail.<domain>` when the apex already has MX records; `--subdomain` overrides that proposal. Several domains can share a zone connection, but each domain belongs to one project. Setup returns an operation ID so an interrupted request can be checked without restarting the operation.

#### `void email domain status`

```
void email domain status <domain> [--project <name>]
```

Show the recorded inbound, outbound, and management readiness, observation times, and latest operation. Use `sync` to reconcile setup and refresh readiness.

#### `void email domain list`

```
void email domain list [--project <name>]
```

List the project's registered email domains and readiness.

#### `void email domain sync`

```
void email domain sync <domain> [--project <name>]
```

Reconcile the domain connection and refresh readiness. Sync does not rotate its secret. A blocked or uncertain operation exits unsuccessfully and names the operation to inspect.

#### `void email domain rotate-secret`

```sh
void email domain rotate-secret <domain> [--project <name>]
```

Rotate the ingress secret for the zone connection shared by this domain and its siblings. Inbound must be ready; run `void email domain sync <domain>` first if setup is incomplete. The platform accepts the staged secret before updating the Worker and promotes it only after verifying the deployed generation. An uncertain update stays recorded for reconciliation.

#### `void email domain remove`

```
void email domain remove <domain> [--project <name>]
```

Disable the domain assignment and record cleanup. Zone resources used by another domain remain available. Unfinished or uncertain cleanup remains recorded until it can be reconciled safely.

### `void email status`

```
void email status --platform cloudflare
```

Read-only. Checks the email setup on your own Cloudflare account for the domain of `email.from` in `void.json` — session scopes, zone, MX records, Email Routing (and its subaddressing setting), Email Sending, the routing rule for every `email/` handler, and the `send_email` binding — then prints the status rows and the address map (`inbound <address> → email/<handler>`, `outbound sendEmail() from <email.from>`). Exits 1 when anything is not ready. A domain still not onboarded for Email Sending reads as set up once the `send_email` binding is committed — the binding is written only after an onboarding attempt, so that pair is how a Workers Free refusal is remembered — and the sending row says so (`not onboarded — verified destinations only; after upgrading to Workers Paid run void email setup --platform cloudflare`). Takes no `--project`: it reads the local project and your Cloudflare session, never a Void project.

Without `--platform cloudflare` (or with `--platform void`) the command is not available yet; on the Void platform use `void email usage` and `void email destinations`. The older `--backend cloudflare` spelling remains available as a compatibility alias on `void email status` and `void email setup`, with the same rules as `void deploy`: at most once, and never together with `--platform`.

### `void email setup`

```
void email setup --platform cloudflare
```

The same setup `void deploy --platform cloudflare` offers on its first deploy, on its own — for CI, which cannot press Enter: run it locally once, commit `wrangler.jsonc`, then let CI run `void deploy --platform cloudflare --require-email`. Needs `email.from` in `void.json` and a `void cloudflare login` session (a session created by older Cloudflare tooling lacks the email scopes: `void cloudflare logout`, then sign in again) or a `CLOUDFLARE_API_TOKEN` with Email Routing Edit + Email Sending Edit — the CI credential. It runs the preflight above, prints the checklist of what will change on your account, asks once, then:

1. enables Email Routing on the domain (on an apex through Void's bundled Cloudflare tooling; a subdomain through your session's bearer, borrowed for that one call and dropped),
2. turns on subaddressing for the zone, so `support+anything@` reaches `support@`,
3. onboards the domain for Email Sending (a Workers Free account keeps inbound and sends to verified destinations only),
4. writes `send_email: [{ "name": "SEND_EMAIL" }]`, the derived `addresses` array, and `vars.__VOID_EMAIL_FROM` into your root `wrangler.jsonc`, comments preserved.

The routing rules themselves are created by the next `void deploy --platform cloudflare`: wrangler applies its Email Routing plan from `addresses` on deploy. `void email setup` never writes `addresses` unless routing is ready for the domain, prunes an address already routed to another worker or a forward (and says so), and skips the whole step when the existing `addresses` array holds entries it did not derive. A run that finds every row ready asks nothing and changes nothing on your account — with one exception: a domain still not onboarded for Email Sending while the `send_email` binding is committed (a remembered Workers Free refusal, see `void email status`) is offered as a retry on its own prompt, `Onboard <domain> for Email Sending? Inbound already works; onboarding needs Workers Paid.` — the step to run once after upgrading; answer No and nothing changes. The deploy never retries it. Needs an interactive terminal; exits 1 when the inbound rows are still not ready afterwards — routing not enabled, subaddressing still off, or `addresses` withheld — naming the row and saying to rerun. A Workers Free account's refused sending row is not a failure: inbound is complete, `addresses` is written, the plan hint is printed, and the binding written alongside is what makes the next deploy and `void email status` read the domain as set up. See [Your own Cloudflare account](../guide/email.md#your-own-cloudflare-account).

## Agent

### `void init --agents`

Runs all agent setup steps:

1. **Instructions:** always creates or updates `AGENTS.md` with four brief bullets and versioned markers. Content outside the Void block and other instruction files are preserved.
2. **Skills:** links skills for detected coding agents.

There is no agent-selection prompt. If no agent is detected, skill linking is skipped; the instructions point directly to `node_modules/void/skills/void/docs/`.

## Environment variables

| Variable       | Purpose                                                                   | Default |
| -------------- | ------------------------------------------------------------------------- | ------- |
| `VOID_TOKEN`   | Auth token override instead of saved config                               | none    |
| `VOID_PROJECT` | Default project slug for deploy, secret, domain, and cache purge commands | none    |
