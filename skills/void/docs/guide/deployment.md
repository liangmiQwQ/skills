---
outline: deep
---

# Deployment

Use `void deploy` to deploy your app to your own Cloudflare account or a Void platform run by your team. The CLI builds your app, creates the resources it needs, and applies your database migrations.

Choose Cloudflare if you're deploying an app yourself. Choose Void if your team has a shared platform you can connect to. You can also [install a Void platform](./self-hosted-platform.md) in your company's Cloudflare account.

## Beta Support

Direct Cloudflare deployment runs an application in your account. A self-hosted
Void platform provides that deployment service to a team using the operator's
account. Both use the same application APIs, with the following differences:

| Feature                                          | Direct Cloudflare                | Core self-hosted platform                 |
| ------------------------------------------------ | -------------------------------- | ----------------------------------------- |
| Static sites, SPAs, and native Pages SSR         | Supported                        | Supported                                 |
| Routing rules, WebSockets, queues, cron, and ISR | Supported                        | Supported                                 |
| D1, KV, R2, and external SQL through Hyperdrive  | Supported                        | Supported                                 |
| Workers AI and provider requests                 | Your account and gateway         | Installation gateway and proxy            |
| Runtime logs                                     | Live Cloudflare tail             | Retained platform logs                    |
| Application rollback                             | Worker versions                  | Retained platform deployments             |
| Typed Durable State                              | Supported                        | Unavailable                               |
| Sandboxes                                        | Requires Workers Paid and Docker | Unavailable in beta                       |
| Custom application domains                       | Supported                        | Unavailable in the core installation      |
| Generated GitHub deployment workflow             | Supported                        | Use your CI with a scoped developer token |
| User dashboard and managed GitHub builds         | Not required                     | Not included in a standard installation   |

Ordinary native applications remain compatible with Workers Free within its
quotas. Installing a team platform requires Workers for Platforms and the
[documented infrastructure](./self-hosted-platform.md#cloudflare-footprint).
Application rollback never reverses database migrations.

Routing-rule parity applies to native Void applications and static deployments.
Framework-owned Worker output uses its framework's routing and asset policy;
unsupported Void routing rules are rejected before direct deployment.

Use matching CLI and framework adapter versions. For a team platform, the available features depend on its installed version and configuration. Ask your administrator if a feature is unavailable or an upgrade is required.

## CLI

### First deploy

```bash
void init   # choose Cloudflare (default), Void, or Skip deployment setup
void deploy # builds and deploys to the saved platform
```

During setup, Void asks where you want to deploy:

- **Cloudflare:** sign in through your browser and choose an account. Void saves the account in `wrangler.jsonc`.
- **Void:** connect to a platform, sign in, and link or create a project.
- **Skip:** set up deployment later with `void connect`.

Your choice is saved in `.void/project.json`, so the next deploy is just `void deploy`.

Already have a Cloudflare Worker and a root `wrangler.jsonc` or `wrangler.json`? Run `void deploy`. If no destination is selected, Void offers to link and deploy using the existing Worker and resources. Accept once to keep deploying to that site. See [Deploy an existing Worker](../integrations/cloudflare.md#deploy-an-existing-worker) for the first-deployment checks.

To connect to your team's platform and sign in, run `void connect <url>` using the URL from your administrator. Use `void connect --platform cloudflare` to set up your own Cloudflare account. Connecting preserves existing project links. New Void projects need a platform connection.

### Migrations

If your app uses Drizzle, `void deploy` runs migrations as part of the deploy flow:

1. Build the app
2. Read SQL migrations from `db/migrations/`
3. Check that the migrations match your current schema
4. Apply pending migrations to the target database
5. Make the new deploy live

If you've changed your schema without a matching migration, deploy stops. Run `void db generate`, review and commit the SQL, then deploy again. For the full database workflow and backend-specific details, see the [Database guide](./database.md).

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

1. Initialize your Void project

```bash
void init
# Or, for existing Void project:
void project link
```

2. Install the Void GitHub app

```bash
void github install
```

Void opens GitHub so you can install and authorize the `Void Deploy` app.

In the browser, select the GitHub account/organization and grant access to the repository.

:::details If someone already installed the App for your organization
Join that installation instead:

```bash
void github join
```

:::

3. Link your repository to your project

```bash
void github connect --executor container
```

Organization installations always require a browser proof for the specific repository, including for the person who installed the App. Void does not reveal the installation's full private repository list. If an upgraded platform marks an older organization connection as requiring reconnection, run the same `void github connect` command again to renew that repository-scoped authorization before builds resume.

4. Verify the connection

```bash
void github status
```

The output shows the repository, branch, and build executor:

```bash
Repository      <owner/repository>
Branch          main
Build executor  container
Deploy workflow .github/workflows/void-deploy.yml (unused for container builds)

```

5. Push to the configured branch to trigger a new deploy

```bash
git push origin main
```

6. Follow the build

```bash
void build logs --follow
```

### GitHub Actions

On platforms that support it, the generated workflow uses [GitHub OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect) to obtain a short-lived deploy token for your project. `void deploy` handles the exchange automatically. Keep `permissions: id-token: write` in the workflow so GitHub can issue that credential.

The generated workflow uses the platform selected during `void init`. Core self-hosted installations don't yet support this integration, so Void doesn't offer the workflow for them. For a platform that does, the npm version looks like this; set the repository's `VOID_API_URL` variable to your platform's API URL:

```yaml
name: Deploy to Void
on:
  push:
    branches: [main]

# Latest push wins: a newer commit cancels an in-flight deploy for the same
# repo + branch, so an older commit can never overtake a newer one.
concurrency:
  group: void-deploy-${{ github.repository }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  id-token: write
  contents: read

env:
  VOID_API_URL: ${{ vars.VOID_API_URL }}
  VOID_PROJECT: my-app

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - name: Deploy
        run: npx void deploy --platform void --project "$VOID_PROJECT"
```

Authorize the repository once with `void github connect <project> --repo <owner/repo> --executor github_actions`. Choose the `github_actions` executor for this workflow; `container` runs builds on the platform instead.

The generated workflow uses your package manager and linked project. If no project is linked, it reads the `VOID_PROJECT` repository variable.

## Other Targets

### Your own Cloudflare account

Select Cloudflare during setup, or run:

```sh
void deploy --platform cloudflare
```

Void supports full Worker apps, static sites, SPAs, and Cloudflare builds from supported frameworks. It provisions resources, applies migrations, and manages secrets for you. `.env` stays local; production server keys declared in `env.ts` must exist in encrypted remote secret storage and are rejected as plaintext Worker vars. Commands such as `void secret put`, `void project logs`, and `void project rollback` then use the same account and Worker.

See the [Cloudflare guide](../integrations/cloudflare.md#deploy-to-your-own-cloudflare-account) for supported features, CI setup, and deployment limits.

### Node.js, Bun, and Deno

Set [`target`](../reference/config.md#target) in `void.json` to build a standalone server for Node.js, Bun, or Deno. You can run the result on your own server or in a container.

Deploy `dist/ssr` and `dist/client` together. The server loads the Pages client manifest and assets relative to its emitted module; start it from the app root with `node dist/ssr/index.js`, `bun dist/ssr/index.js`, or `deno run -A dist/ssr/index.js`.

These targets don't provide Cloudflare bindings such as D1, KV, R2, and Workers AI. See the [Node.js, Bun, and Deno guide](../integrations/nodejs-bun-deno.md) for the features available on each target.
