---
outline: deep
---

# PostgreSQL

Connect your PostgreSQL database through [Cloudflare Hyperdrive](https://developers.cloudflare.com/hyperdrive/), then use the same Drizzle schema and query workflow as D1.

## What is Hyperdrive?

Hyperdrive pools connections between your Worker and PostgreSQL. Requests reuse an existing connection instead of opening a new TCP and TLS connection each time.

Void can provision the Hyperdrive configuration from your connection string. Direct Cloudflare deploys also need an API token for first-time provisioning; see the [Cloudflare guide](../../integrations/cloudflare.md#databases-and-secrets).

## Configuration

### 1. Set the database

Add to your `void.json`:

```json
{
  "database": "pg"
}
```

### 2. Add your connection string

For local development, add `DATABASE_URL` to `.env`:

```
DATABASE_URL=postgresql://user:password@host:5432/mydb?sslmode=require
```

This connects directly to your Postgres database during local Vite development.

### 3. Deploy

When deploying to a Void platform, the CLI asks for a connection string if Hyperdrive isn't configured:

```
Your project uses PostgreSQL. Enter your connection string:
> postgresql://user:password@host:5432/mydb?sslmode=require
```

Void provisions Hyperdrive and records its config ID. The connection string isn't written to `wrangler.jsonc` or generated Worker config.
Both `postgres://` and `postgresql://` URLs are supported, including provider-supplied query strings such as `?sslmode=require`.

For a linked Void project, you can also configure the connection with `void db set-url`. For a direct Cloudflare deploy, export the production `DATABASE_URL` in your shell.

## Schema Definition

With the `postgresql` dialect, import schema helpers from `void/schema-pg` (re-exports from `drizzle-orm/pg-core`):

```ts
// db/schema.ts
import { pgTable, serial, text, timestamp, boolean, doublePrecision } from 'void/schema-pg';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('user'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

`void gen model` generates PostgreSQL-appropriate code when the dialect is set to `postgresql`.

## Migrations

The migration workflow is the same as D1:

```bash
# Generate migration files from schema changes
void db generate

# Apply pending migrations locally
void db migrate

# Check migration status
void db status
```

The main difference is that PostgreSQL supports **transactional DDL**. Each migration is wrapped in `BEGIN` and `COMMIT`, so a failure rolls back the whole migration instead of leaving the database half-updated.

## Deploy Workflow

When deploying a PostgreSQL project to a Void platform:

1. The app is built
2. Migration files are collected from `db/migrations/`
3. If Hyperdrive hasn't been provisioned yet, you're prompted for the connection string
4. Pending migrations run inside the deployed worker via Hyperdrive
5. The new worker goes live

When deploying to your own account with `void deploy --platform cloudflare`, export the production
connection string as `DATABASE_URL`. Void uses it to provision Hyperdrive and apply the checked-in
migrations transactionally before it uploads the Worker. The connection string is not written to
`wrangler.jsonc` or the generated Worker config.

## Updating the Connection String

To update a linked Void project's connection, for example after moving the database to another host:

```bash
void db set-url
```

This prompts for the new connection string and updates the Hyperdrive configuration. The change takes effect on the next deploy.
