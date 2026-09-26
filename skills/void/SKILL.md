---
name: void
description: Void skill for app development and CLI operations. Use this skill to route user requests to the appropriate bundled Void docs.
---

# Void Skill

This skill is a router. Open the minimum relevant docs files under `docs/` and execute.

Docs in this skill are bundled from `docs/` during `void` package build and live at:

- `skills/void/docs/**/*.md`

`void init --agents` always writes brief instructions to `AGENTS.md`, pointing to `node_modules/void/skills/void/docs/`. It preserves content outside its versioned block, leaves other instruction files untouched, and links skills for detected agents without asking which agent is in use.

`void init` offers Git initialization with `--git` / `--no-git` overrides and suggests an optional initial commit command. It preserves existing repositories and never commits automatically; see `docs/reference/cli.md` for CI and workspace behavior.

## Command Naming

For a new platform installation, prefer an app domain at the zone apex. Nested
app domains need an active wildcard edge certificate and SSL-and-Certificates
read permission; `void platform install --plan` verifies coverage. Use the
self-hosted platform guide for certificate setup rather than enabling a paid
product without an explicit request.

For first-time platform setup, follow the installation pages linked from `docs/guide/self-hosted-platform.md` in order and introduce credentials when the user reaches that step. Recommend a domain; offer explicit `void platform install --workers-dev` for testing before one is ready. PostgreSQL, credentials for the selected login methods, runtime/R2 credentials, and saved signing/encryption keys are required. GitHub is the default and is optional. `--auth-config` accepts nonsecret provider configuration with environment secret references; `--plan` does not read those secrets. Configurable installations finish first-administrator setup using a one-time code and browser identity confirmation. Domain-free installation skips zone/DNS/certificate operations and can use browser login. `void platform domain set <domain>` later performs resumable DNS/HTTPS setup while preserving existing test URLs and the API origin. The command checks the deployed runtime token's cache-purge permission for the new zone; it does not ask users to retrieve that token. Prefer interactive prompts for secrets and keep CI variables in the CI workflow. Void creates the platform infrastructure and database tables.

For an existing Cloudflare site, run `void deploy` with its root `wrangler.jsonc` or `wrangler.json`. An unlinked project gets a prompt to link and deploy using the existing Worker and resources. Accepting verifies and saves the destination, then continues deployment. Keep new application resources, migrations, auth setup, and secret changes separate from this first handoff; ISR has its own explicit cache choice. The active Worker Version must be the latest upload so inherited secrets have an unambiguous source. Failed builds retain the link for retry. Read `docs/integrations/cloudflare.md` for the supported configuration and rollback behavior.

When linking reports missing inferred resources, check the listed bindings and inference reasons against the existing Worker and `void.json`; preserve `.void/cloudflare-link.json` for retries. For prerendered/revalidated sites without a cache, migration saves an explicit `routing.isr` choice in `void.json`. True provisions the cache during this deployment; false keeps ISR disabled on retries and later deployments until changed. Keep page-level exports with either choice. CI must configure the boolean before resuming a migration with no saved choice. An application KV binding explicitly named `ISR_CACHE` is still required. Existing D1 bindings without checked-in migrations retain their local migration settings during handoff.

For Cloudflare upload failures, use the detailed error message printed by the CLI and saved in the deploy log. A numeric error code alone may not identify the cause.

