---
outline: deep
---

# Deployment

`void deploy` builds your app, provisions its resources, applies migrations, and deploys it to your own Cloudflare account or a Void platform run by your team.

You can [install a Void platform](./self-hosted-platform.md) for shared team deployments.

## Deployment Targets

Both targets use the same application APIs. Their deployment features differ:

| Feature                                          | Direct Cloudflare                | Core self-hosted platform                     |
| ------------------------------------------------ | -------------------------------- | --------------------------------------------- |
| Static sites, SPAs, and native Pages SSR         | Supported                        | Supported                                     |
| Routing rules, WebSockets, queues, cron, and ISR | Supported                        | Supported                                     |
| D1, KV, R2, and external SQL through Hyperdrive  | Supported                        | Supported                                     |
| Workers AI and provider requests                 | Your account and gateway         | Installation gateway and proxy                |
| Runtime logs                                     | Live Cloudflare tail             | Retained platform logs                        |
| Application rollback                             | Worker versions                  | Retained platform deployments                 |
| Typed Durable State                              | Supported                        | Unavailable                                   |
| Sandboxes                                        | Requires Workers Paid and Docker | Requires Workers Paid on the platform account |
| Custom application domains                       | Supported                        | Unavailable in the core installation          |
| Generated GitHub deployment workflow             | Supported                        | Use your CI with a scoped developer token     |
| User dashboard and managed GitHub builds         | Not required                     | Not included in a standard installation       |

