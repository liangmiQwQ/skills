---
outline: deep
---

# Cloudflare

Void runs on Cloudflare Workers. This page covers how bindings work, how the plugin merges Cloudflare configuration, and how to deploy directly to your own Cloudflare account.

## Bindings

Void automatically infers and provisions Cloudflare bindings (D1, KV, R2, AI, Queues) by scanning your source files. There are two ways to access them at runtime depending on your setup.

### Via Hono context (`c.env`)

In Void's default routing mode, route handlers and middleware receive a Hono `Context` object with bindings on `c.env`:

```ts
// routes/api/users.ts
import { defineHandler } from 'void';

export const GET = defineHandler(async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM users').all();
  return c.json(results);
});
```

```ts
// routes/api/cache.ts
import { defineHandler } from 'void';

export const GET = defineHandler(async (c) => {
  const value = await c.env.KV.get('key');
  return c.json({ value });
});
```

`CloudContext` provides the types for `c.env`, so you don't need to declare them yourself.

### Via `cloudflare:workers` import

When using framework mode (TanStack Start or React Router), the framework owns routing and you access bindings through the `cloudflare:workers` module instead:

::: warning ⚠️ Cloudflare env access in meta frameworks
Some frameworks, like Nuxt and SvelteKit, do not run in workerd during dev and therefore do not support directly importing from `cloudflare:workers`.
:::

```ts
import { env } from 'cloudflare:workers';

const result = await env.DB.prepare('SELECT * FROM users').all();
```

This also works in server functions:

```tsx
// src/routes/users.tsx (TanStack Start)
import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';

const getUsers = createServerFn().handler(async () => {
  const { results } = await env.DB.prepare('SELECT * FROM users').all();
  return results;
});

export const Route = createFileRoute('/users')({
  loader: () => getUsers(),
  component: UsersPage,
});
```

### TypeScript setup

Add `"void/env"` to your tsconfig `types` to get typed bindings on `env`:

```json
{
  "compilerOptions": {
    "types": ["void/env"]
  }
}
```

This augments the `Cloudflare.Env` interface with `DB`, `KV`, `STORAGE`, `AI`, and `QUEUE_*` and also pulls in `@cloudflare/workers-types`, so you don't need to add that separately.

### Available bindings

| Binding          | Type                     | Trigger                                                         |
| ---------------- | ------------------------ | --------------------------------------------------------------- |
| `DB`             | `D1Database`             | `env.DB` / `c.env.DB` or `import from "void/db"`                |
| `KV`             | `KVNamespace`            | `env.KV` / `c.env.KV` or `import from "void/kv"`                |
| `STORAGE`        | `R2Bucket`               | `env.STORAGE` / `c.env.STORAGE` or `import from "void/storage"` |
| `AI`             | `Ai`                     | `env.AI` / `c.env.AI` or `import from "void/ai"`                |
| `QUEUE_*`        | `Queue<T>`               | `defineQueue()` or `import { queues } from "void/queues"`       |
| filename-derived | `DurableObjectNamespace` | module in `durable-objects/`                                    |

Bindings are [inferred automatically](../reference/resource-inference.md) by scanning your source files for import and access patterns. You can also set them explicitly in `void.json`:

```json
{
  "inference": {
    "bindings": { "db": true, "kv": true, "storage": false, "ai": "MY_AI" }
  }
}
```

`db`, `kv`, `storage`, and `ai` accept a string to customize the binding name (for example, `"db": "MY_DB"` or `"ai": "MY_AI"`). `email` is a boolean feature switch.

See [Configuration](../reference/config.md) for details.

### Cloudflare configuration passthrough

You can set non-binding Cloudflare fields like `compatibility_date` and `compatibility_flags` in `void.json`:

```json
{
  "worker": {
    "compatibility_date": "2026-02-24",
    "compatibility_flags": ["nodejs_compat"]
  }
}
```

For environment variables, declare the schema in `env.ts` and put local values in the single root `.env` file. Void loads `.env` into local development bindings only; it never becomes production configuration:

```bash
# .env
API_URL=https://api.example.com
```