Platform administration uses `void platform auth login` and the nested
`user`, `project`, `deployment`, `build`, `signup`, `invitation`, `email`, `system`, and
hosted-only `worker` groups. Open the operator section of `docs/reference/cli.md`
before running these commands. Use `--json` for structured reads and `--plan`
to inspect mutations; approved noninteractive mutations require `--yes`.
The last active administrator cannot be deleted or suspended. If an allowed
administrator removal reports partial cleanup, access remains revoked; use a
remaining administrator to inspect the result and retry.
Use `void platform config auth` to configure login methods; `platform auth`
manages your administrator session. Test a pending configuration before enabling
it, explicitly link identities when switching methods, and verify a linked
alternative before disabling a method. Disabling revokes its human sessions,
including human tokens used in CI, while scoped deployment tokens remain valid.
Create CI credentials with `void project token create`; they are bound to one
project, expire within 90 days, and support explicit renewal and revocation.
Cloudflare Access service credentials pass only the perimeter and never renew or
elevate a human or operator token.
For scripted configuration, use nonsecret JSON with `--file` and read secrets
with `--client-secret-env`; never put client secrets in command arguments.
Use `void platform config auth admission` to select company-approved automatic
signup when the organization's identity policy already determines eligibility;
individual invitations remain optional. The same controls are available under
Settings in the administrator UI.
Access login and platform protection are independent. The installer can create
dedicated Access applications or connect existing ones, including a separate
identity account. Protection setup verifies API/proxy coverage and uses scoped
service credentials for installation and CI. Use `platform config auth protection`
to show, enable, or disable protection; retain the company gate when probes fail.
Users link another enabled method with `void auth link [connection-id]` after
recent sign-in and explicit browser identity confirmation. For expired first-admin
codes, resume installation or repair completed provisioning. Lost-provider recovery
uses `platform config auth recover` with installation ownership, original recovery
keys, an existing administrator ID, and a real provider login; never reopen signup.
Operator credentials are separate from application deployment credentials and
ignore repository platform selections. `VOID_OPERATOR_TOKEN` requires an
explicit `VOID_API_URL` or `--connection`; credentials must never be written to
project files. `signup open` allows public signup and `signup restrict` enforces
the allowlist. For OIDC identities without verified email, use `signup allow identity
<connection-id> <subject>` and the exact `signup disallow` counterpart; never infer an
email or link accounts. Inspect `system events` and the target object after an ambiguous
mutation failure before retrying.

Use `void connect` for deployment onboarding: no arguments offers Cloudflare or a Void platform, `--platform cloudflare` signs in and selects an account, and a platform URL verifies discovery and signs in with a supported provider. It preserves existing project links when connecting elsewhere. `--no-login` saves only verified Void connection metadata; authenticated headless connection requires a valid origin-scoped keychain session or `VOID_TOKEN` with matching `VOID_API_URL`. Platform installation and administration use `void platform`.

For Void platform project access, use `void project team`: invite only an email already registered on that platform and assign `reader`, `collaborator`, or `admin`. The invited account uses `void connect <url>` followed by pending/accept/decline on that active connection, regardless of the current directory's project link or deploy target. `VOID_API_URL` overrides the connection; an unscoped `VOID_TOKEN` selects Void Cloud. Acceptance preserves directory links; run `void project link` in an unlinked checkout of the invited application. Project-scoped team management does not apply to direct Cloudflare deployments. Installation administrators transfer ownership with `void platform project owner <project-id> <user-id> --plan` and apply the reviewed transfer with `--yes`.

Use Void commands for every user-facing workflow. Never ask the user to install, authenticate, or run Wrangler directly. Say Cloudflare or Void instead, except when naming literal `wrangler.jsonc` / `wrangler.json` files or `WRANGLER_*` environment variables the user must inspect.

Use `void` in examples and commands in this skill. For first-time setup, prefer `void init` followed by `void deploy`; in an empty directory, install `void` first and let `void init` add the matching Pages adapter and starter dependencies with Vite+ as the default scaffold toolchain. In an existing app, `void init` configures Void in place by adding missing Vite scripts and creating or patching `vite.config.*` with `voidPlugin()`. For Cloudflare deployment, Void uses bundled tooling and secure browser OAuth; init or the first deploy saves the selected `account_id`, and `void cloudflare login|status|logout` manages the session; Void-managed deployment requires an explicitly connected platform. Use `void connect <url>` for an existing platform or `void platform install --plan` to preview a company control plane in the user's Cloudflare account. The core self-hosted platform excludes the dashboard, GitHub App, and build Containers; lifecycle commands are resumable and verify remote, Worker, and R2 ownership before mutations. `void platform disable` gates traffic through installation-owned routing storage and remains disabled through repair or upgrade; `void platform enable` explicitly restores traffic. Safe uninstall retains name-addressed Workers, R2, AI Gateway, external PostgreSQL, and zones for explicit manual cleanup. Direct Cloudflare deploys support native Void apps, static/SPA/SSG output, and Cloudflare builds from TanStack Start, React Router, vinext, SvelteKit, Nuxt, Analog, and Astro. They provision inferred resources, validate and apply migrations, require schema-declared server values in encrypted remote secret storage, upload and probe an immutable Worker Version, then activate and synchronize triggers. Native Void features are Workers Free-compatible by default; `void/sandbox` is an explicit exception because it uses Cloudflare Containers and therefore requires Workers Paid. A Sandbox deploy checks Containers access before provisioning/building, while apps without Sandbox perform no entitlement probe. Versions without preview URLs are staged at 0% and probed through workers.dev using a version override; the same safe fallback applies when Access blocks a generated preview alias but admits the stable Worker hostname. Set `CLOUDFLARE_WORKERS_SUBDOMAIN` in a fresh CI checkout, while local deploys cache it automatically. When Cloudflare Access protects `workers.dev`, use an admitted `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` service-token pair for CI, or a short-lived `CF_ACCESS_TOKEN` from `cloudflared` for an interactive local readiness probe. With Cloudflare saved in `.void/project.json`, secret, domain, project status/log/rollback, and remote database commands operate directly on the pinned Worker/account. Logs are a live tail. Rollback restores the selected version's saved schedules, queues, workflows, routes, and domains but never reverses database migrations; versions without complete trigger snapshots use code-only rollback and keep the current routes and schedules. On either deployment platform, auth-enabled `void deploy` preserves an existing `BETTER_AUTH_SECRET` or creates a persistent encrypted secret when missing; always use Void's deployment flow so it can manage that secret safely.

