---
outline: deep
---

# SvelteKit

Use Void with [SvelteKit](https://svelte.dev/docs/kit) for resource detection, typed database queries, and migrations. SvelteKit keeps its own build and Cloudflare integration; Void plugs into its Vite configuration.

## Setup

### 1. Create a new project

```bash
npx sv create my-app
cd my-app
```

### 2. Install dependencies

```bash
npm install -D @sveltejs/adapter-cloudflare void
```

### 3. Configure `vite.config.ts`

```ts
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { voidPlugin } from 'void';
import { withVoidTSConfig } from 'void/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    voidPlugin(),
    sveltekit({
      adapter: adapter({
        config: './.void-wrangler.jsonc',
        platformProxy: { configPath: './.void-wrangler.jsonc' },
      }),
      typescript: {
        config: withVoidTSConfig(),
      },
    }),
  ],
});
```

If your project already configures SvelteKit in `svelte.config.js`, keep that file and add `typescript.config: withVoidTSConfig()` under its `kit` options instead. SvelteKit ignores `svelte.config.js` when options are passed directly to `sveltekit()`.

### 4. Create `void.config.ts`

Point SvelteKit's adapter at Void's generated Cloudflare config as shown above. Add your Cloudflare settings to `void.config.ts`:

```ts
import { defineConfig } from 'void/config';

export default defineConfig({
  cloudflare: {
    name: 'my-app',
    compatibility_date: '2026-02-24',
    compatibility_flags: ['nodejs_compat'],
  },
});
```

### 5. Configure `tsconfig.json`

Extend SvelteKit’s generated config. The `withVoidTSConfig()` hook in the Vite config above adds Void’s types and aliases:

Keep `compilerOptions.paths` out of the root config so it does not override SvelteKit’s aliases.

```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "types": ["void/env"]
  }
}
```

Run `void prepare` after a fresh clone or before typechecking in CI so `.void/tsconfig.json` exists before SvelteKit syncs its config.

### 6. Deploy

```bash
void auth login
void deploy
```

## Using Void Features

Most [Void platform features](../../guide/app-types.md#void-apps) work with SvelteKit. Use them in server load functions, actions, and API routes:

Void-managed auth is not supported in framework mode yet. Use Better Auth's official SvelteKit integration directly for now.

### Database

```ts
// src/routes/users/+page.server.ts
import { db } from 'void/db';
import { users } from '@schema';

export async function load() {
  return { users: await db.select().from(users) };
}
```

### Other resources

Use [KV](../../guide/kv.md), [object storage](../../guide/storage.md), and [AI](../../guide/ai.md) from server-side code with the same imports as a Void app. Add [cron jobs](../../guide/jobs.md) in `crons/` and [queue consumers](../../guide/queues.md) in `queues/`.

### Environment Variables

Declare variables in `env.ts` and read them with `import { env } from "void/env"`. See [Environment Variables](../../guide/env-vars.md) for local values, production secrets, and public `VITE_*` values.

## Accessing Bindings Directly

You can also use SvelteKit's `platform.env` in server hooks and load functions:

```ts
// src/routes/users/+page.server.ts
export async function load({ platform }) {
  const { results } = await platform.env.DB.prepare('SELECT * FROM users').all();
  return { users: results };
}
```

Or the `cloudflare:workers` module:

```ts
import { env } from 'cloudflare:workers';

const { results } = await env.DB.prepare('SELECT * FROM users').all();
```
