# Environment migration

Use `.env` for local development and remote secrets for server-side production values.

## 1. Back up and consolidate values

Before changing any dotenv files, securely back up the production values you need to migrate outside the project directory. Keep them out of Git. Do not delete the original files until the upload and verification in step 3 succeed.

Merge the values you still need locally into `.env`:

```text
.env.local
.env.development
.env.development.local
→ .env
```

Keep the legacy files for now. You will remove them in step 5, after migrating their values.

Ensure `.env` is ignored by Git:

```text
.env
```

## 2. Update `env.ts`

Remove `.secret()` and `.public()` from `env.ts` before running secret commands.

Change:

```ts
export default defineEnv({
  STRIPE_KEY: string().secret(),
  VITE_API_ORIGIN: url().public(),
});
```

to:

```ts
export default defineEnv({
  STRIPE_KEY: string(),
  VITE_API_ORIGIN: url(),
});
```

Server keys have no `VITE_` prefix; client keys do.

## 3. Upload server secrets

For managed Void projects, upload each non-client schema key:

```sh
void secret put DATABASE_URL
void secret put STRIPE_KEY
```

To migrate a production file in one pass, prepare a copy outside the project directory containing only server keys declared in `env.ts`, then upload it:

```sh
void secret sync /secure/path/production-secrets.txt
```

The sync command validates every entry against `env.ts`. It rejects undeclared names, invalid values, and client-prefixed names. Keep client-prefixed values for step 4 instead of including them in this file.

For direct Cloudflare deployments, select Cloudflare and use the same commands:

```sh
void connect --platform cloudflare
void secret put DATABASE_URL
void secret put STRIPE_KEY
```

After the upload succeeds, confirm that all expected server names appear in the remote store:

```sh
void secret list
```

If an upload fails or a name is missing, keep the source values and retry before continuing.

For direct Cloudflare deployments, remove the migrated server keys from `cloudflare.vars` in `void.config.ts` after confirming the upload. Void now treats any schema-declared server key in Worker `vars` as an error.

## 4. Set client build values

Move `VITE_*` production values to CI/build-shell variables, or make the value an explicit schema default:

```sh
export VITE_API_ORIGIN=https://api.example.com
```

Keep these variables set for the remote check and deployment in step 5. Client values are compiled into browser assets and are public.

These values are also available during server rendering. Do not upload them as remote secrets.

## 5. Remove old files and verify

Once the local values are in `.env`, the server values are uploaded and listed remotely, and the client values are available to the build, delete every `.env.*` file, `.env.example`, and `.dev.vars*` file from the project. Keep the secure backup until verification succeeds. Environment checks and deployment reject these old files.

Use `env.ts` as the checked-in list of names, types, defaults, and requiredness. `void env example` is no longer supported.

Then verify:

```sh
void env check
void env check --remote
void deploy
```