Binding arrays such as `d1_databases`, `kv_namespaces`, and `r2_buckets` are not allowed in the `worker` field because Void manages bindings for you. If you need custom bindings with real resource IDs, add a `wrangler.jsonc` to the project root instead. See [Cloudflare config merging](#cloudflare-config-merging) for details.

For non-secret plain-text defaults, you can also set `worker.vars` in `void.json`. Local `.env` values override `worker.vars` during development. Production builds reject any `worker.vars` name that is declared as a server key in `env.ts`; store those values remotely with `void secret put` instead.

## Cloudflare config merging

By default, Void configures the Cloudflare plugin programmatically, so you don't need a `wrangler.jsonc` for bindings. Void pins a Workers compatibility date in `void.json` `worker.compatibility_date`; if no date is already configured in `void.json` or `wrangler.jsonc`/`wrangler.json`, Void writes the latest known-good date to `void.json`. Bindings are inferred from your source code and provisioned with local placeholder IDs for development.

If you add a `wrangler.jsonc` (or `wrangler.json`) to your project root, Void respects it -- but **how** depends on whether Void owns the Cloudflare integration or a meta-framework does.

### Void-only mode and Vite-based frameworks

In Void's default mode and when using frameworks where Void controls the Cloudflare integration (TanStack Start, React Router), Void manages the `@cloudflare/vite-plugin` directly. It passes a `config` callback that merges inferred bindings into whatever the plugin resolves from your `wrangler.jsonc`:

1. The plugin reads your `wrangler.jsonc` and resolves it into a config object with `d1_databases`, `kv_namespaces`, `r2_buckets`, etc.
2. Void checks each inferred binding **by name** (e.g. `"DB"`, `"KV"`, `"STORAGE"`). If a binding with that name already exists in your config, it is left untouched.
3. Only bindings that are **missing** from your config are added with local placeholder IDs (e.g. `database_id: "local"`).
4. The merged config is used for both `vite dev` (Miniflare) and `vite build` (output `wrangler.json` in `dist/`).

All other fields in your `wrangler.jsonc` -- `name`, `routes`, `services`, `vars`, `env`, `compatibility_date`, etc. -- are preserved in the resolved config and flow through to the build output.

Fields that Void always sets (`main`, `triggers`, `assets`) don't need to be in your Cloudflare config -- they're added programmatically based on your project structure.

In this mode, normal inferred bindings are merged purely in memory. Typed state modules in `durable-objects/` are the exception: Void persists their bindings and `new_sqlite_classes` entries to `wrangler.jsonc` because Cloudflare Durable Object migration history must remain append-only across builds. Commit those entries.

### Adapter-based frameworks (SvelteKit, Nuxt, Astro)

When using SvelteKit, Nuxt, or Astro, the framework's own Cloudflare adapter owns the worker build and dev server. Void does **not** provide `@cloudflare/vite-plugin` in that setup. It only contributes DB type codegen, migration management, and binding sync.

Because Void doesn't control the CF plugin in this mode, it can't merge bindings via a config callback. Instead, on dev startup Void syncs inferred bindings directly to your `wrangler.jsonc` file on disk:

- Only adds bindings that are **missing** by name -- existing bindings are never modified or removed.
- If `worker.compatibility_date` is set in `void.json`, syncs that date into the Cloudflare config so the framework adapter reads the same value.
- Also ensures the `nodejs_als` compatibility flag is present.
- The framework adapter then reads this `wrangler.jsonc` normally.

The framework adapter reads bindings from `wrangler.jsonc`. Void adds them as you import resources, and `void deploy --platform cloudflare` replaces local placeholder IDs when it provisions production resources.

### Merge precedence

| Source                     | Priority             | What it controls                                                    |
| -------------------------- | -------------------- | ------------------------------------------------------------------- |
| Your `wrangler.jsonc`      | Highest for bindings | Real resource IDs, service bindings, routes, vars, environments     |
| `void.json` `worker` field | Highest for compat   | `compatibility_date`, `compatibility_flags`, `vars`                 |
| Void inference             | Fills gaps only      | Adds placeholder bindings for inferred resources not in your config |

If no date is found in `void.json`, the project Cloudflare config, or the supported generated build fallback during deploy, Void pins the latest known-good date to `void.json` and uses it for that run.

### Example

If your code uses `c.env.DB` and `c.env.KV`, and your `wrangler.jsonc` only defines D1:

```jsonc
{
  "name": "my-app",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "my-app-db",
      "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    },
  ],
  // Service bindings, routes, etc. are also preserved
  "services": [{ "binding": "API", "service": "my-api-worker" }],
}
```

Void sees that `DB` is already configured and leaves it alone (including your real `database_id`), but adds a local placeholder for `KV` since it's missing. The `services` array passes through unchanged.

This means `pnpm dev` works out of the box (Miniflare creates local instances of all bindings), while `void deploy --platform cloudflare` uses your real D1 database ID and service bindings.

### What ends up in the build output

After `vite build`, the Cloudflare Vite plugin writes a merged `wrangler.json` to the `dist/` directory. This file contains:

- All fields from your `wrangler.jsonc` (bindings with real IDs, routes, services, vars, environments)
- Any inferred bindings Void added (local placeholders during development; provisioned IDs during deploy)
- Fields set by Void (`main`, `assets`, `triggers`)

When you run `void deploy --platform cloudflare`, Void validates this generated `wrangler.json` and deploys it safely.

::: tip
When deploying to a Void platform, the `wrangler.json` in the build output is **skipped** because the platform manages Worker configuration through its own deploy manifest. The merge behavior described here applies to direct Cloudflare deployment.
:::

## Deploy to your own Cloudflare account

Choose Cloudflare during `void init`, then deploy:

```sh
void deploy
```

Void opens your browser to sign in when needed. If you have access to several accounts, it asks which one to use and saves the account in your root `wrangler.jsonc`. Credentials are stored in your operating system's keychain. Press Ctrl+C to cancel login, or manage your session with `void cloudflare login`, `status`, and `logout`.

To configure deployment separately from project setup, run `void connect --platform cloudflare`. It uses the same browser login and account selection as `void init`, and saves Cloudflare as the target for subsequent `void deploy` commands.

### One command: `void deploy --platform cloudflare`

You can also choose Cloudflare for a single deploy:

```sh
void deploy --platform cloudflare
```

This deploys directly to your account. You don't need a Void platform connection or project. Once Cloudflare is saved in `.void/project.json`, `void deploy` uses it automatically.

### Deploy an existing Worker

This handoff is for the existing source of an app already built with Void and previously deployed directly to Cloudflare. Keep its `wrangler.jsonc` or `wrangler.json`, then run:

```sh
void deploy
```

If the project has no deployment destination, Void asks whether to link and deploy to Cloudflare using the existing Worker and resources. Accept to sign in, verify the configured Worker, and deploy in the same command. Your account and Worker name stay the same. The next deployment is just `void deploy`.

The first handoff preserves resource bindings, production variables, encrypted secrets, event handlers, and existing routes and schedules. It builds the app, checks the uploaded version's bindings and handler set, and verifies readiness before activating it. Void saves `keep_vars: true` in your config so later deployments retain dashboard-only variables too. The active version must also be the latest uploaded version; activate or remove an unpublished candidate in Cloudflare before retrying so secret inheritance has an unambiguous source.

Keep this first deployment focused on the existing site. Apart from the explicit ISR cache choice below, new resources, auth setup, runtime features, database migrations, and secret overrides stop the handoff before activation. A later code-only deploy continues to preserve dashboard-managed routes and visibility. Before adding a cron, queue consumer, workflow, or visibility change when those values exist only in the dashboard, add the current `routes`, `workers_dev`, and `preview_urls` values to the root Wrangler config. If the build fails, fix it and rerun `void deploy`; Void remembers the destination and checks the existing Worker again.

Pages with `prerender = true` (including automatically prerendered Markdown pages) also request ISR caching. When the existing Worker has no cache, Void asks whether to enable it and saves the choice as `routing.isr` in `void.json`:

- **Yes:** provisions the KV cache and enables ISR in this deployment. The uploaded Worker must retain every existing binding and use exactly the approved cache namespace.
- **No:** saves `routing.isr: false`. Pages render on each request, and later deployments keep ISR disabled until you change that setting.

You can keep your page-level prerender and revalidate exports with either choice. The same saved choice applies to retries, other machines, and CI; completing the handoff does not change it. To choose ahead of time, set `routing.isr` to `true` or `false`. A non-interactive handoff with no saved choice stops with instructions to set it. Existing caches keep their namespace IDs. Commit `void.json` and any updated resource IDs in the root Cloudflare config.

If linking reports other missing inferred resources, the error lists each binding and why the app needs it. Check that the root config uses the existing Worker's binding names and resource IDs, and that `inference.bindings` in `void.json` matches those names. An application KV binding explicitly named `ISR_CACHE` is still required. An existing D1 binding without checked-in migrations can keep its current `migrations_dir`, including an omitted value; linking does not provision a database or change its migration settings. Keep `.void/cloudflare-link.json` when retrying so the handoff checks remain in place.

Declining the initial link-and-deploy prompt leaves the project unchanged. Explicit platform choices and existing project links take precedence. In CI, select the destination with `--platform cloudflare` and provide Cloudflare credentials.

Direct deployment uses the top-level JSON/JSONC configuration; convert a `wrangler.toml` with the same settings before linking. Named environments need a separate top-level config. If previews are disabled, include the existing production hostname in your config so Void can check the candidate through it.

### What happens during deploy

Void reads your app's configuration and source, then:

1. Checks the app type, selected account, and Cloudflare credentials.
2. If the app uses email (`sendEmail()` or `email/` handlers), reads your zone's email state and, before any project code runs, asks once to set it up. See [Your own Cloudflare account](../guide/email.md#your-own-cloudflare-account) in the email guide.
3. Creates missing resources or reuses resources already in your account.
4. Builds the app and checks the generated Worker config, secrets, and migration history.
5. Preserves or creates the auth secret, verifies required server keys in encrypted remote storage, and applies pending migrations.
6. Uploads a Worker Version and checks that it is ready.
7. Sends traffic to the new version and applies routes, custom domains, cron schedules, queue consumers, and Email Routing rules.

The secret and migration checks need the built Worker, so they happen after provisioning and building. If a check fails, resources may already exist, but Void has not applied remote D1 migrations or uploaded the application Worker.

Resource IDs are saved in `wrangler.jsonc` for the next deploy. Void preserves comments, though it may adjust indentation when writing the file. Commit the updated config so other machines and CI can reuse the same resources. The old `--provision` flag is still accepted, but provisioning is now automatic.

Run the first deploy from one machine at a time. The provisioning lock protects a local config file; it cannot coordinate two fresh CI runners, which could create duplicate resources.

### Deploying from CI

Set `CLOUDFLARE_API_TOKEN` in your CI secrets. The token needs Workers Scripts: Edit and read access to bound resources, plus edit permission for each product Void needs to provision. Set `CLOUDFLARE_ACCOUNT_ID` if the token can access more than one account.

Email setup needs a browser session from `void cloudflare login`, which carries the Email Routing and Email Sending scopes, or a `CLOUDFLARE_API_TOKEN` that also has Email Routing Edit and Email Sending Edit. A Global API Key pair is refused. In CI the email step never prompts: run `void email setup --platform cloudflare` once locally, commit `wrangler.jsonc`, then deploy with `--require-email`.

When a Worker has no version preview URL, such as a Worker with Durable Objects, also set `CLOUDFLARE_WORKERS_SUBDOMAIN`. Use the account subdomain, for example `my-team` or `my-team.workers.dev`. Local deploys cache this value in ignored `.void/cloudflare.json` after Cloudflare reports a deployment URL; a fresh CI checkout has no such cache.

#### Cloudflare Access

If Cloudflare Access protects the Worker's `workers.dev` hostname, Void needs credentials to check deployment readiness. In CI, provide an allowed `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` pair. For a local deploy, you can use a short-lived user session:

```sh
export CF_ACCESS_TOKEN="$(cloudflared access token --app=https://<worker>.<account>.workers.dev)"
```

Void sends these credentials only to a matching HTTPS readiness URL. It doesn't save them or pass them to your build or deployment tools.

If Access blocks a version preview but allows the stable Worker hostname, Void checks the new version through that hostname using a version override. If Access still denies the request, Void leaves the upload inactive or restores the previous deployment. A required first-deploy bootstrap is an exception: that Worker is already active behind Access when the check runs.

### Databases and secrets

PostgreSQL and MySQL apps need a production `DATABASE_URL` in the deploy process environment. Void uses it for Hyperdrive provisioning and migrations, and never writes it to generated config. PostgreSQL migrations are transactional; MySQL schema changes may partially apply before an error.

Creating a Hyperdrive config for the first time also requires `CLOUDFLARE_API_TOKEN` with Hyperdrive edit permission. Void needs the REST API to find existing configurations, and the current provisioning path can't use browser OAuth for that lookup. Alternatively, create the config in the Cloudflare dashboard and add its ID to the `hyperdrive` binding in `wrangler.jsonc`. An app with an existing Hyperdrive binding can deploy through browser login.

For auth-enabled apps, run `void db generate` and commit the migrations. Void includes the production Better Auth schema, including renamed tables and plugin tables, and checks it against your migration history during deploy. D1 also gets an in-memory schema check before remote migration. A mismatch stops deployment and asks you to regenerate the SQL.

Custom D1 layouts are supported through `migrations_dir`, `migrations_table`, and `migrations_pattern`. The files Cloudflare will apply must match the files Void validated, including their content and numeric order. Missing, extra, or reordered migrations stop deployment.

Root `.env` is local-only and is never emitted into Worker vars. Every non-client key declared in `env.ts` is a server value: store it with `void secret put <NAME>`. Void emits required server names through `secrets.required`, rejects plaintext Worker vars with those names, and preserves existing remote secrets.

For apps using auth, Void creates a random 32-byte `BETTER_AUTH_SECRET` only when the remote secret is missing. It reuses that value on later deploys. Both auth secrets and schema-marked secrets can be set up on a new Worker's draft before its first upload.

### Readiness and rollback

Void usually checks an uploaded version before sending it traffic. When Cloudflare provides a version preview URL, Void probes that URL. Otherwise, it stages the version at 0% traffic and checks it through `workers.dev` using Cloudflare's version-override header.

If readiness or trigger synchronization fails, Void restores the previous deployment. If you already have a gradual rollout splitting traffic across versions, finish or cancel it in Cloudflare before deploying through Void.

A new Worker may need one ordinary deployment before version uploads work. This can happen when creating the Worker, establishing its first Durable Object migration history, or enabling preview URLs. Void checks that the Worker did not exist before first-deploy secret setup, deploys it once, then checks the active Worker through `/__void/ready`. It keeps that earlier check even if attaching a secret creates a placeholder version. This bootstrap is never used for an existing application.

To inspect versions or roll back:

```sh
void project status
void project rollback [version]
```

Versions with a complete trigger snapshot can restore their schedules, queues, workflows, routes, and domains along with the code. For an older version deployed outside Void, or a handoff that preserved existing triggers, rollback keeps the current routes and schedules. You can return to the original Worker Version without redeploying its source.

Rollback does not reverse database migrations. Void asks for confirmation when the schema may be newer than the code or migration metadata is missing.

#### Scope and limitations

Void supports Worker apps, static sites, SPAs, known SSGs, `--dir` deploys, and fully prerenderable Pages apps with `output: "static"`. It also deploys Cloudflare output from TanStack Start, React Router, SvelteKit, Nuxt, Analog, and Astro. The vinext adapters remain experimental and are outside the beta support commitment.

Static sites use a small Worker in front of Workers Assets to handle redirects, rewrites, fallbacks, and headers. Hybrid and SSR apps keep their application Worker. A page that opts out of prerendering, a dynamic page without `getPrerenderPaths()`, or another runtime feature keeps the app on a Worker even with `output: "static"`.

Native Void applications apply `void.json` routing rules in their Worker.
Framework-owned Workers do not yet support those Void redirects, rewrites,
fallbacks, or headers on the direct target. The CLI rejects such configuration
before provisioning or building; configure the rules in the framework or its
Worker instead. This restriction does not change an explicit asset policy for
`routing.notFound`.

Worker apps support D1, KV, R2, Queues, typed state, PostgreSQL and MySQL through Hyperdrive, auth, WebSockets, AI, cron jobs, and ISR. The main limits are:

- **Sandbox needs Workers Paid and Docker.** Importing `void/sandbox` or enabling `sandbox` in `void.json` adds a Container application. Void checks access before provisioning or building. [Enable Workers Paid](https://dash.cloudflare.com/?to=/:account/workers/plans) and sign in again if needed. API tokens need Account / Containers: Edit and Account / Cloudchamber: Edit. See [Containers pricing](https://developers.cloudflare.com/containers/pricing/). Apps without Sandbox skip this check and remain compatible with Workers Free within its quotas.
- **Worker apps need a fresh build.** `--skip-build` works for existing static, SPA, and SSG output. Worker validation needs the current build's vars and auth schema.
- **Named Cloudflare environments aren't supported.** Direct commands use the top-level root config and reject `CLOUDFLARE_ENV`, `CLOUDFLARE_VITE_WRANGLER_CONFIG_PATH`, and project-local name overrides. Use a separate root config per deployment target.
- **Node.js, Bun, and Deno use a different deployment path.** See their [integration guide](./nodejs-bun-deno.md).
- **Email is set up on the first deploy, on a zone you own.** Put `email.from` in `void.json`; the deploy reads your account, prints a checklist of what it would change, and asks once. See [Your own Cloudflare account](../guide/email.md#your-own-cloudflare-account). Outside Void's reach: `email/_default.ts` and dynamic local parts (`email/[user].ts`) need a catch-all, which exists only on a zone apex, so on a mail subdomain they get no rule; a mail domain that already has non-Cloudflare MX records is refused, never routed over; `sendEmail()` to arbitrary recipients needs Workers Paid (Email Sending onboarding), otherwise verified destinations only; Void owns the top-level `addresses` array in `wrangler.jsonc`, so hand-written entries there skip the email step; and `void email usage`, `logs`, `allow`, and `destinations` are platform-only.

WebSocket routes and typed state use SQLite-backed Durable Objects. Commit the bindings and `new_sqlite_classes` migration history in `wrangler.jsonc`; don't delete or reorder deployed migration steps. Older hosted classes using `new_classes` keep their existing storage.

Bare `vite build && wrangler deploy` does not provision schema-declared secrets. Use `wrangler secret bulk` / `wrangler secret put` and list every inherited name under `secrets.required` yourself.

ISR uses the shared cache protocol. Entries are scoped to a deployment and hostname, and `routing.revalidateQueryAllowlist` adds bounded query variants. `revalidate()` purges matching entries and variants from KV and the local edge cache. See [ISR](#isr-self-host) below for cache behavior across regions.

### Managing the deployed app

With Cloudflare selected, `void secret`, `void domain`, `void project status|list|logs|rollback`, and remote `void db` commands use the saved Worker and account. Database commands operate on the selected D1 database. Logs are a live tail; Void doesn't provide hosted log history for direct deploys.

Custom domain changes update routes immediately without rewriting schedules, queues, or workflows. Removing the final custom domain requires `CLOUDFLARE_API_TOKEN` with Workers Scripts: Edit because that operation uses Cloudflare's domain-record API.

`void project delete` doesn't remove direct Cloudflare resources, which may be shared. Review their use and remove them explicitly in Cloudflare.

::: details How Void checks the build

Your build runs your config, Vite plugins, and dependencies with filesystem access. Void removes Cloudflare credentials from the build environment, checks the generated account, Worker name, and binding IDs against the pre-build configuration, and verifies that the bundled deployment tool hasn't changed.

These checks detect changes to the deployment target or uploader, but they don't sandbox arbitrary build code. Build dependencies still need the same trust as other code you run on your machine.

:::

### Local development

`pnpm dev` continues to work as before -- Miniflare creates local instances of all bindings regardless of the IDs in your `wrangler.jsonc`. Your real resource IDs are only used during direct Cloudflare deployment.

### AI on your Cloudflare account {#ai-self-host}

`void/ai` works on your own Cloudflare account, along two paths:

- **Workers AI** (`ai.run`, `ai.stream`, `ai.image`) works out of the box. When your app imports `void/ai`, `vite build` infers that you need AI and adds a Workers AI binding (`env.AI`) to the generated `wrangler.json` automatically -- you do **not** add it to `wrangler.jsonc`. Set `inference.bindings.ai` to a string to use a custom name.
- **Provider models** (`ai.provider("openai").fetch(...)`) route through _your own_ Cloudflare AI Gateway. Set its id in `void.json` and add the provider's API key as a Worker secret.

```jsonc
// void.json
{
  "ai": {
    "gateway": "my-gateway", // an AI Gateway in YOUR Cloudflare account
  },
}
```

```bash
# provider API key, stored as a Worker secret (never committed)
void secret put OPENAI_API_KEY
```

```ts
// routes/chat.ts
import { defineHandler } from 'void';
import { ai } from 'void/ai';

export const POST = defineHandler(async (c) => {
  // Workers AI -- uses the inferred or configured AI binding directly
  const summary = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
    prompt: 'Summarize the changelog.',
  });

  // Provider model -- routes through your "my-gateway" AI Gateway,
  // authed with the OPENAI_API_KEY secret above
  const res = await ai.provider('openai').fetch('chat/completions', {
    method: 'POST',
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: [] }),
  });

  return c.json({ summary, provider: await res.json() });
});
```

Set `ai.gateway` before calling `ai.provider().fetch()`; otherwise it returns `501`. Requests use the provider secrets in your Worker's environment and go through your AI Gateway to the provider. They don't pass through the Void platform's shared proxy.

Notes:

- **Account-owned usage.** Direct deployments use your own [Cloudflare AI Gateway analytics](https://developers.cloudflare.com/ai-gateway/). A team platform meters requests through its shared proxy; those usage records do not automatically bill application developers.
- **Custom AI binding names are supported.** Configure `"inference": { "bindings": { "ai": "MY_AI" } }`, or declare the custom `ai.binding` in your root Wrangler config; the generated worker records the resolved name for `void/ai` automatically.
- **Workers AI runs remotely during development.** After `void connect --platform cloudflare`, an app importing `void/ai` uses your account's remote AI binding with your Cloudflare login or API token. Development and preview calls consume that account's allowance. Apps without AI imports add no AI binding or authentication probe.

### ISR on your Cloudflare account {#isr-self-host}

[Revalidation (ISR)](../guide/edge/revalidation.md) works self-hosted. `void deploy --platform cloudflare` automatically creates or reuses the cache KV namespace and persists its `ISR_CACHE` binding in `wrangler.jsonc`, just like the other inferred resources.

Configure revalidation exactly as on the platform -- globally or per-path in `void.json`:

```jsonc
// void.json
{
  "routing": {
    "revalidate": { "/blog/*": 3600, "*": 60 },
  },
}
```

...or per page with an exported `revalidate` literal in a `.server.ts` companion (Pages mode):

```ts
// pages/blog/[slug].server.ts
export const revalidate = 3600; // seconds
```

On-demand purges work through `revalidate()`:

```ts
import { revalidate } from 'void/isr';

await revalidate({ paths: ['/blog/hello'] });
// or purge every ISR page:
await revalidate({ all: true });
```

Self-hosted, `revalidate()` purges this worker's own KV entries (global, authoritative) plus the current colo's edge cache.

There are a few differences from platform-managed ISR:

- **Edge caches expire independently.** `revalidate()` clears KV and the current data center's edge cache. Other data centers may serve their cached response until its `s-maxage` expires, then render again.
- **Pages JSON is cached after an HTML render.** A data center that hasn't rendered the HTML yet generates the JSON response live rather than reading it from KV.
- **Each deploy starts with a fresh cache.** Cache keys include a new deployment ID, so cached HTML can't reference assets from an older build. The first request renders the page again.
