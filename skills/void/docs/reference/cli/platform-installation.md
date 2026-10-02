---
outline: deep
---

# Platform Installation {#void-platform-install}

```sh
void platform install [options] [--yes]
```

| Option                            | Purpose                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| `--name <slug>`                   | Installation name used in `void-<name>-<role>` resource names; choose an unused name |
| `--display-name <name>`           | Human-readable platform name                                                         |
| `--account <id>`                  | Cloudflare account id                                                                |
| `--auth-config <path>`            | Login methods, signup policy, and environment references for provider secrets        |
| `--login-methods <methods>`       | Comma-separated `github`, `google`, `oidc`, or `cloudflare-access` login methods     |
| `--access-protection`             | Protect the platform UI and APIs with Cloudflare Access                              |
| `--no-access-protection`          | Skip Cloudflare Access protection                                                    |
| `--hyperdrive <create\|id>`       | Create Hyperdrive or use the specified existing configuration                        |
| `--application-domain <domain>`   | Base domain for deployed apps                                                        |
| `--workers-dev`                   | Explicit testing mode; add an application domain later                               |
| `--zone <domain>`                 | Cloudflare zone containing the application domain                                    |
| `--dedicated-zone`                | Add zone-wide catch-all routes; valid only when the app domain is the whole zone     |
| `--no-dedicated-zone`             | Skip zone-wide application catch-all routes                                          |
| `--control-plane-domain <domain>` | Optional API custom hostname; defaults to `workers.dev`                              |
| `--no-control-plane-domain`       | Use the default `workers.dev` API hostname                                           |
| `--dashboard-url <origin>`        | HTTPS origin of an optional dashboard deployed separately                            |
| `--plan`                          | Resolve and print a read-only plan                                                   |
| `--resume`                        | Continue the matching checkpointed installation                                      |
| `--runtime <path>`                | Deploy a locally built, integrity-checked runtime directory                          |
| `--yes`                           | Acknowledge Cloudflare changes in non-interactive use                                |

For a first installation, follow [Install a Void Platform](../../guide/self-hosted-platform.md). The interactive installer recommends using a domain and offers **Use workers.dev for testing** as a visible alternative. Void creates the platform infrastructure and tables. External PostgreSQL and a configured login method are required in either mode; GitHub OAuth is the default login choice, not a requirement. `--workers-dev` skips zone/DNS/certificate operations and cannot be combined with `--application-domain`, `--zone`, or `--dedicated-zone`.

Read-only plans, workers.dev installations with the default API hostname, and supported lifecycle operations can use Cloudflare browser login and the system keychain. Installation that writes DNS or creates a zone needs an explicit management token through `CLOUDFLARE_API_TOKEN` or `CF_API_TOKEN`.

The installed platform needs a separate runtime token to provision resources for apps. The interactive installer prompts for it and the other setup values. For non-interactive installs, inject the variables listed in [Install from CI](../../guide/platform/installation/ci.md).

To enable email during install or upgrade, set both `VOID_EMAIL_SENDER_DOMAIN` and `VOID_EMAIL_SHARED_ZONE_ID`. Void records the pair for later upgrades; supplying only one is an error.

Use `--dashboard-url https://dash.example.com` when deploying the optional user
dashboard separately. The URL must be an HTTPS origin without credentials, a
path, query, or fragment. Void permits that origin's login callbacks and saves
it for later maintenance; it does not deploy a dashboard Worker. Omission keeps
an existing installation's saved dashboard origin.

`--plan` previews resource names, login methods, callback URLs, and credential requirements. Run the install or resume command printed at the end to continue. For login configuration, use either `--auth-config` or `--login-methods` with the Access protection flags.

New resources use `void-<name>-<role>` names; choose an unused installation name. The installer opens setup pages for missing credentials and reuses values already supplied.

Installation progress and partial credentials are saved encrypted locally. Rerun the installer to continue unfinished setup, or pass `--resume --name <id>`. Use lifecycle commands for completed installations.

Use an empty PostgreSQL database dedicated to the installation. You can correct a failed initial connection, but after the database is claimed or Hyperdrive is provisioned, commands reject a different URL.

