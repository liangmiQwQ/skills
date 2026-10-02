---
name: migrate-cloudflare-to-void
description: Migrate an existing Vite app using @cloudflare/vite-plugin to Void while preserving its routes, bindings, and deployment identity.
---

# Migrate a Cloudflare Vite app to Void

Read the app's package manifest, Vite config, Worker entry, Cloudflare config,
and migrations. Identify its framework, endpoints, bindings, and deployed Worker
before changing them.

Use the bundled guides under `../void/docs/`:

- `integrations/cloudflare.md` for existing Worker handoff and configuration.
- `integrations/frameworks/overview.md` and the matching framework guide when
  another framework owns routing and SSR.
- `guide/server-routing.md` for native Void handlers and middleware.
- `guide/database.md` for schema and migration setup.
- `reference/cli.md` before running commands.

Add `void` and replace `cloudflare()` with `voidPlugin()`, preserving the
framework plugins and unrelated Vite settings. Remove dependencies and scripts
only when their replacement is working and no other workflow uses them.

For native Void routes, use one file per URL with named HTTP method exports:

```ts
// routes/api/users/[id].ts
import { defineHandler } from 'void';

export const GET = defineHandler((c) => {
  return { id: c.req.param('id') };
});
```

Keep GET and POST for the same URL in the same file. Middleware lives in
`middleware/` and runs in filename order. Preserve existing URLs and behavior;
framework apps keep their framework's routing conventions.

Preserve configured bindings and resource IDs. Use `void.config.ts` for authored
settings and `void.lock.json` for provisioned state. Let Void migrate supported
root Cloudflare configuration rather than deleting it before the handoff.
Database migrations live in `db/migrations/`; preserve their journal, ordering,
and deployed history instead of recreating them.

Verify the app's development server, representative routes, and production build.
When deployment is part of the user's request, follow the existing Worker
handoff in the Cloudflare guide and verify the reported URL. Keep new resources,
auth setup, and database or secret changes separate from that first handoff;
follow its explicit ISR cache choice when needed.

Summarize the changes and any remaining migration work.