Native apps can run on Workers Free within its quotas. A team platform requires Workers for Platforms and the [documented infrastructure](./platform/installation/domains.md#cloudflare-footprint). Rollback does not reverse database migrations.

Native Void apps and static sites use Void routing rules. Framework deployments use their framework's routing and asset policies; direct deploy rejects unsupported Void rules.

Use matching CLI and framework adapter versions. For a team platform, the available features depend on its installed version and configuration. Ask your administrator if a feature is unavailable or an upgrade is required.

## CLI

### First deploy

```bash
void init   # choose Cloudflare (default), Void, or Skip deployment setup
void deploy # builds and deploys to the saved platform
```

During setup, Void asks where you want to deploy:

- **Cloudflare:** sign in through your browser and choose an account. Void saves the account in `void.config.ts` or `void.lock.json`.
- **Void:** connect to a platform, sign in, and link or create a project.
- **Skip:** set up deployment later with `void connect`.

Your choice is saved in `.void/project.json`, so the next deploy is just `void deploy`.

Already have a Cloudflare Worker and a root `wrangler.jsonc` or `wrangler.json`? Run `void deploy`. If no destination is selected, Void offers to link and deploy using the existing Worker and resources. Accept once to keep deploying to that site. See [Deploy an existing Worker](../integrations/cloudflare.md#deploy-an-existing-worker) for the first-deployment checks.

To set up deployment later, use `void connect --platform cloudflare` or `void connect <platform-url>`.

Owners can [share a platform project](./project-collaboration.md) with readers, collaborators, and project administrators. This does not apply to direct Cloudflare deployments.

### Migrations

Deploy applies pending SQL migrations from `db/migrations/`. If your schema has changes without a migration, deploy stops. Run `void db generate`, review and commit the SQL, then deploy again. See the [Database guide](./database.md).

### Flags

```bash
void deploy [--platform <cloudflare|void>] [--project <name>] [--dir <path>] [--spa]
```

| Flag                            | Purpose                                           |
| ------------------------------- | ------------------------------------------------- |
| `--platform <cloudflare\|void>` | Override the saved deployment platform            |
| `--project <name>`              | Target a specific Void project by slug            |
| `--dir <path>`                  | Deploy a pre-built static directory (skips build) |
| `--spa`                         | Use SPA mode instead of SSG for static deploys    |

### Project resolution

For a Void platform deploy, the CLI chooses the project in this order:

1. `--project <name>` flag
2. `VOID_PROJECT` environment variable
3. Linked project in `.void/project.json`

If none is set, Void asks you to choose a project. Direct Cloudflare deploys use the Worker and account saved in your Cloudflare config.

### CI preparation

If your CI pipeline runs typechecking or other static analysis before deploy, run `void prepare` after install to generate the `.void/` artifacts without booting Vite.

### Environment variables

| Variable       | Purpose                          |
| -------------- | -------------------------------- |
| `VOID_TOKEN`   | Auth token (for CI, skips OAuth) |
| `VOID_PROJECT` | Project slug override            |

## GitHub

You can deploy from a GitHub repo on every push to `main`. Running `void init --github` generates `.github/workflows/void-deploy.yml` for the platform saved in `.void/project.json`.

For Cloudflare, add `CLOUDFLARE_API_TOKEN` to your repository secrets. The token needs access to the account and products your app uses. PostgreSQL and MySQL apps also need a `DATABASE_URL` secret.

If your Worker has no version preview URL, set the `CLOUDFLARE_WORKERS_SUBDOMAIN` repository variable. If Cloudflare Access protects the Worker, also add `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` secrets so Void can check that a deployment is ready. See [Cloudflare deployment](../integrations/cloudflare.md#deploy-to-your-own-cloudflare-account) for the setup details.

Void platforms with GitHub Actions support use short-lived GitHub OIDC credentials. You don't need to store a `VOID_TOKEN` for that workflow.

### Void GitHub App

If your platform supports managed GitHub builds, the Void GitHub App can build and deploy your app when you push. This feature requires a platform with a configured GitHub App and build Containers; it isn't included in a core self-hosted installation.

You don't need a deployment workflow file or a repository `VOID_TOKEN` for this path.

With a linked project, connect the repository:

```sh
void github install
void github connect --executor container
void github status
```

If your organization already installed the App, Void can join that installation during setup. Organization repositories require browser authorization.

Push to the configured branch to deploy, then follow progress with `void build logs --follow`. See [GitHub commands](../reference/cli/github.md#github) for installation sharing and connection options.

### GitHub Actions

Run `void init --github` to generate the workflow for your saved platform and package manager. On Void platforms with GitHub Actions support, authorize the repository once:

```sh
void github connect <project> --repo <owner/repo> --executor github_actions
```

Set the repository's `VOID_API_URL` variable to your platform's API URL. Keep `permissions: id-token: write` in the workflow for [GitHub OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect). The workflow uses your linked project, or the `VOID_PROJECT` repository variable.

Core self-hosted installations do not support this integration. Use your own CI workflow with a [project deploy token](./platform/installation/first-deployment.md).

## Other Targets

### Your own Cloudflare account

Select Cloudflare during setup, or run `void deploy --platform cloudflare`. See the [Cloudflare guide](../integrations/cloudflare.md) for configuration, CI credentials, and deployment limits.

### Node.js, Bun, and Deno

Set [`target`](../reference/config.md#target) in `void.config.ts` to build a standalone server for Node.js, Bun, or Deno. You can run the result on your own server or in a container.

Deploy `dist/ssr` and `dist/client` together. See the target guide for startup commands.

These targets don't provide Cloudflare bindings such as D1, KV, R2, and Workers AI. See the [Node.js, Bun, and Deno guide](../integrations/nodejs-bun-deno.md) for the features available on each target.

## Usage and execution limit pages

Void platforms show a built-in page when an app exhausts its request allowance or an invocation exceeds its CPU limit. API requests and Pages action requests receive a structured HTTP 429 with `code: 'usage_limit'`, `resource`, `reason`, and `message`.

To customize browser error pages, add either optional file to your app's public assets:

- `public/usage-limit.html` for exhausted request allowances.
- `public/execution-limit.html` for execution limits.

Use standalone HTML with inline CSS and data-URL images. These pages run with scripts, external assets and form submissions disabled, so they remain usable while application requests are blocked. Void serves them directly from the deployed assets; your Worker, loaders and database are not involved. A missing or unreadable custom page uses the built-in page.

Responses are not cached. Once a streaming response has started, it cannot be replaced with an error page; clients should display stream failures and end their pending state. These platform pages apply to Void platform deployments. Direct Cloudflare runtime limits use Cloudflare's own response behavior.
