---
outline: deep
---

# Developing a Void Platform

The framework, CLI, and platform live in one repository. You can change the platform, test it locally, and deploy a runtime built from your fork into your own Cloudflare account.

If you want to run the released platform without changing its implementation, start with [Install a Void Platform](./self-hosted-platform.md). Use [Platform Administration](./platform-administration.md) for managing an installed platform.

## Setting Up the Repository

Clone your fork and install the workspace dependencies with Vite+:

```sh
git clone https://github.com/your-org/void.git
cd void
vp install
vpr install:void-dev
void-dev --help
```

Use the Node.js version recorded in `.node-version`. The workspace uses public npm packages; a GitHub Packages token is not required.

`install:void-dev` builds the CLI, shared packages, and platform runtime, then makes this checkout's built CLI globally available as `void-dev`. Public packages export their built files, so run `vp run build:core` after later source changes to refresh the alias. The installer refuses to replace an unrelated global command. Remove only this checkout's alias with `vpr uninstall:void-dev`. All commands in this guide run from the repository root.

## Finding the Implementation

| Directory                                            | Purpose                                                              |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| `packages/void`                                      | Framework, application runtime, and CLI                              |
| `packages/platform`                                  | Installer contracts, packaged Workers, and platform migrations       |
| `packages/deploy-core`, `packages/deploy-cloudflare` | Shared deployment contracts and Cloudflare upload code               |
| `platform/packages/api`                              | Users, projects, deployments, provisioning, and administrator API/UI |
| `platform/packages/dispatch`                         | Application routing and static assets                                |
| `platform/packages/proxy`                            | AI, remote bindings, and revalidation                                |
| `platform/packages/tail`                             | Runtime log ingestion                                                |
| `platform/packages/dashboard`                        | Dashboard source and local UI components in `ui/`                    |

The `@voidcloud/*` names identify workspace implementation packages. Their `private: true` flags prevent publishing those packages to npm. Deployable core Workers are bundled into the public `@void/platform` package.

The core installer creates the API, dispatch, proxy, and tail Workers. The dashboard and managed GitHub build services are available in the source tree but are not included in that installation. Adding an optional service requires its infrastructure, bindings, authentication, and capability configuration together.

## Running the API Locally

Start a local PostgreSQL server and make `psql` and `pg_isready` available on your path. Then create the development database, apply its migrations, and seed an administrator:

```sh
vp run --filter @voidcloud/api setup --admin-email dev@example.com
vp run --filter @voidcloud/api dev --local --enable-containers=false --host localhost --port 8787
```

The command disables the optional build containers, so basic API and admin work
does not require Docker. To develop managed builds, install Docker and run the
API with containers enabled.

Open `http://localhost:8787/admin/`. Setup writes local development values to the API and dashboard `.dev.vars` files, including the development authentication bypass and local database connection. Those files are ignored by Git. Production installations get separate credentials through the installer.

The API's development bypass lets you work on the browser admin UI without setting up OAuth. Operator CLI sessions still require administrator authentication; they do not use the browser bypass.

## Running the Dashboard Locally

The dashboard is a separate source app. After API setup, start it in another terminal:

```sh
vp run --filter @voidcloud/dashboard dev
```

Its local `.dev.vars` should point to the API you started:

```dotenv
API_URL=http://localhost:8787
SITE_DOMAIN=apps.example.com
```

Open the Vite URL and choose **Dev login (local API)**. That button appears for a localhost API and uses the local development sign-in endpoint.

You can also point the dashboard at an API that you operate. If Cloudflare Access protects that API, install `cloudflared` and opt into the dashboard's local token helper with matching origins:

```dotenv
API_URL=https://platform.example.com
CF_ACCESS_APP_URL=https://platform.example.com
SITE_DOMAIN=apps.example.com
```

The helper refreshes an Access session before the dev server starts. Human
dashboard requests require the user's Access session as well as their Void login;
a service token does not represent that user. Service-token pairs are for scoped
machine operations. This is dashboard development configuration; Access
credentials are separate from platform login credentials.

