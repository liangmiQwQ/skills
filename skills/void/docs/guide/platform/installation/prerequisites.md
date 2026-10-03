---
outline: deep
---

# Prerequisites

To run a Void platform, you need:

- A Cloudflare account with Workers for Platforms and R2 enabled.
- An empty hosted PostgreSQL database.
- An account with your chosen login provider: GitHub, Google, OIDC, or Cloudflare Access.
- A domain for your apps, or `workers.dev` for testing. You can [add a domain later](/guide/platform/installation/domains#adding-a-domain).

Void creates the Workers, storage, queues, routing, and database tables through the CLI.

Workers for Platforms requires a paid plan. Your database and Cloudflare usage are billed separately.

## Prepare Your Cloudflare Account and Domain

In the [Cloudflare dashboard](https://dash.cloudflare.com/), select the account where you want the platform to live:

1. Open **Workers & Pages** once to let Cloudflare provision Workers for the account.
2. Open **Workers for Platforms** and enable its plan. Review [Workers for Platforms pricing](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/platform/pricing/) before confirming.
3. Open **R2 Object Storage** and complete its activation. Void creates the bucket later.
4. For a domain installation, choose a domain you own, such as `example.app`. If you need one, register it with your preferred registrar. Use a spare domain's root: apps will be served at `my-app.example.app`. For workers.dev testing, skip this step and the DNS setup below.

If that domain is already in this Cloudflare account, use its existing zone. Otherwise, [add the domain to Cloudflare](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/) and follow the nameserver instructions until the zone is active. A zone is Cloudflare's DNS configuration for a domain; creating one does not buy the domain.

You can also let Void create the zone during installation. Setting it up now lets you scope the API tokens to that zone and finish installation without a DNS pause. The platform API uses `workers.dev` by default, so it needs no additional domain.

## Install the CLI and Preview

With Node.js 24.21.0 or later, install the CLI:

```sh
pnpm add --global void
void platform install --plan
```

Sign in to Cloudflare when prompted, then choose an installation name and account. `--plan` previews the resources without changing them or requiring runtime secrets. Completed plans save your choices locally. Run `void platform install` again to select a saved plan; Void checks the current Cloudflare state before asking you to apply it.

For a domain installation, use these answers. Testing mode skips the application domain, zone, and catch-all questions:

| Prompt                                  | Answer                                              |
| --------------------------------------- | --------------------------------------------------- |
| Installation name                       | A short name, such as `team`                        |
| Application base domain                 | Your domain, such as `example.app`                  |
| Cloudflare zone                         | The same domain                                     |
| Platform display name                   | Any name your team will recognize                   |
| Optional custom API hostname            | Leave empty to use `workers.dev`                    |
| Dedicate all unmatched traffic to Void? | Yes only if this whole zone belongs to the platform |

Choose an unused installation name in your account. For example, `team` creates resources such as `void-team-api` and `void-team-proxy`.

The preview lists the credentials you will need. Review [Credentials](/guide/platform/installation/credentials), then run the install command printed at the end. The guided installation provides setup links and the login callback when needed.

You can select either path directly:

```sh
void platform install --application-domain example.app --plan
void platform install --workers-dev --plan
```

`--workers-dev` cannot be combined with `--application-domain`, `--zone`, or `--dedicated-zone`.

## Create the Platform Database {#platform-database}

Use an empty PostgreSQL database dedicated to this platform. It stores users, projects, and deployments; individual apps can still use D1. Void creates the tables and the Hyperdrive connection, but does not provision the PostgreSQL server.

Use any PostgreSQL provider that accepts connections from your computer and Cloudflare:

1. Create a fresh database or project dedicated to the platform, with no existing application tables. Use a database role that can create and manage its tables and schemas.
2. Open the provider's connection details and select the primary database. Use a direct connection or a session-mode pooler, not transaction pooling. The connection must work from both your computer and Cloudflare.
3. Copy the PostgreSQL connection URL, including the password and SSL settings, into your password manager. Paste only the URL—not a surrounding `psql` command—into Void's `PostgreSQL DATABASE_URL` prompt, as the provider gives it, including SSL settings such as `sslmode=verify-full`. A Hyperdrive that Void creates trusts only public certificate authorities, so if your database uses a private certificate authority, use a separately managed Hyperdrive, as described below.

| Provider                                                                     | Connection setup                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [PlanetScale Postgres](https://planetscale.com/docs/postgres/connecting)     | Choose **Postgres**, not Vitess/MySQL. Open **Connect**, create role credentials, and use the direct primary connection on port `5432`, not PgBouncer on `6432`.                                                                                      |
| [Neon](https://neon.com/docs/get-started-with-neon/connect-neon)             | Open **Connect**, select the database and owner role, and turn **connection pooling off**.                                                                                                                                                            |
| [Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres) | Open **Connect** and use the direct connection where IPv6 is available, or the **Session pooler** on port `5432` for IPv4 connectivity. Do not select the transaction pooler on `6543`. Replace the password placeholder with your database password. |

For a dedicated Supabase project, [disable the Data API](https://supabase.com/docs/guides/api/securing-your-api#disable-the-data-api) so the platform's tables are not exposed through Supabase's auto-generated endpoints. Void uses the PostgreSQL connection, not Supabase API keys.

Once installation claims the database, continue using that same database for resume and maintenance commands. Uninstall never deletes external PostgreSQL.

### Use an existing Hyperdrive

The installer can create Hyperdrive for you or use one you manage separately. For an existing configuration:

1. Point it at the dedicated platform database using a runtime user, and disable SQL result caching.
2. Select it in the installer and review the database, host, port, and runtime user.
3. Supply a database owner connection at the PostgreSQL URL prompt so Void can apply migrations.

To create one first, choose **Set up a separately managed Hyperdrive** and follow the printed instructions or [Cloudflare’s setup guide](https://developers.cloudflare.com/hyperdrive/get-started/). Rerun the installer once it is ready. Void leaves its configuration under your control. For unattended setup, use the Hyperdrive variables in [Install from CI](/guide/platform/installation/ci).
