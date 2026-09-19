---
outline: deep
---

# What is Void?

Void is a fullstack SDK for Vite apps. It connects your server code, database, and frontend types, and deploys your app to Cloudflare Workers. To try it, start with the [Quickstart](./quickstart).

Add the Vite plugin to your app. As you use features such as a database, key-value storage, or queues, Void detects what you need and sets up the corresponding resources.

The CLI and build tools require Node.js 24.21.0 or later.

```sh
npm install -D vite void
```

```ts
import { defineConfig } from 'vite';
import { voidPlugin } from 'void';

export default defineConfig({
  plugins: [voidPlugin()],
});
```

```sh
void init   # choose your framework and deployment target
void deploy
```

## The idea

Your code often already describes the resources it needs. Import `db` from `void/db`, for example, and Void provides a database for local development and provisions its production resource when you deploy. The same pattern applies to `kv`, `storage`, queues, and AI.

Types follow your data through the app: from a Drizzle schema to a route handler, then to the frontend calling that route. You can change a field in one place and let TypeScript show you the code that needs updating.

Void brings these pieces together:

- **Resources from your code:** imports tell Void which supported resources to provision. Use `void.json` or your Cloudflare config when you need to customize them.
- **Types from database to frontend:** your Drizzle schema defines DB types, route handlers infer return types, and the [typed fetch client](./typed-fetch.md) checks calls at the usage site. One [Standard Schema](https://standardschema.dev/) validator can drive both runtime validation and compile-time types.
- **Local Cloudflare development:** native Void apps run server code in `workerd`, with local database, KV, and storage.
- **Deploy that understands the app:** `void deploy` reads your migrations, provisions the resources you actually use, and ships the result to the edge.

## The platform

Void deploys to [Cloudflare Workers](https://developers.cloudflare.com/workers/). You can use your own Cloudflare account or connect to a Void platform managed by your team. Both use the same SDK and CLI.

[Static assets](./edge/static-assets) are cached at the edge. [Prerendering](./edge/prerendering) builds pages ahead of time, while [incremental revalidation](./edge/revalidation) caches pages rendered on demand. Database, storage, secrets, and deployment commands are available through Void.

For a single app, [deploy to your own account](../integrations/cloudflare#deploy-to-your-own-cloudflare-account). To give a team a shared deployment service, [install a Void platform](./self-hosted-platform.md), then let developers connect to its URL.

## How it works

```
vite.config.ts                →  voidPlugin() (works with any Vite app)
import { db }                 →  D1 database (auto-provisioned)
import { kv }                 →  KV namespace (auto-provisioned)
import { storage }            →  R2 bucket (auto-provisioned)
import { ai }                 →  Workers AI inference (metered)
db/schema.ts                  →  Drizzle schema (source of truth for DB types)
db/migrations/*.sql           →  Applied to D1 on deploy
void deploy                   →  Deploy to the saved Cloudflare or Void target
```

The plugin scans your source code at build time, detects which imports you use, and provisions the corresponding Cloudflare bindings on deploy.

Void also works with existing frameworks. [TanStack Start](/integrations/frameworks/tanstack-start), [React Router](/integrations/frameworks/react-router), [SvelteKit](/integrations/frameworks/sveltekit), [Nuxt](/integrations/frameworks/nuxt), and [Astro](/integrations/frameworks/astro) can all deploy with the same `voidPlugin()`.

If you are building a full-stack app without a meta-framework, Void also gives you [file-based server routing](./server-routing) with method exports, dynamic params, middleware, and validation. It also includes [pages routing](./pages-routing/overview) for server-rendered UI, SPA navigation, co-located data loading, and typed forms across React, Vue, Svelte, and Solid.

Void detects your [app type](./app-types) and chooses the appropriate build and deployment flow.

## Next steps

- [Quickstart](./quickstart): get a running app in minutes
- [Server Routing](./server-routing): dynamic params, middleware, and validation
- [Pages Routing](./pages-routing/overview): full-stack pages with server loaders and actions
- [Supported App Types](./app-types): full-stack, meta-framework, and static site modes
