---
outline: deep
---

# What is Void?

Void adds server routes, typed data access, and deployment to Vite apps. Native Void apps run on Cloudflare Workers. You can also use Void with a [supported framework](../integrations/frameworks/overview).

Start with the [Quickstart](./quickstart) to create an app, run it locally, and deploy it.

The CLI and build tools require Node.js 24.21.0 or later.

## Resources from your code

Import `db` from `void/db`, and Void provides a local database and provisions one for deployment. The same pattern applies to KV, object storage, queues, and AI. Configure resources explicitly when you need to use existing infrastructure.

Your Drizzle schema defines database types. Route handlers infer return types, and the [typed fetch client](./typed-fetch.md) checks calls from the frontend. Changing a field shows you which callers need to change.

Void connects these parts of your app:

- [Server routes](./server-routing.md) and [pages](./pages-routing/overview.md) for your app's backend and UI
- [Database](./database.md), [KV](./kv.md), and [storage](./storage.md) that work locally and in production
- [Standard Schema](https://standardschema.dev/) validation for runtime values and TypeScript types
- `void deploy` to build, apply migrations, provision resources, and deploy

## Deployment targets

Deploy to [your own Cloudflare account](../integrations/cloudflare.md#deploy-to-your-own-cloudflare-account) or to a [Void platform](./self-hosted-platform.md) run by your team. Both use the same SDK and CLI.

[Static assets](./edge/static-assets) are cached at the edge. [Prerendering](./edge/prerendering) builds pages ahead of time, while [incremental revalidation](./edge/revalidation) caches pages rendered on demand. Database, storage, secrets, and deployment commands are available through Void.

## How resource detection works

```
vite.config.ts                →  voidPlugin() (works with any Vite app)
import { db }                 →  D1 database (auto-provisioned)
import { kv }                 →  KV namespace (auto-provisioned)
import { storage }            →  R2 bucket (auto-provisioned)
import { ai }                 →  Workers AI inference (metered)
db/schema.ts                  →  Drizzle schema (source of truth for DB types)
db/migrations/*.sql           →  Applied to the selected database on deploy
void deploy                   →  Deploy to the saved Cloudflare or Void target
```

The Vite plugin detects supported imports and adds the corresponding bindings. Void also detects your [app type](./app-types) to choose the build and deployment flow. Use `void.config.ts` when you need to control either choice.

## Next steps

- [Quickstart](./quickstart): get a running app in minutes
- [Server Routing](./server-routing): dynamic params, middleware, and validation
- [Pages Routing](./pages-routing/overview): full-stack pages with server loaders and actions
- [Supported App Types](./app-types): full-stack, meta-framework, and static site modes