Use `void` and `@void/*` in code examples and package manifests.

Non-interactive self-hosted platform install, upgrade, repair, disable, enable, and uninstall commands require `--yes`; `--plan` is read-only and needs no acknowledgement.

Platform install plans show actual resource names, the GitHub callback, and credential links without opening credential pages or saving a draft; Cloudflare browser login still opens if needed. New platforms use `void-<name>-<role>` names without random suffixes. Conflicts stop installation; existing installations retain recorded names. Approved interactive installs open the runtime-token, GitHub OAuth, and R2 pages only when those credentials are missing, with fallback instructions. Local credential drafts preserve the callback across retries and encrypt partial inputs. Interactive installs list unfinished installs, including interrupted provisioning, or offer "Start a new platform install". Entering an unfinished name asks to resume it; declining returns to name entry. Completed platforms are excluded, and new installs never inherit or delete old credentials or resources. Use `--resume --name <id>` to continue directly or in CI. Do not generate replacement signing keys or create another installation to recover a cancelled prompt.

Cloudflare browser login does not grant AI Gateway access. A platform installation preview may mark that resource `inspect`; apply must verify it with the existing runtime-token input (Account → AI Gateway → Edit) before any provisioning. Never treat a permission failure as an empty resource inventory or skip ownership verification. The runtime token is used only for AI Gateway provider calls; other operations retain the operator credential.

Use `--runtime <directory>` on platform install, upgrade, repair, enable, or rollback when deploying a locally built `@void/platform` runtime. The directory must contain the generated integrity manifest, Worker artifacts, and migration tree. Build it with `vp run --filter @void/platform build`; Git source revisions are detected automatically, with `-dirty` for uncommitted changes. `VOID_PLATFORM_SOURCE_REVISION` is an optional override. Do not treat this as a safety bypass: custom and packaged runtimes follow the same verification and rollback path.

