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

By default, SvelteKit's Cloudflare adapter, `voidPlugin()` migrations, and `void db` commands share local state at `.wrangler/state/v3`, so no extra `platformProxy.persist` configuration is required.

### 5. Configure `tsconfig.json`

SvelteKit generates `.svelte-kit/tsconfig.json` and expects your root config to extend it. Void generates `.void/tsconfig.json` for project-specific aliases such as `void/db` and `@schema`.

Do not add Void's `compilerOptions.paths` to the root `tsconfig.json`; SvelteKit warns because root-level paths override its generated aliases. The `withVoidTSConfig()` hook merges Void's generated files and aliases into SvelteKit's generated config instead.

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

## Using Void Platform Features

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

### KV Storage

```ts
import { kv } from 'void/kv';

export async function load() {
  return { settings: await kv.get('app:settings') };
}
```

### Blob Storage

```ts
import { storage } from 'void/storage';

export async function load() {
  return { avatar: await storage.get('avatars/user-1.png') };
}
```

### AI

```ts
import { ai } from 'void/ai';

export const actions = {
  summarize: async () => {
    return ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      prompt: 'Summarize the latest news',
    });
  },
};
```

### Cron Jobs

```ts
// crons/daily-cleanup.ts
import { defineScheduled } from 'void';

export const cron = '0 0 * * *';

export default defineScheduled(async () => {
  // runs daily at midnight
});
```

### Queue Consumers

```ts
// queues/emails.ts
import { defineQueue } from 'void';

export default defineQueue<{ to: string; subject: string }>(async (batch) => {
  for (const msg of batch.messages) {
    // process each message
    msg.ack();
  }
});
```

### Environment Variables

Declare environment variables in `env.ts`, then read them with `import { env } from "void/env"`. Void supplies types, checks values during build and deploy, and stops the build if client code references a server-only key. See [Environment Variables](../../guide/env-vars.md).

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