Choose whether Void creates Hyperdrive or uses an existing configuration. An existing Hyperdrive must point to the platform database with SQL result caching disabled. Supply a database owner URL for migrations. See [Use an existing Hyperdrive](../../guide/platform/installation/prerequisites.md#use-an-existing-hyperdrive) for setup and [Install from CI](../../guide/platform/installation/ci.md) for unattended inputs.

Recovery secrets are encrypted using your system keychain. Without one, supply a base64-encoded 32-byte `VOID_PLATFORM_RECOVERY_KEY`. Keep the original credentials in protected CI secrets for recovery.

If a newly created zone is waiting for registrar delegation, resume after it becomes active:

```sh
void platform install --resume --name <installation-id>
```

See [Self-host a Void platform](../../guide/self-hosted-platform.md) for prerequisites, token scope, exact footprint, domain behavior, and an end-to-end walkthrough.

## `void platform domain set` {#void-platform-domain-set}

```sh
void platform domain set <domain> [--installation <id>] [--zone <domain>] [--dedicated-zone] [--plan] [--yes]
```

Add an application domain to a workers.dev test platform. Domain-based installations remain the recommended default. The command detects the zone when possible, creates missing DNS and routes after confirmation, and checks HTTPS and project Zero Trust protection before making the domain canonical. If DNS, certificates, or protection are pending, rerun the same command to resume. `--plan` is read-only; non-interactive mutations require `--yes`.

Existing workers.dev URLs remain available, and the platform API origin, OAuth callback, projects, and deployments stay unchanged. The command verifies the running runtime token's Cache Purge permission for the new zone. A disabled platform stays disabled. Use the database URL from the original installation when administering from another machine. Replacing an already configured application domain is not supported. See [Adding a Domain](../../guide/platform/installation/domains.md#adding-a-domain).

## Lifecycle commands {#lifecycle-commands}

Use these commands to recover, update, pause, or remove an installation:

```sh
void platform discover [--account <id>] [--installation <id-or-name>]
void platform upgrade [id] [--runtime <path>] [--dashboard-url <origin>] [--plan] [--yes]
void platform rollback [id] --runtime <earlier-path> [--from-runtime <current-path>] [--plan] [--yes]
void platform repair [id] [--runtime <path>] [--dashboard-url <origin>] [--plan] [--yes]
void platform disable [id] [--plan] [--yes]
void platform enable [id] [--runtime <path>] [--plan] [--yes]
void platform uninstall [id] [--plan] [--purge-data] [--keep-zone] [--yes]
```

`discover --installation` limits recovery and endpoint verification to one installation in a shared Cloudflare account.

Omit `id` when only one installation is configured, or choose from the interactive picker. Non-interactive commands need an ID when several installations exist. Commands that make changes also require `--yes`; `--plan` only previews changes.

To add or explicitly change a separately deployed dashboard after installation,
use `repair --dashboard-url <origin>` or `upgrade --dashboard-url <origin>`.
Preview with `--plan` first. Existing Access protection must cover the configured
dashboard origin before maintenance can proceed. See [Optional Dashboard](../../guide/platform/installation/domains.md#optional-dashboard).

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

`--runtime` selects a custom platform build. Relative paths resolve from your current directory. Void verifies the build before making changes; see [Platform Development](../../guide/platform/development/runtime.md#deploying-your-runtime) for creating one.

Without `--runtime`, the CLI uses its packaged platform version.

Platform migrations only move forward. Void checks compatibility before updating the database and tells you if an intermediate release is needed.

An upgrade completes after the new Workers pass health checks. If rollout fails, Void attempts to restore the previous Workers. Retrying does not repeat completed migrations.

`platform rollback` restores a compatible earlier runtime without reversing database migrations. Pass its files with `--runtime`; if the installed version is custom, also supply that version with `--from-runtime`. Void refuses incompatible targets.

Uninstall verifies remote ownership before removing anything. Data resources are retained unless you pass `--purge-data`. Workers, the Queues they use, R2, AI Gateway, DNS records, routes, custom domains, adopted resources, external PostgreSQL, and zones are always retained for manual review.

See [Disable and Uninstall](../../guide/platform/installation/uninstall.md#remove-retained-resources) for the full removal policy and the cleanup order.
