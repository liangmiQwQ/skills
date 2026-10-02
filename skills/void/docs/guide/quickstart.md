---
outline: deep
---

# Quickstart

Create a Void app, run it locally, and deploy it. You can also [add Void to an existing Vite app](#adding-to-an-existing-vite-app). Use Node.js 24.21.0 or later.

## Start in an Empty Directory

Install Void in an empty project directory:

::: code-group

```sh [npm]
npm install -D void
```

```sh [pnpm]
pnpm add -D void
```

```sh [yarn]
yarn add -D void
```

```sh [bun]
bun add -D void
```

:::

Run setup:

::: code-group

```sh [npm]
npx void init
```

```sh [pnpm]
pnpm void init
```

```sh [yarn]
yarn void init
```

```sh [bun]
bunx void init
```

:::

Void asks you to choose Vite+ or Vite, a UI framework, a starter, and a deployment target. Vite+ is the default. D1 needs no local database server; choose PostgreSQL or MySQL if you use an external database. You can skip deployment setup and decide later.

With pnpm, you can start with `pnpm create void my-app`. It configures native build permissions before installing Void.

The examples below use `void` for brevity. Outside package scripts, run the local binary with `npx void`, `pnpm void`, `yarn void`, or `bunx void`. Keep Void installed in the project so the CLI and app use the same version.

## Run and deploy

### 1. Edit the generated API route

Database-backed starters include `routes/api/hello.ts`. You can edit its `GET` handler, or create this file if you started with Static Pages:

```ts
import { defineHandler } from 'void';

export const GET = defineHandler(() => {
  return { message: 'Hello from Void' };
});
```

### 2. Run locally

```sh
npm run dev
```

Then visit:

- App: `http://localhost:5173`
- API route: `http://localhost:5173/api/hello`

### 3. Deploy

If you chose a deployment target during setup, run:

```sh
void deploy
```

If you skipped deployment setup, select your Cloudflare account for the first deploy:

```sh
void deploy --platform cloudflare
```

Void opens your browser to sign in when needed. To use your team's platform, connect using the API URL from your administrator, then link a project and deploy:

```sh
void connect https://platform.example.com
void project link
void deploy
```

Void builds the app, provisions its resources, applies pending migrations, and prints the deployed URL. If a production secret is missing, [set it](./env-vars.md) and deploy again. Later deploys use the saved target.

See [Deployment](./deployment.md) for CI setup and rollback.

## Using with Coding Agents

`void init` detects your coding agent and installs its instructions and skills. If no agent is detected, use the bundled docs linked in `AGENTS.md`. In agents that support it, load the `/void` skill and describe the app you want to build. See [Coding Agents](../integrations/agents) for setup details.

## Meta Frameworks

Use Void's [Pages routing](./pages-routing/overview) or keep a framework such as TanStack Start, React Router, or SvelteKit. Follow the [framework guides](../integrations/frameworks/overview) for setup.

## Adding to an Existing Vite App

Install Void using the package manager command [above](#start-in-an-empty-directory).

Enable the plugin in `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import { voidPlugin } from 'void';

export default defineConfig({
  plugins: [voidPlugin()],
});
```

Then run `void init` with your package manager to configure the remaining project files.

## Troubleshooting pnpm installs

If a manual pnpm install reports blocked build scripts, run `pnpm approve-builds` for `esbuild`, `sharp`, and `workerd`. Set `better-sqlite3: false` in `pnpm-workspace.yaml`'s `allowBuilds`; Void uses its bundled binaries.

## Next steps

- To understand what kind of apps are supported: [Supported App Types](./app-types)
- [Server Routing](./server-routing): dynamic params, middleware, and validation
- [Database](./database): queries, migrations, and generated types
- [Type Safety](./type-safety): end-to-end typed fetch client