For self-hosted platform installation, require a dedicated empty PostgreSQL database. Interactive lifecycle commands use Cloudflare browser OAuth with keyring storage. Wrangler OAuth has Zone Read, so a plan that creates a zone or DNS record requires a scoped `CLOUDFLARE_API_TOKEN` with Account → Zone → Edit and/or Zone → DNS → Edit; finish Workers onboarding and choose a workers.dev subdomain for a fresh Cloudflare account. The installed platform uses a separate `VOID_PLATFORM_RUNTIME_CLOUDFLARE_API_TOKEN`. Its core permissions include Hyperdrive: Write at account scope and Cache Purge: Purge on the application zone; SSL and Certificates: Edit is needed only when a custom runtime enables custom project domains. Managed Sandbox apps additionally require Workers Paid plus Account → Containers → Edit and Account → Cloudchamber → Edit on that runtime token; these are checked on the first Sandbox application deploy, not during platform install or upgrade. The installer preflights account and Hyperdrive access and safely verifies Cache Purge for an existing zone with a unique nonexistent URL. Fresh installs require unique per-installation values from the operator's secret manager: `VOID_PLATFORM_JWT_SECRET` with at least 32 random bytes and `VOID_PLATFORM_PROJECT_SECRET_KEY` as canonical base64 for 32 random bytes. Never let a local checkpoint or ephemeral CI runner be their only custodian. Enabling email generates a separate signing key in encrypted recovery state; supply `VOID_PLATFORM_EMAIL_SIGNING_SECRET` from the secret manager for headless installs without persistent recovery files. The installer transactionally claims the database for one installation, pins that URL after a successful claim, never removes the claim during uninstall, and uses it for a cross-host lifecycle lock plus a secret-free authoritative lifecycle manifest. Local recovery checkpoints are AES-256-GCM encrypted with an OS-keychain key; never place platform secrets in plaintext files. After discovery on a new machine, provide `VOID_PLATFORM_DATABASE_URL`. For email-enabled installations without encrypted recovery state, also restore the original `VOID_PLATFORM_EMAIL_SIGNING_SECRET`; recreating only the email gateway needs this key, not JWT or runtime credentials. Normal upgrades preserve other deployed Worker secrets; restore the original runtime, GitHub, R2, JWT, and project-encryption values when recreating the API or proxy as documented. Upgrades enable managed Sandboxes automatically. An upgrade from the tenant-owned legacy may still require `void platform system sandbox-drain`: preview with `--plan`, follow each `nextCursor`, then apply with `--yes` until the DB-backed response reports `complete: true`; never delete an unverified app by name. The installer trusts only DB-backed sandbox-drain probe protocol v1. Before it accepts an empty inventory, the database admission barrier makes older deployment inserts finish and become visible or rejects them after the protocol floor is armed. Lifecycle redeploys preserve unmanaged Worker routes and custom domains in both the new trigger state and rollback snapshot. They stop before migrations or uploads when live Hyperdrive origin metadata differs from the pinned database. Platform upgrade SQL is forward-only: packaged hashes and the live Drizzle prefix must match, pending migrations require an exact source-version/schema rollback edge, and the old version remains authoritative until target health succeeds. Use `void platform rollback --runtime <earlier>` only when the installed runtime declares the exact earlier version/schema compatible; pass `--from-runtime` for the exact current custom artifact. Rollback preserves the forward database schema and cannot lower a database-required safety protocol. Safe uninstall retains Worker routes, custom domains, and R2 for explicit manual cleanup because Cloudflare cannot condition their deletion on an immutable generation.

For self-hosted recovery, `VOID_PLATFORM_PROJECT_SECRET_KEY` restores an original `v1` project-secret keyring. After rotation, restore every retained version with `VOID_PLATFORM_PROJECT_SECRET_KEYS_JSON` and its active entry with `VOID_PLATFORM_PROJECT_SECRET_ACTIVE_KEY_VERSION`. These inputs restore a missing API Worker and never replace the live keyring of an existing Worker. Inject them from a secret manager without logging them or writing plaintext files.

For Cloudflare user switching, `void cloudflare login` always opens a fresh browser sign-in. `void cloudflare status` distinguishes the authenticated user and credential method from the project's pinned deployment account. Login never retargets a project. Remove API-credential environment overrides from the current shell before browser sign-in, without printing their values; automatic deployment checks continue to reuse valid sessions.

## No-Args Behavior

Published self-hosted platform routes and custom domains are observed and recorded as retained attachments. Lifecycle commands gate traffic through installation-owned routing storage but never delete those attachments unattended.

If invoked without a concrete task, do a brief app status check and report:

1. App type (`void`, `framework`, `spa`, `static`) using `docs/app-types.md` criteria.
2. Backend feature usage (`routes/`, `pages/`, `middleware/`, `migrations/`, `crons/`, `queues/`, SSR entries).
3. Runtime signals (`void/db`, `void/kv`, `void/storage`, queue usage).
4. Auth signals (`void/auth`, `auth` client imports, OAuth env vars).
5. Deployment platform and optional Void project linkage (`.void/project.json`), plus config readiness (`void.json`, Cloudflare `account_id`, tsconfig extends).
6. Optional health checks (`void auth whoami`, `void db status` when relevant).

Then ask what to do next.

## Task Routing