For a deployed dashboard, bind its `API` service to your platform API, configure
`DASHBOARD_URL` on both the dashboard and API, and include that exact dashboard origin in the
platform's Access protection application. The dashboard passes the browser's
company identity to the API using that service binding. Its login page shows
the platform's currently enabled methods, and **Account** supports adding an
additional login identity.

## Testing Changes

Run tests for the area you changed while developing:

```sh
vp test run platform/packages/api/test/integration/operator-auth.test.ts
vp run check
```

Before preparing a release, build the packages and run the complete checks:

```sh
vp run build:all
vp run check
vp lint
vp run lint:platform
vp fmt --check
vp test run
vp run build:docs
```

Platform integration tests use their local test database by default. To test against PostgreSQL, set `VOID_TEST_DATABASE_URL` to a disposable database: these tests clear tables between cases.

To exercise a deployed application, deploy a disposable copy of `playground/kitchen-sink` and pass its URL as `SMOKE_URL` to the smoke test described in `platform/scripts/kitchen-sink-smoke-test.md`. That test creates and removes application data.

## Deploying Your Runtime

Build the runtime. From a Git checkout, the build automatically records the current commit in the runtime manifest. An uncommitted checkout is recorded with a `-dirty` suffix:

```sh
vp run build:core
```

Build systems may set `VOID_PLATFORM_SOURCE_REVISION` when they need to override automatic detection with another immutable revision. A source archive without Git metadata builds normally but leaves the revision unrecorded.

The runtime is written to `packages/platform/dist/runtime`. Use the built CLI to preview a new installation from those files:

```sh
void-dev platform install \
  --name my-team \
  --application-domain example.app \
  --zone example.app \
  --runtime packages/platform/dist/runtime \
  --plan
```

Before applying the plan, complete the [first-install walkthrough](./self-hosted-platform.md). Run the command without `--plan` to install. For testing before your domain is ready, replace `--application-domain` and `--zone` with `--workers-dev`; PostgreSQL and the runtime/GitHub/R2 credentials are still needed. Use `void-dev` in place of `void` and keep `--runtime packages/platform/dist/runtime` on install and resume commands. For an interrupted installation, keep that runtime build available until it completes.

Later, run `void-dev platform domain set example.app`. Domain setup uses the existing installed runtime and needs no `--runtime`, rebuild, or app redeploy. It keeps the platform API URL and original workers.dev app URLs available.

For an existing installation, preview an upgrade using its connection ID:

```sh
void-dev platform upgrade <installation-id> \
  --runtime packages/platform/dist/runtime --plan
```

Then run it without `--plan` to apply the upgrade. Source-built runtimes go through the same artifact, database, ownership, and health checks as released runtimes. The CLI preserves a disabled installation's state and records the source revision in its installation checkpoint.

## Optional GitHub Webhook Ingress for Access-Protected APIs

The core installer does not deploy the dashboard, GitHub App, build Containers,
or webhook ingress. If a source-built installation adds those optional services
and Cloudflare Access protects its API hostname, GitHub cannot deliver directly
to `/webhooks/github`: GitHub does not present your Access credentials. Do not add
an Everyone or bypass policy to the API application.

The API source package includes an optional, path-isolated Worker for this case.
It accepts only `POST /github`, validates GitHub's signature over the raw body,
and forwards one authenticated internal operation over an API service binding.
The API independently verifies both that internal proof and GitHub's signature
before running the normal webhook handler. Installations without perimeter
protection can continue using the API's direct `/webhooks/github` endpoint.

To deploy the optional ingress:

1. Deploy the source API/build runtime containing the internal operation and its
   build bindings, then finish the separate GitHub App/build-service
   configuration. A core install or upgrade alone does not add managed builds.
   Enable the platform's managed-build capability only when that infrastructure
   is ready.
2. Edit `platform/packages/api/wrangler.github-webhook-ingress.jsonc`. Give the
   ingress a name unique to the installation and set its `API` service binding to
   the exact installed API Worker name. Keep its public hostname separate from
   every human/API hostname covered by Access.
