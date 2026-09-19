---
outline: deep
---

# Config

## Config File Format

Use this page as the exact reference for `void.json`. If you are still learning how the pieces fit together, start in the guide first and come back here when you need field-by-field details.

Project-level configuration lives in a `void.json` file at the project root. Most fields are optional. Cloudflare-targeted apps must pin a Workers `compatibility_date` in `worker.compatibility_date` or in a supported Cloudflare fallback file (`wrangler.jsonc` or `wrangler.json`). If no date is configured, Void writes the latest known-good date to `void.json` so future runs stay explicit and stable.

```json
{
  "$schema": "./node_modules/void/schema.json",
  "sourceDir": "src",
  "target": "cloudflare",
  "auth": {
    "providers": ["email", "github", "google"]
  },
  "routing": {
    "revalidate": { "/": 60, "*": 30 },
    "headers": {
      "/assets/*": ["Cache-Control: public, max-age=31536000, immutable"],
      "/*": ["X-Frame-Options: DENY", "X-Content-Type-Options: nosniff"]
    }
  },
  "inference": {
    "bindings": { "db": true, "kv": false },
    "appType": "spa",
    "outputDir": "dist"
  },
  "worker": {
    "compatibility_date": "2025-12-01",
    "compatibility_flags": ["nodejs_compat"]
  }
}
```

Add the `$schema` field for autocomplete and validation in your editor. The schema ships with the `void` package at `node_modules/void/schema.json` and is also exposed as the `void/schema.json` package subpath.

## Fields

### `sourceDir`

Directory containing Void source conventions, relative to the project root.

When omitted, Void uses the existing project-root conventions: `pages/`, `routes/`, `middleware/`, `crons/`, `queues/`, `db/`, `auth.ts`, and `env.ts`.

When set, those conventions move under the configured directory:

```json
{ "sourceDir": "src" }
```

With that config, Void reads `src/pages`, `src/routes`, `src/db/schema.ts`, `src/db/migrations`, `src/auth.ts`, and `src/env.ts`. Project files such as `void.json`, `vite.config.ts`, `package.json`, `tsconfig.json`, `wrangler.json`, `public/`, and the local-only `.env` stay at the project root. Void does not scan both locations; if source conventions exist in both places during dev/build, remove one copy so the active source tree is unambiguous.

### `auth`

High-level Better Auth configuration.

Use `auth.providers` to select which built-in auth providers Void should enable by default. Include `"email"` for email/password auth. Social providers read credentials from `AUTH_<PROVIDER>_CLIENT_ID` and `AUTH_<PROVIDER>_CLIENT_SECRET`.

```json
{
  "auth": {
    "providers": ["email", "github", "google", "discord"]
  }
}
```

If `auth` is omitted but auth is active via imports, Void enables email/password only. For provider-specific options, scopes, plugins, or custom OAuth flows, use a root `auth.ts` with `defineAuth(...)`.

Supported values for `auth.providers`:

- `email`
- `apple`
- `atlassian`
- `cognito`
- `discord`
- `dropbox`
- `facebook`
- `figma`
- `github`
- `gitlab`
- `google`
- `huggingface`
- `kakao`
- `kick`
- `line`
- `linear`
- `linkedin`
- `microsoft`
- `naver`
- `notion`
- `paybin`
- `paypal`
- `polar`
- `railway`
- `reddit`
- `roblox`
- `salesforce`
- `slack`
- `spotify`
- `tiktok`
- `twitch`
- `twitter`
- `vercel`
- `vk`
- `zoom`

### `database`

Database backend. Omit for D1/SQLite (default). Set to `"pg"` or `"mysql"` for an external database through Hyperdrive.

```json
{
  "database": "pg"
}
```

| Value       | Description                                             |
| ----------- | ------------------------------------------------------- |
| _(omitted)_ | D1 (SQLite), fully managed by Void with no extra config |
| `"pg"`      | PostgreSQL via Hyperdrive; bring your own database      |
| `"mysql"`   | MySQL via Hyperdrive; bring your own database           |

When using an external database:

- Add `DATABASE_URL` to `.env` for local development
- Import schema helpers from `void/schema-pg` or `void/schema-mysql`
- `void/db` connects via Hyperdrive in production, direct connection locally
- `void gen model` generates dialect-appropriate table and column builders

### `email`

Configuration for the [email integration](../guide/email.md).

```json
{
  "email": {
    "from": "Acme <noreply@mail.acme.com>"
  }
}
```