| User intent                                | Docs file(s)                                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| CLI command syntax, flags, env vars        | `docs/reference/cli.md`                                                                   |
| Initial setup, onboarding, first app       | `docs/guide/quickstart.md`, `docs/reference/cli.md`                                       |
| App type detection and mode behavior       | `docs/guide/app-types.md`, `docs/reference/config.md`                                     |
| Server/API routing and middleware          | `docs/guide/server-routing.md`, `docs/integrations/hono.md`                               |
| Pages mode, loader/action, forms, layouts  | `docs/guide/pages-routing/*.md`, `docs/guide/type-safety.md`                              |
| Database and migrations                    | `docs/guide/database.md`, `docs/guide/type-safety.md`                                     |
| Typed fetch and end-to-end typing          | `docs/guide/typed-fetch.md`, `docs/guide/type-safety.md`                                  |
| Authentication                             | `docs/guide/auth.md`, `docs/guide/env-vars.md`                                            |
| Cloudflare runtime bindings and config     | `docs/integrations/cloudflare.md`, `docs/reference/config.md`, `docs/guide/env-vars.md`   |
| AI inference (Workers AI, providers)       | `docs/guide/ai.md`                                                                        |
| KV / storage / queues / cron jobs          | `docs/guide/kv.md`, `docs/guide/storage.md`, `docs/guide/queues.md`, `docs/guide/jobs.md` |
| SSR and caching                            | `docs/guide/ssr.md`, `docs/guide/edge/*.md`                                               |
| Rewrites, redirects, fallbacks             | `docs/guide/edge/rewrites.md`, `docs/guide/edge/redirects.md`, `docs/reference/config.md` |
| Static site generation                     | `docs/guide/ssg.md`                                                                       |
| Deployment and CI                          | `docs/guide/deployment.md`, `docs/reference/cli.md`                                       |
| Install or maintain a company platform     | `docs/guide/self-hosted-platform.md`, `docs/reference/cli.md`                             |
| Develop or deploy a platform fork          | `docs/guide/platform-development.md`, `docs/guide/self-hosted-platform.md`                |
| Platform administration                    | `docs/guide/platform-administration.md`, `docs/reference/cli.md`                          |
| Self-host deploy to own Cloudflare account | `docs/integrations/cloudflare.md`, `docs/reference/cli.md`                                |
| Project status, deployment history         | `docs/reference/cli.md`                                                                   |
| Cache purging                              | `docs/reference/cli.md`                                                                   |
| Project logs, runtime errors               | `docs/reference/cli.md`                                                                   |
| Secrets management (put/sync/delete)       | `docs/reference/cli.md`, `docs/guide/env-vars.md`                                         |
| Typed env vars (`defineEnv`, `env.ts`)     | `docs/guide/env-vars.md`                                                                  |
| Custom domain setup                        | `docs/reference/cli.md`                                                                   |
| Database status, reset, seed, export       | `docs/reference/cli.md`, `docs/guide/database.md`                                         |
| Auth login/logout/whoami                   | `docs/reference/cli.md`                                                                   |
| Overview / introduction                    | `docs/guide/index.md`                                                                     |
| API surface details                        | `docs/reference/api.md`                                                                   |
| Meta framework integration                 | `docs/integrations/frameworks/*.md`                                                       |
| Coding agent setup                         | `docs/integrations/agents.md`                                                             |
| Node.js / Bun / Deno targets               | `docs/integrations/nodejs-bun-deno.md`                                                    |
| ORMs and external databases                | `docs/integrations/orms-and-external-dbs.md`                                              |
| Project structure and conventions          | `docs/reference/structure.md`                                                             |
| Resource/binding inference                 | `docs/reference/resource-inference.md`                                                    |

## Working Rules

- For any task involving running `void` commands — including checking status, managing secrets, viewing logs, or deploying — open `docs/reference/cli.md` FIRST. Do not guess command syntax.
- Never guess or infer `void` CLI command names or flags. Always consult `docs/reference/cli.md` for the exact command before running it.
- For multi-topic tasks, combine only the needed doc files.
- If docs and memory differ, follow docs.
- For Void-managed auth, `void db generate` automatically includes the production Better Auth schema in the generated migration, including configured model/field renames and plugin tables. Keep those migrations under `db/migrations/`; do not duplicate generated auth tables in the application Drizzle schema.
- **Env vars:** When the project has `env.ts`, the canonical access pattern is `import { env } from "void/env"`. Declare every env key in `env.ts` via `defineEnv({...})` so values are typed and validated. Do not introduce ad-hoc `process.env.X` or untyped `c.env.X` access in new code — add the key to `env.ts` first.

For platform email domains, use `void email domain add` with an account- and zone-scoped Cloudflare API token. Read inbound, outbound, and management readiness separately; `domain sync` reconciles without rotating secrets. Use a stable `sendEmail({ idempotencyKey })` for retryable sends and inspect `void email logs` when the result is `OUTCOME_UNKNOWN`; never retry an uncertain send with a new key. Administrators can inspect retained outcomes with `void platform email logs <project-id|slug> --json`; use the project ID after deletion. Native Cloudflare email setup remains `void email setup --platform cloudflare` and does not support platform idempotency keys.