3. Deploy it from the repository root:

   ```sh
   vp run --filter @voidcloud/api deploy:github-webhook-ingress --env production
   ```

   Use `--env staging` for the staging entries in the same config.

4. In the Cloudflare dashboard, add encrypted Worker secrets. Set the GitHub
   App's existing `GITHUB_WEBHOOK_SECRET` on both the API and ingress Workers.
   Generate a separate high-entropy value, such as `openssl rand -base64 32`,
   and set it as `GITHUB_WEBHOOK_INGRESS_SECRET` on both Workers. Do not reuse a
   platform management, JWT, Access, or GitHub webhook credential for that value.
5. In the GitHub App settings, keep **Content type** set to `application/json`,
   keep the same webhook secret, and change **Webhook URL** to the isolated
   ingress URL ending in `/github`. Use GitHub's test delivery and confirm a 2xx
   response before relying on push builds.

The ingress has no login, dashboard, project, operator, proxy, or arbitrary
forwarding route. It does not make the GitHub integration part of the core
installer, provision build executors, create a GitHub App, configure Cloudflare
Access, or manage either Worker's secrets. Its body limit is 25 MiB, based on
GitHub's [documented 25 MB webhook payload cap](https://docs.github.com/en/webhooks/webhook-events-and-payloads#payload-cap);
malformed or larger deliveries are rejected before event processing.

## Deploying Source Builds from CI {#source-build-ci}

Build `@void/platform` from your checkout and pass its runtime directory to `install`, `upgrade`, `repair`, `enable`, or `rollback` with `--runtime`. Custom runtimes get the same integrity, migration, health, and rollback checks as packaged releases.

Void records the runtime's manifest digest, whether it was packaged or custom, and its source revision. A build from a Git checkout automatically records `HEAD`, or `<HEAD>-dirty` when the checkout has uncommitted files. Build systems can set `VOID_PLATFORM_SOURCE_REVISION` to override automatic detection.

A fresh CI runner can discover the installation each time. Set `CLOUDFLARE_API_TOKEN` and `VOID_PLATFORM_DATABASE_URL` through its protected environment, then:

::: details CI commands and recovery inputs

```sh
vp run build:core

export VOID_PLATFORM_REGISTRY_DIR="$RUNNER_TEMP/void-platform-registry"
export VOID_PLATFORM_RECOVERY_KEY="$(openssl rand -base64 32)"
node packages/void/dist/cli/cli.mjs platform discover --account "$CLOUDFLARE_ACCOUNT_ID" \
  --installation "$VOID_PLATFORM_INSTALLATION"
node packages/void/dist/cli/cli.mjs platform upgrade "$VOID_PLATFORM_INSTALLATION" \
  --runtime packages/platform/dist/runtime --plan
node packages/void/dist/cli/cli.mjs platform upgrade "$VOID_PLATFORM_INSTALLATION" \
  --runtime packages/platform/dist/runtime --yes
```

Omit the installation selector only if the account has one discoverable installation. Run one deployment per installation at a time, and let it finish before starting the next. Cancelling during migrations or Worker rollout can leave an installation waiting for recovery.

Keep the management token, database URL, JWT signing secret, email signing secret for email-enabled installations, and complete project-encryption keyring in a protected CI environment. Upgrades inherit deployed Worker secrets. The original values are needed when recreating a missing Worker; configuration credentials are also needed when explicitly rotating them.

:::

## Changing the Platform Schema

The schema lives in `platform/packages/api/src/schema.ts`. Generate a migration after changing it:

```sh
vp run --filter @voidcloud/api db:generate
```

Review the generated SQL and migration journal before committing them. Released migrations are append-only. An upgrade applies new migrations while the previous Workers may still serve requests, so schema changes must remain compatible with that code.

