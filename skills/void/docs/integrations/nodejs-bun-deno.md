---
outline: deep
---

# Node.js, Bun, and Deno

Set `target` in `void.json` to build for Node.js, Bun, or Deno. You can run the resulting server on your own machine, in a container, or with a hosting provider.

```json
{ "target": "node" }
```

## Supported Targets

| Target   | Server                                                                    | Static Assets                    |
| -------- | ------------------------------------------------------------------------- | -------------------------------- |
| `"node"` | [`@hono/node-server`](https://github.com/honojs/node-server)              | `@hono/node-server/serve-static` |
| `"bun"`  | [`Bun.serve()`](https://bun.sh/docs/api/http)                             | `hono/bun`                       |
| `"deno"` | [`Deno.serve()`](https://docs.deno.com/runtime/fundamentals/http_server/) | `hono/deno`                      |

All three produce the same project structure and use the same Hono-based routing. The only difference is the HTTP server and static file middleware.

## Getting Started

### 1. Configure the target

```json
// void.json
{ "target": "node" }
```

### 2. Install the server dependency (Node.js only)

Node.js requires `@hono/node-server` as an additional dependency. Bun and Deno use their built-in HTTP servers.

```bash
npm install @hono/node-server
```

### 3. Develop

```bash
npx vite dev
```

The dev server runs your Hono routes in Node.js through Vite's SSR module loading. You get the same hot-reload experience as the Cloudflare target, but without `workerd`.

### 4. Build and run

```bash
npx vite build
node dist/ssr/index.js
```

For Bun:

```bash
bunx vite build
bun dist/ssr/index.js
```

For Deno:

```bash
deno run -A npm:vite build
deno run -A dist/ssr/index.js
```

Run these commands from your app directory. The server listens on `PORT` (env variable) or `3000` by default.

Pages builds load their client manifest from `dist/client/.vite/manifest.json` and serve the generated JavaScript, CSS, and public assets. Keep `dist/ssr` and `dist/client` together when deploying. Asset paths resolve from the emitted server module, so the app also works when imported or started from another working directory.

## Build Output

The build produces two entry points:

```
dist/
  ssr/
    app.js       ← Hono app with static asset middleware (default export)
    index.js     ← imports app.js and starts the HTTP server
  client/        ← static assets (pages mode only)
    .vite/manifest.json
    assets/
      ...
```

- **`app.js`:** exports the Hono app instance. Use it for programmatic embedding, testing, or custom server setups.
- **`index.js`:** imports `app.js` and starts the server. This is what you run in production.

`vite preview` also uses `app.js` to serve your built app locally.

## What Works

These Void features work identically across all targets:

- [File-based routing](../guide/server-routing.md) (`routes/`, `middleware/`)
- [Pages mode](../guide/pages-routing/overview.md) with SSR (React, Vue, Svelte, Solid)
- [Typed fetch client](../guide/typed-fetch.md) (`void/client`)
- [Custom headers](../guide/edge/headers.md) (`routing.headers`)
- [Redirects](../guide/edge/redirects.md) (`routing.redirects`)
- [Environment variables](../guide/env-vars.md) (`.env` files)
- [Static site generation](../guide/ssg.md)
- [Vite preview](https://vite.dev/guide/cli#vite-preview) for testing production builds locally

## What's Different

### No Cloudflare bindings

The following imports are **not available** with a non-CF target and produce a compile-time error:

| Import         | CF Feature               |
| -------------- | ------------------------ |
| `void/db`      | D1 (SQL database)        |
| `void/kv`      | KV (key-value storage)   |
| `void/storage` | R2 (blob storage)        |
| `void/auth`    | Void-managed Better Auth |
| `void/ai`      | Workers AI               |
| `void/env`     | CF env type augmentation |

If you need a database or storage, use an external provider and connect via standard Node.js libraries.

Void-managed WebSocket route files (`*.ws.ts`) are still Cloudflare-only because they compile to Durable Objects. The `void/ws` subpath is not compile-time blocked on non-CF targets, so browser-side `connect()` code can still be bundled when a WebSocket runtime is available.

### No cron job runtime

You can still define [cron jobs](../guide/jobs.md) in `crons/` and they will compile into the bundle, but there is no built-in scheduler to invoke them. On Cloudflare, Workers Cron Triggers call the `scheduled` handler automatically. On Node.js, you'll need an external scheduler (e.g. `node-cron`, systemd timers, or your hosting platform's cron) to trigger the exported handler.

### No inbound email

Inbound [email handlers](../guide/email.md#inbound) in `email/` need Cloudflare Email Routing to invoke the worker's `email()` export, and the Node.js entry exposes HTTP only. An `email/` directory fails the build with guidance. Outbound `sendEmail` has no send transport on these targets either: it returns a `BINDING_MISSING` error.

### No prerendering

[Prerendering](../guide/edge/prerendering.md) is a platform feature that relies on Cloudflare's edge cache and the Void deploy pipeline. It is not available for non-CF targets.

### No `void deploy`

`void deploy` handles Cloudflare and Void platform deployments. For Node.js, Bun, or Deno, run `vite build` and deploy `dist/` using your hosting provider's workflow.

### Ignored config fields

Void warns and ignores these Cloudflare-specific `void.json` fields on other targets:

- `inference.bindings`: Cloudflare binding configuration
- `remote`: remote binding proxy
- `worker`: Cloudflare-specific config
- `routing.revalidate`: edge caching, only on Cloudflare

If you enable auth through `void/auth`, `void/client`, or `auth.ts`, Void fails the build for non-CF targets. Use Better Auth directly for Node/Bun/Deno deployments.

## Example: API + Pages

A typical Node.js Void app with API routes and React pages:

```
my-app/
  pages/
    layout.tsx
    index.tsx
    index.server.ts
    about.tsx
    about.server.ts
  routes/
    api/
      hello.ts
  package.json
  vite.config.ts
  void.json
```

```json
// void.json
{ "target": "node" }
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { voidPlugin } from 'void';
import { voidReact } from '@void/react/plugin';

export default defineConfig({
  plugins: [voidPlugin(), voidReact()],
});
```

```ts
// routes/api/hello.ts
import { defineHandler } from 'void';

export const GET = defineHandler((c) => {
  return c.json({ message: 'Hello from Node.js!' });
});
```

```bash
# Development
npx vite dev

# Production
npx vite build
node dist/ssr/index.js
```

## Programmatic Usage

Since `app.js` exports the Hono app, you can import it into a custom server:

```ts
import app from './dist/ssr/app.js';

// Use with any Node.js HTTP framework
const response = await app.fetch(new Request('http://localhost/api/hello'));
console.log(await response.json()); // { message: "Hello from Node.js!" }
```

This is useful for testing, embedding in Express/Fastify, or running in serverless environments that accept a `fetch` handler.