| Field  | Type     | Description                                                                                                    |
| ------ | -------- | -------------------------------------------------------------------------------------------------------------- |
| `from` | `string` | Default sender for `sendEmail()`: one address, optionally with a display name (`Acme <noreply@mail.acme.com>`) |

What `from` does depends on where the app runs:

- **`void dev`** — becomes the default `from` of every `sendEmail()` call, captured in the dev inbox; no mail leaves the machine.
- **`void deploy`** (managed platform) — not used: the sender is pinned to your project's own platform address, which Void fills in for you.
- **`void deploy --platform cloudflare`** (your own Cloudflare account) — the address host (`mail.acme.com`) is the domain Void sets Email Routing and Email Sending up on, and the address becomes the default `from` (written into the worker as the `__VOID_EMAIL_FROM` var). The host must be a zone in the pinned Cloudflare account, or a subdomain of one; a subdomain is the usual choice, and the apex is refused when it already receives mail elsewhere. An app that uses email without `email.from` deploys without it and prints the line to add. Void never picks a zone or writes `void.json` for you. See [Your own Cloudflare account](../guide/email.md#your-own-cloudflare-account).

### `head`

Site-wide HTML `<head>` defaults for pages mode. Sets a title template, default meta tags, links, scripts, and HTML/body attributes. Per-page `head()` exports and middleware defaults merge on top of these with clear precedence: **page > middleware > config**.

| Field           | Type                     | Description                                                      |
| --------------- | ------------------------ | ---------------------------------------------------------------- |
| `title`         | `string`                 | Default page title (overridden by page `head()`)                 |
| `titleTemplate` | `string`                 | Wraps the resolved title. `%s` is replaced with the page title.  |
| `meta`          | `Array<object>`          | Default `<meta>` tags (deduped by `name`/`property`, page wins)  |
| `link`          | `Array<object>`          | Default `<link>` tags (concatenated: config, middleware, page)   |
| `script`        | `Array<object>`          | Default `<script>` tags (concatenated: config, middleware, page) |
| `htmlAttrs`     | `Record<string, string>` | Attributes on `<html>` (shallow merge, page wins)                |
| `bodyAttrs`     | `Record<string, string>` | Attributes on `<body>` (shallow merge, page wins)                |

```json
{
  "head": {
    "titleTemplate": "%s | My Site",
    "htmlAttrs": { "lang": "en" },
    "meta": [
      { "charset": "utf-8" },
      { "name": "viewport", "content": "width=device-width, initial-scale=1" }
    ],
    "link": [{ "rel": "icon", "href": "/favicon.svg" }]
  }
}
```

See [Head Management](../guide/pages-routing/head) for the full merge behavior, `HeadDescriptor` shape, and per-page usage.

### `output`

Output mode. Controls the default rendering strategy for pages.

| Value                | Default prerender | Per-page override                | Prerender timing           |
| -------------------- | ----------------- | -------------------------------- | -------------------------- |
| `"server"` (default) | `false`           | `export const prerender = true`  | Deploy-time (platform ISR) |
| `"static"`           | `true`            | `export const prerender = false` | Build or deploy post-build |

When set to `"static"`, all pages are prerendered as static HTML files written to `dist/client/`. A standalone `vite build` renders them in the build; managed `void deploy` renders immediately afterward in the trusted deploy process so build plugins never receive platform credentials. Individual pages can opt out with `export const prerender = false`. Dynamic pages (with route params) without a `getPrerenderPaths()` export are implicitly not prerendered.

When omitted or set to `"server"`, pages are server-rendered on request. Individual pages can opt into deploy-time prerendering with `export const prerender = true`, or opt out of server-rendered component HTML with `export const ssr = false`.

```json
{ "output": "static" }
```

### `remote`

Use remote D1/KV/R2 bindings during local development instead of local miniflare. When enabled, the Void plugin replaces local bindings with proxy-backed versions that forward operations to your deployed project's real resources via the Void proxy.

```json
{ "remote": true }
```

**Requirements:**

- Must be logged in (`void auth login`)
- Must have a linked project (`void project link`)
- Only affects D1 (`DB`), KV (`KV`), and R2 (`STORAGE`) bindings

You can also enable remote mode via the `VOID_REMOTE=1` environment variable without modifying `void.json`:

```bash
VOID_REMOTE=1 pnpm dev
```

### `sandbox`

Enable and configure Cloudflare Sandboxes for Void apps. Importing from `void/sandbox` enables this automatically; set `sandbox` when you need custom container settings.

```json
{
  "sandbox": {
    "image": "./Dockerfile.sandbox",
    "platformImage": "registry.example.com/acme/sandbox:latest",
    "instanceType": "lite",
    "maxInstances": 2
  }
}
```

| Field               | Type     | Default                              |
| ------------------- | -------- | ------------------------------------ |
| `binding`           | `string` | `SANDBOX`                            |
| `className`         | `string` | `Sandbox`                            |
| `containerName`     | `string` | `void-sandbox`                       |
| `image`             | `string` | Matching published sandbox SDK image |
| `imageBuildContext` | `string` | Directory of `image`                 |
| `platformImage`     | `string` | Matching sandbox SDK registry image  |
| `instanceType`      | `string` | `lite` on Void deploy                |
| `maxInstances`      | `number` | `20` on Void deploy                  |

Sandbox support currently applies to Void apps on the Cloudflare target. Native deployment requires [Workers Paid](https://dash.cloudflare.com/?to=/:account/workers/plans) because Cloudflare Containers are unavailable on Workers Free. `void deploy --platform cloudflare` verifies Containers access before provisioning resources or building the app and explains how to fix a missing plan or API-token permission. Apps that do not import `void/sandbox` or configure `sandbox` emit no Container and perform no entitlement check. The default registry image is pinned to the installed `@cloudflare/sandbox` version, so local and native Cloudflare deploys run the same container as Void Platform. If `sandbox.image` is a custom local Dockerfile path, set `sandbox.platformImage` to the pushed image that the platform should run.

### `target`

Deploy target runtime. Defaults to `"cloudflare"`.

| Value          | Description                                               |
| -------------- | --------------------------------------------------------- |
| `"cloudflare"` | Cloudflare Workers (default), with full platform features |
| `"node"`       | Node.js, using `@hono/node-server`                        |
| `"bun"`        | Bun, using `Bun.serve()`                                  |
| `"deno"`       | Deno, using `Deno.serve()`                                |

Non-CF targets disable CF binding imports (`void/db`, `void/kv`, `void/auth`, `void/storage`, `void/ai`, `void/sandbox`, `void/env`). Importing any of these with a non-CF target produces a compile-time error. File-based routing, middleware, and `void/client` all work normally.

Void-managed WebSocket route files (`*.ws.ts`) are Cloudflare-only because they compile to Durable Objects. The `void/ws` subpath itself is not blocked on non-CF targets so client-side `connect()` code can still be bundled where a browser-like `WebSocket` runtime is available.

```json
{ "target": "node" }
```

### `worker`

Curated Cloudflare Workers configuration. Cloudflare-targeted apps require an explicit `compatibility_date` here unless it is provided by a supported Cloudflare fallback file. If no date is configured, Void writes the latest known-good date here. Binding arrays such as `d1_databases`, `kv_namespaces`, and `r2_buckets` are not allowed here because Void manages bindings through inference and `inference.bindings`. If you need custom bindings with real IDs, add them to `wrangler.jsonc`; Void preserves them during deployment.

| Field                 | Type       | Description                            |
| --------------------- | ---------- | -------------------------------------- |
| `compatibility_date`  | `string`   | Cloudflare Workers compatibility date  |
| `compatibility_flags` | `string[]` | Cloudflare Workers compatibility flags |
| `vars`                | `object`   | Plain-text worker variables            |
| `limits`              | `object`   | Worker resource limit overrides        |

```json
{
  "worker": {
    "compatibility_date": "2025-12-01",
    "compatibility_flags": ["nodejs_compat"],
    "vars": {
      "PUBLIC_API_BASE": "https://api.example.com"
    }
  }
}
```

`worker.vars` values must be strings. Root `.env` values override them during local development only. Production builds do not load `.env`, and reject any `worker.vars` name declared as a server key in `env.ts`. Use `void secret put` for production server values.

`worker.limits.cpu_ms` caps Workers CPU time per request, in milliseconds. It must be an integer between 1 and 300000 (Cloudflare's hard maximum, 5 minutes). A deploy that requests more than your account plan's ceiling fails with an error naming both the requested value and the plan maximum. Only a rollback clamps: rolling back to a deployment whose configured limit now exceeds your plan applies the plan ceiling instead of failing. If your plan changes so that a previously valid value now exceeds the ceiling, deploys keep failing until you lower `cpu_ms` in `void.json`. On the direct Cloudflare path, the value is written into the generated `dist/ssr/wrangler.json` as `limits.cpu_ms` and enforced by Cloudflare directly. The Void plan ceiling does not apply there, but your Cloudflare account's own CPU-time allowance still does: the Workers Free plan caps CPU at 10 ms per request, and the Workers Paid plan allows up to 300000 ms. A value above what your Cloudflare account permits is constrained or rejected by Cloudflare, not by Void.

```json
{
  "worker": {
    "limits": {
      "cpu_ms": 30000
    }
  }
}
```

### `routing`

Routing and edge configuration for headers, redirects, rewrites, and caching.

#### `routing.headers`

Custom response headers for dispatch-worker responses. Keys are URL patterns, values are arrays of `"Name: value"` strings. See [Custom Headers](../guide/edge/headers) for details.

```json
{
  "routing": {
    "headers": {
      "/assets/*": ["Cache-Control: public, max-age=31536000, immutable"],
      "/*": ["X-Frame-Options: DENY", "X-Content-Type-Options: nosniff"]
    }
  }
}
```

#### `routing.redirects`

URL redirects. Keys are source URL patterns, values are destination strings (302 default) or objects with `to` and optional `status` (`301`, `302`, `303`, `307`, `308`). See [Redirects](../guide/edge/redirects) for details.

```json
{
  "routing": {
    "redirects": {
      "/old": "/new",
      "/blog/*": { "to": "/posts/:splat", "status": 301 }
    }
  }
}
```

#### `routing.rewrites`

URL rewrites. Keys are source URL patterns, values are destination paths. Serves content from the destination without changing the browser URL. See [Rewrites](../guide/edge/rewrites) for details.

```json
{
  "routing": {
    "rewrites": {
      "/": "/en",
      "/docs/*": "/en/docs/:splat"
    }
  }
}
```

Destinations use the `RewriteDestination` shape — typed route patterns plus `string`, so known routes autocomplete while dynamic paths remain accepted. See [Programmatic rewrites in middleware](../guide/edge/rewrites#programmatic-rewrites-in-middleware) for the trade-off and performance notes.

#### `routing.fallbacks`

Fallback rewrites. Same shape as `rewrites`, but rules only fire when no static asset or route matched the request (i.e. the request would otherwise 404). Useful for SPA shells or default-locale catch-alls that shouldn't pre-empt real routes. See [Rewrites → Fallbacks](../guide/edge/rewrites#fallbacks) for details.

```json
{
  "routing": {
    "fallbacks": {
      "/*": "/index.html"
    }
  }
}
```

#### `routing.isr`

Boolean switch for Void's ISR caching. When omitted or `true`, Void infers caching from your revalidate and prerender settings. Setting it to `false` disables ISR and edge prerendering for the whole app, including per-page exports:

```json
{
  "routing": {
    "isr": false
  }
}
```

This does not disable `output: "static"` build-time HTML generation or delete existing KV resources. Set it to `true` to enable your configured cache policies again. Existing-Worker migration saves this choice before provisioning, so it remains consistent on retries and later deployments.

#### `routing.revalidate`

ISR revalidation TTL in seconds, either globally or per path. See [Revalidation](../guide/edge/revalidation.md) for details.

```json
{
  "routing": {
    "revalidate": {
      "/": 60,
      "/docs/*": 31536000,
      "*": 30
    }
  }
}
```

#### `routing.revalidateQueryAllowlist`

Query parameters that participate in ISR variant keys for dispatch rewrites. Keys are source URL patterns, values are query parameter names to keep. When omitted, rewritten ISR cache keys drop every incoming query parameter to avoid unbounded cache fanout.

```json
{
  "routing": {
    "revalidateQueryAllowlist": {
      "/search": ["q"],
      "/products/*": ["variant", "currency"],
      "*": []
    }
  }
}
```

#### `routing.prerender`

Paths to prerender as static HTML at deploy time. Each path must start with `/`. See [Edge Prerendering](../guide/edge/prerendering.md) for details.

```json
{
  "routing": {
    "prerender": ["/", "/about", "/pricing"]
  }
}
```

#### `routing.notFound`

Override how the asset layer answers a request that matched no asset and no worker route. One of `"single-page-application"`, `"404-page"`, or `"none"`. If omitted, Void infers it — see [Static Assets](../guide/edge/static-assets.md#unmatched-requests).

```json
{
  "routing": {
    "notFound": "404-page"
  }
}
```

Set `"404-page"` when your assets come from a static site generator (VitePress, Docusaurus, …) and you want unknown URLs to serve the generator's own `404.html` with a real HTTP 404. Without it, an app whose only backend is API routes keeps the inferred SPA fallback, so every unknown URL returns `index.html` with a `200` — correct for a single-page app, wrong for a generated site, and bad for crawlers.

`run_worker_first` is untouched, so API routes, auth, and `/__void/*` still reach the worker first. When the worker owns HTML routing it also serves the resolved behavior itself, since `run_worker_first: ["/**"]` means the platform switch never runs — see [Unmatched requests](../guide/edge/static-assets.md#unmatched-requests).

This does **not** apply to SvelteKit, Nuxt, Analog, or Astro deploys: those pin `not_found_handling` to `"none"` because the framework's own worker owns unmatched HTML, and `void deploy` warns if you set `routing.notFound` anyway.

TanStack Start, React Router, and vinext honor it on a managed `void deploy`, which resolves the asset config itself. Void writes no `assets` policy into their generated Worker config (`dist/server` for TanStack Start and vinext App, `build/server` for React Router, `dist/ssr` for vinext Pages). A custom config must declare a complete `assets` policy — `binding`, `directory`, `not_found_handling`, and `run_worker_first`. Void leaves those fields untouched, so your own policy is honored; with none, Cloudflare's default applies. `vite build` warns when it is set. See [Static Assets](../guide/edge/static-assets.md#unmatched-requests) for the per-framework paths.

### `inference`

Configuration for build-time inference, including how Void detects your app type, bindings, and build process.

#### `inference.bindings`

Explicitly control inferred Cloudflare bindings. If omitted, bindings are [automatically inferred](./resource-inference.md) by scanning your source files for binding usage. If provided, explicit values take precedence and inference is skipped entirely.

Each binding accepts `true` (use default name), `false` (disable), or a string (custom binding name):

```json
{ "inference": { "bindings": { "db": true, "kv": false, "storage": "MY_BUCKET", "ai": "MY_AI" } } }
```

| Key       | Default Binding | Type          | Custom Name              |
| --------- | --------------- | ------------- | ------------------------ |
| `db`      | `DB`            | `D1Database`  | `"db": "MY_DB"`          |
| `kv`      | `KV`            | `KVNamespace` | `"kv": "MY_KV"`          |
| `storage` | `STORAGE`       | `R2Bucket`    | `"storage": "MY_BUCKET"` |
| `ai`      | `AI`            | `Ai`          | `"ai": "MY_AI"`          |
| `email`   | —               | —             | Boolean only             |

Custom resource binding names flow through deploy manifests, Cloudflare config generation, remote binding proxying, internal migrations, and generated runtime helpers such as `void/db`, `void/kv`, and `void/storage`. Custom AI names apply to generated Cloudflare configuration and `void/ai` runtime resolution for direct Cloudflare builds; managed Workers AI continues to use Void's service proxy.

`email` is a feature switch rather than a Cloudflare binding, so it has no binding name or type. On the platform, outbound mail is sent through the Void proxy, which owns the `send_email` binding — none is written into your worker; on your own Cloudflare account, `void deploy --platform cloudflare` writes a `send_email` binding named `SEND_EMAIL` into `wrangler.jsonc` itself once email is set up (see [`email.from`](#email)). Set it to `true` to turn the [email integration](../guide/email.md) on — which registers the `void dev` inbox — even when no scanned file imports `void/email`, or `false` to turn it off.

#### `inference.build`

Override the build command. Useful for frameworks with their own CLIs (Nuxt, Astro) or static apps with custom build scripts. If omitted, the CLI uses the detected default build command for the current app type. It applies to every app type, including `"void"` (where the default is `vite build`).

```json
{ "inference": { "build": "nuxt build --preset cloudflare-module" } }
```

The command is run through a shell from the project root, with the project's own `node_modules/.bin` on `PATH`, so bare binaries and `&&` chains work:

```json
{ "inference": { "build": "vitepress build && vite build" } }
```

That chain is how a static site generator and a Void backend ship together — see [Adding a backend to a static site](../guide/app-types.md#adding-a-backend-to-a-static-site).

#### `inference.scanDirs`

Override which directories are scanned for [binding inference](./resource-inference.md). Paths are relative to the project root. Replaces the default directories for the current mode.

```json
{ "inference": { "scanDirs": ["src", "lib", "workers"] } }
```

#### `inference.appType`

App type. If omitted, auto-detected on first deploy. See [Supported App Types](../guide/app-types.md).

- `"void"`: worker plus assets, including API routes, SSR, and jobs
- `"framework"`: a meta-framework app such as TanStack Start, React Router, SvelteKit, Nuxt, or Astro
- `"static"`: fully rendered HTML files from VitePress, plain HTML, or external tools. Non-matching paths return `404.html` or a 404 response.
- `"spa"`: static output with SPA fallback. Non-file paths fall back to `index.html` with a `200` status so client-side routing works out of the box.

#### `inference.outputDir`

Output directory for static deploys, relative to the project root. Only relevant when `inference.appType` is `"spa"` or `"static"`. Defaults to `"dist"`.