`platform/packages/api/drizzle/compatibility.json` records which earlier runtimes have been verified against the new schema. Add an edge only after testing that compatibility. The runtime build checks that the migration files and recorded schema history agree. See `packages/platform/README.md` for the manifest contract.

## CI in a Fork

The uncredentialed test workflows use GitHub-hosted runners in forks. They build and test the workspace without requiring Void Cloud accounts, tokens, or deployment access.

If your fork has a released platform version, set the repository variable
`VOID_PLATFORM_PRODUCTION_REF` to its immutable 40-character commit SHA. Platform
pull requests then create that version's database, seed representative user,
project, and encrypted-secret records, and apply the proposed migrations. The
check verifies existing data and runs the previous runtime against the upgraded
schema. Mutable branch or tag names are rejected.

Without an explicit SHA, required compatibility checks use the latest successful
GitHub deployment to `Prod` (or `VOID_PLATFORM_PRODUCTION_ENV`). They require
read access to deployment history and stop if no completed deployment is found.
Advancing the production branch does not change the selected baseline. Fork
workflows that call platform CI must grant `deployments: read` alongside
`contents: read`.

The upstream repository also contains workflows for deploying Void Cloud and publishing the official npm packages. Forks should configure their own release workflow around the built CLI and `platform upgrade --runtime`; the [source-build CI example](#source-build-ci) shows the required inputs. Keep production credentials in protected environments restricted to the appropriate release refs.

Public releases use matching versions for the CLI, scaffolder, adapters, and
packaged platform. The publish workflow rejects mismatched versions and previously
unpublished `void` versions that npm cannot reuse. Stable versions use `latest`;
prereleases use their named channel, such as `beta` or `rc`. Numeric prereleases
use `next`. The scaffolder installs its exact matching CLI version, so
`create-void@beta` cannot silently select the stable CLI. Packaged platform
runtimes record the release commit as their source revision.

The npm release job uses [trusted publishing](https://docs.npmjs.com/trusted-publishers/)
from GitHub-hosted runners, with `id-token: write` and no stored npm publishing
token. Configure a trusted publisher for each public package using this
repository, `publish.yml`, and the `Release` environment, allowing direct
`npm publish`. A brand-new package
needs an initial authenticated publication before its trusted publisher can be
configured; subsequent releases use OIDC.

The managed build fallback CLI also derives its version from
`packages/void/package.json`; there are no separate version pins to update.
Build its image from the repository root with
`docker build --file platform/packages/api/container/Dockerfile .`.
The root `.dockerignore` limits that build context to the agent, Dockerfile,
and public SDK manifest.

Publishing requires both SDK CI and platform CI, including the platform unit and
API integration suites. Release tags also run the Windows SDK checks; a passing
SDK-only build cannot publish a changed control plane.

### Retrying a Release

To retry a failed release without moving an existing tag, add `+retry.N` to a
new Git tag, with `N` starting at `1`. Keep the package versions unchanged:

| Git tag                  | Package version | npm channel |
| ------------------------ | --------------- | ----------- |
| `v0.21.0`                | `0.21.0`        | `latest`    |
| `v0.21.0+retry.1`        | `0.21.0`        | `latest`    |
| `v0.21.0-beta.1+retry.2` | `0.21.0-beta.1` | `beta`      |

For example, when the packages are at `0.21.0`, commit the release fix and tag
that commit:

```sh
git tag -a 'v0.21.0+retry.1' -m 'Retry 0.21.0 publication.'
git push origin 'refs/tags/v0.21.0+retry.1'
```

The retry suffix belongs only in the Git tag, not in `package.json`. A `-1`
suffix is a distinct prerelease version, not a retry. Tag and package versions
are checked before dependency installation and the full CI jobs; retries still
run the normal release checks.

Retries publish only package versions that are still missing from npm. They
cannot replace an already-published version. If an earlier attempt partially
published the release and you changed its package contents, bump the version
instead of combining different contents under the same version.

For implementation history, use the design archive at `platform/meta/design-docs/README.md`. Its proposals explain earlier decisions; the source and current guides define the supported behavior.
