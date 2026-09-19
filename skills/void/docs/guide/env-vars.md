# Environment variables

Void uses one schema, one local dotenv file, and one production rule:

- `env.ts` declares every application environment variable.
- `.env` supplies local development values only. It is never deployed.
- Production server values live in the platform's encrypted secret store.
- Client-prefixed values are embedded at build time, so they are public by definition.

This removes the distinction between “plain” and “secret-looking” server variables. Every server variable uses the same secure production path.

## Define the schema

Create `env.ts` at the project root:

```ts
import { defineEnv, number, string, url } from 'void/env';

export default defineEnv({
  DATABASE_URL: url(),
  STRIPE_KEY: string(),
  PORT: number().default(3000),
  VITE_API_ORIGIN: url(),
});
```

Void generates `.void/env.d.ts`, validates values, and provides the typed `env` proxy:

```ts
import { env } from 'void/env';

const databaseUrl = env.DATABASE_URL;
```

The built-in helpers are `string()`, `number()`, `boolean()`, `url()`, `email()`, `oneOf([...])`, and `json<T>()`. They support `.optional()` and `.default(value)`. Any [Standard Schema](https://standardschema.dev/) validator can also be used directly.

Defaults are source-code constants. They are appropriate for non-sensitive fallback behavior; do not put credentials in a default.

## Local development

Put local values in a single root `.env` file:

```ini
DATABASE_URL=postgres://localhost/my-app
STRIPE_KEY=sk_test_example
VITE_API_ORIGIN=http://localhost:5173
```

`.env` should be gitignored. Void rejects legacy `.env.local`, `.env.development`, `.env.production`, `.env.example`, other `.env.*` files, and Wrangler `.dev.vars*` files so there is no hidden precedence order.

Run the local check at any time:

```sh
void env check
```

Local database, migration, auth, and dev-server tooling all read the same `.env` file. Shell values override it.

## Production server values

Every schema key that is not client-prefixed is a server value. Set it remotely:

```sh
void secret put DATABASE_URL
void secret put STRIPE_KEY
```

For bulk upload, prepare a dotenv-formatted file containing only production server values:

```sh
void secret sync production-secrets.txt
```

`void secret put` and `void secret sync` validate the plaintext against `env.ts` before upload. The remote store encrypts the accepted value and only returns its name later, so subsequent deploy checks can prove presence but cannot re-read the plaintext. The worker validates the real value again at runtime.

Client-prefixed keys are rejected by secret commands. Keep local development credentials and `VITE_*` values out of the production secrets file.

`void deploy` never adds `.env` values to its manifest. It requires every required server key to exist remotely before upload.

For direct Cloudflare deployment, select Cloudflare and use the same Void commands:

```sh
void connect --platform cloudflare
void secret put DATABASE_URL
void secret put STRIPE_KEY
void deploy --platform cloudflare
```

Void stores the values as encrypted Worker secrets, emits the required server names through `secrets.required`, and refuses to deploy a schema-declared server key as a plaintext Worker `vars` entry.

## Client values

Keys beginning with `VITE_` are client values. This boundary is fixed, so the CLI, build, and secret commands always classify a name the same way even when a framework customizes Vite's own `envPrefix`.

Client values are embedded in browser JavaScript and are never secrets. Supply them through the build shell or use a schema default:

```sh
VITE_API_ORIGIN=https://api.example.com void deploy
```

```ts
export default defineEnv({
  VITE_API_ORIGIN: url().default('https://api.example.com'),
});
```

Builds ignore client values from `.env`; this prevents a developer's local value from silently becoming production configuration.

The server bundle embeds those same public build values. Worker boot validation and server-side `env.VITE_*` reads use them without requiring remote secrets, keeping server rendering consistent with the browser. Server-only keys still come from runtime bindings and are validated at boot.

Prerender path discovery can read route metadata without the deployed server secrets. Application requests, readiness checks, and actual page rendering still validate the runtime environment; a path generator that reads a required secret must have that value available.

## Validation and redaction

```sh
void env check           # validate .env + shell for local development
void env check --remote  # validate build-time client values and remote server names
void env types           # regenerate .void/env.d.ts
```

Invalid-value diagnostics redact the supplied value by default. Set `VOID_ENV_UNMASK=1` only for deliberate local debugging; Void prints a notice when redaction is disabled.

There are no `.secret()` or `.public()` schema modifiers. Storage now follows the server/client boundary, and diagnostics follow one redaction rule.

## Imports inside `env.ts`

Void loads `env.ts` through Node's native `import()` before Vite transforms application code. Use relative imports or package names for schema helpers and shared constants. TypeScript path aliases and imports requiring custom Vite transforms are not supported in this file.

## Migrating from the multi-file model

See [Environment migration](/guide/env-migration) for the breaking-change checklist.
