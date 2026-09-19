---
outline: deep
---

# React Router v7

Add `voidPlugin()` alongside the [React Router v7](https://reactrouter.com/) Vite plugin to use Void's database, storage, and deployment features. You don't need a separate Cloudflare adapter.

## Setup

### 1. Create a new project

```bash
npm create react-router@latest my-app
cd my-app
```

### 2. Install dependencies

```bash
npm install -D void
```

### 3. Configure `vite.config.ts`

```ts
import { defineConfig } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import { voidPlugin } from 'void';

export default defineConfig({
  plugins: [
    voidPlugin(), // must come before the framework plugin
    reactRouter(),
  ],
});
```

### 4. Deploy

```bash
void auth login
void deploy
```

## Using Void Platform Features

Most [Void platform features](../../guide/app-types.md#void-apps) work with React Router. Use them in loaders and actions:

Void-managed auth is not supported in framework mode yet. Use Better Auth's official React Router integration directly for now.

### Database

```tsx
import type { Route } from './+types/users';
import { db } from 'void/db';
import { users } from '@schema';

export async function loader({}: Route.LoaderArgs) {
  return { users: await db.select().from(users) };
}
```

### KV Storage

```tsx
import { kv } from 'void/kv';

export async function loader() {
  return { settings: await kv.get('app:settings') };
}
```

### Blob Storage

```tsx
import { storage } from 'void/storage';

export async function loader() {
  return { avatar: await storage.get('avatars/user-1.png') };
}
```

### AI

```tsx
import { ai } from 'void/ai';

export async function action() {
  return ai.run('@cf/meta/llama-3.1-8b-instruct', {
    prompt: 'Summarize the latest news',
  });
}
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

React Router keeps loaders and components in the same route file. Void's client check therefore treats that file as reachable from the browser, even though React Router removes loaders from the client bundle. Read server secrets in a `.server.ts` companion module to keep that separation explicit.

## Accessing Bindings Directly

You can also access Cloudflare bindings via the `cloudflare:workers` module:

```tsx
import { env } from 'cloudflare:workers';

const { results } = await env.DB.prepare('SELECT * FROM users').all();
```
