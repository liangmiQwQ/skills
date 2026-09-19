---
outline: deep
---

# Quickstart

Let's create a Void app, run it locally, and deploy it. You can start in an empty directory or [add Void to an existing Vite app](#adding-to-an-existing-vite-app).

Use Node.js 24.21.0 or later. New projects pin the SDK's tested Workers
compatibility date, so the bundled local runtime can start them. An existing
compatibility date in your project is preserved.

## Start in an Empty Directory

Install Void in your project directory:

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

Then run the setup command:

With pnpm, you can also start with `pnpm create void my-app`; the scaffolder sets
up the required native build permissions before installing Void. If a manual
installation reports blocked build scripts, approve `esbuild`, `sharp`, and
`workerd` with `pnpm approve-builds`. Set `better-sqlite3: false` in
`pnpm-workspace.yaml`'s `allowBuilds`: Void uses version 13's bundled binaries,
so it does not need a native rebuild.

The setup install updates the pnpm lockfile to match the generated dependencies,
including when setup runs in CI. Later builds can use `pnpm install --frozen-lockfile`.

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

Void asks you to choose Vite+ or plain Vite, a UI framework, and a starter. Vite+ is the default. For a database app, D1 needs no local database server; PostgreSQL and MySQL are available if you want to use an external database. Static Pages starts with pages only.

Setup also asks where you want to deploy. Choose Cloudflare to use your own account, or Void to connect to your team's platform. You can skip this and decide later.

<details>
<summary style="cursor:pointer">
💡 <b>Notes on <code>void</code> binary usage</b>
</summary>

The docs use `void` for brevity. Because it's installed in your project, run it through your package manager outside package scripts: `npx void`, `pnpm void`, `yarn void`, or `bunx void`.

Alternatively, you can add `./node_modules/.bin` to your `PATH` so that you can invoke `void` directly when you are in the root directory of your app.

:::warning ⚠️ Prefer local install
Install `void` locally so the CLI and your app use the same version.
:::

</details>

## Using with Coding Agents

`void init` detects your coding agent and sets up the matching instructions and skills.

If auto-detection fails, `void init` asks you to choose from a short list (Claude, Cursor, Codex, Gemini CLI, Generic).

In agents that support it, use the `/void` skill to load the relevant guidance, then describe the app you want to build. See [Coding Agents](../integrations/agents) for setup details.

## Meta Frameworks

You can build pages directly with Void's [Pages routing](./pages-routing/overview), or keep an existing framework such as TanStack Start, React Router, or SvelteKit. Follow the [framework integration guides](../integrations/frameworks/overview) for framework-specific setup.

## Adding to an Existing Vite App

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

Enable the plugin in `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import { voidPlugin } from 'void';

export default defineConfig({
  plugins: [voidPlugin()],
});
```

Run setup to configure the remaining project files:

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

## Once You Have a Working App

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

### 3. Choose where to deploy

If you chose a deployment target during setup, you're ready. If you skipped it, run `void init` again or choose Cloudflare for the first deploy:

```sh
void deploy --platform cloudflare
```

Void opens your browser to sign in when needed. To use your team's platform, connect using the API URL from your administrator:

```sh
void connect https://platform.example.com
void project link
```

### 4. Deploy

With your target configured, run:

```sh
void deploy
```

Void builds the app, provisions the resources it uses, applies pending migrations, and prints the deployed URL. If it reports a missing production secret, [configure that secret](./env-vars.md) and deploy again.

Subsequent deploys use the same target. See [Deployment](./deployment.md) for CI setup, migrations, and rollback. To generate a supported push-to-deploy workflow, run `void init --github`.

## Next steps

- To understand what kind of apps are supported: [Supported App Types](./app-types)
- [Server Routing](./server-routing): dynamic params, middleware, and validation
- [Database](./database): queries, migrations, and generated types
- [Type Safety](./type-safety): end-to-end typed fetch client
