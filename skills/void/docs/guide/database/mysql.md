---
outline: deep
---

# MySQL

Void supports MySQL through [Cloudflare Hyperdrive](https://developers.cloudflare.com/hyperdrive/). You bring a MySQL-compatible database; Void provides the Drizzle runtime, local tooling, migration workflow, and deployment wiring.

## Configure

Set the dialect in `void.json`:

```json
{
  "database": "mysql"
}
```

Add a direct connection for local development:

```dotenv
DATABASE_URL=mysql://user:password@host:3306/app
```

Void reads `.env` for `void dev` and `void db` commands. In production, the Worker connects through the inferred `HYPERDRIVE` binding.

## Define a schema

```ts
// db/schema.ts
import { int, mysqlTable, text, timestamp } from 'void/schema-mysql';

export const messages = mysqlTable('messages', {
  id: int('id').autoincrement().primaryKey(),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

`void gen model` generates MySQL builders automatically when the project uses the MySQL dialect.

## Migrations

Use the normal workflow:

```sh
void db generate
void db migrate
void deploy
```

For direct Cloudflare deploys, export the production `DATABASE_URL` in the shell running `void deploy --platform cloudflare`. Void uses it to provision Hyperdrive and apply pending checked-in migrations before uploading the Worker; it is not written to the Worker config.

::: warning MySQL DDL is not transactional
MySQL may implicitly commit schema changes. If a multi-statement migration fails partway through, earlier statements can remain applied even though Void does not record the migration as complete. Keep migrations small, review them before deploy, and make failed migrations safe to rerun after repairing the database.
:::

## Database commands

`void db push`, `generate`, `migrate`, `status`, `reset`, `seed`, `execute`, `studio`, `export`, `rename-migrations`, and `set-url` all understand MySQL. Local commands use `DATABASE_URL` from `.env`; `--remote` execution and Studio use the encrypted URL stored for a linked Void project.
