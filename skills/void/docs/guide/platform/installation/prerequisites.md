---
outline: deep
---

# Prerequisites

Start with a Cloudflare account you can administer, an account with your chosen login provider, and an empty hosted PostgreSQL database. GitHub is the default and is optional when another method is selected. A domain is recommended. If yours is not ready, choose **Use workers.dev for testing** during installation and [add a domain later](/guide/platform/installation/domains#adding-a-domain). The steps below explain how to get the credentials the installer asks for.

Void creates the Workers, storage, queues, routing, and database tables through the CLI.

This setup has costs: Workers for Platforms requires a paid plan, and your database and Cloudflare usage have their own pricing. External PostgreSQL is required in either mode. Native single-app deployments remain Workers Free-compatible unless the app uses a paid-only product.

## Prepare Your Cloudflare Account and Domain

In the [Cloudflare dashboard](https://dash.cloudflare.com/), select the account where you want the platform to live:

1. Open **Workers for Platforms** and enable its plan. Review [Workers for Platforms pricing](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/platform/pricing/) before confirming.
2. Open **R2 Object Storage** and complete its activation. Void creates the bucket later.
3. For a domain installation, choose a domain you own, such as `example.app`. If you need one, register it with your preferred registrar. Use a spare domain's root: apps will be served at `my-app.example.app`. For workers.dev testing, skip this step and the DNS setup below.

If that domain is already in this Cloudflare account, use its existing zone. Otherwise, [add the domain to Cloudflare](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/) and follow the nameserver instructions until the zone is active. A zone is Cloudflare's DNS configuration for a domain; creating one does not buy the domain.

You can also let Void create the zone during installation. Setting it up now lets you scope the API tokens to that zone and finish installation without a DNS pause. The platform API uses `workers.dev` by default, so it needs no additional domain.

## Install the CLI and Preview

With Node.js 24.21.0 or later, install the CLI:

```sh
pnpm add --global void
void platform install --plan
```

Void checks your saved Cloudflare login while you enter the installation name. If sign-in is needed, it opens your browser after you submit the name; press Ctrl+C to cancel. The plan command then asks for the account and basic configuration and shows the resources it would create. It does not require the database or runtime secrets and does not change Cloudflare resources.

The installer first offers these choices, with the domain option selected:

```text
Where should your apps live?
  Use a domain — recommended
  Use workers.dev for testing — add a domain later
```

For a domain installation, use these answers. Testing mode skips the application domain, zone, and catch-all questions:

| Prompt                                  | Answer                                              |
| --------------------------------------- | --------------------------------------------------- |
| Installation name                       | A short name, such as `team`                        |
| Application base domain                 | Your domain, such as `example.app`                  |
| Cloudflare zone                         | The same domain                                     |
| Platform display name                   | Any name your team will recognize                   |
| Optional custom API hostname            | Leave empty to use `workers.dev`                    |
| Dedicate all unmatched traffic to Void? | Yes only if this whole zone belongs to the platform |

Platform resources use your installation name: `team` creates names such as `void-team-api`, `void-team-proxy`, and `void-team-routing`, with no random suffix. Use a different installation name for another platform in the same account. If a required resource already exists and belongs to another installation, Void stops without overwriting it. Existing installations keep their recorded resource names.

The preview shows the actual resource names and login callback URL that installation will use with the same configuration. It also links directly to the runtime-token form and the account's R2 token page. When you select GitHub login, it links to GitHub OAuth registration. It does not open credential setup pages or save an installation draft; Cloudflare browser login still opens when needed.

You can select either path directly:

```sh
void platform install --application-domain example.app --plan
void platform install --workers-dev --plan
```

`--workers-dev` cannot be combined with `--application-domain`, `--zone`, or `--dedicated-zone`.

## Create the Platform Database {#platform-database}

Use an empty PostgreSQL database dedicated to this platform. It stores users, projects, and deployments; individual apps can still use D1. Void creates the tables and the Hyperdrive connection, but does not provision the PostgreSQL server.

Void does not require a particular database provider. Use an existing PostgreSQL host or choose a service such as **PlanetScale Postgres**, **Neon**, **Supabase**, or others.

1. Create a fresh database or project dedicated to the platform, with no existing application tables. Use a database role that can create and manage its tables and schemas.
2. Open the provider's connection details and select the primary database. Use a direct connection or a session-mode pooler, not transaction pooling. The connection must work from both your computer and Cloudflare.
3. Copy the PostgreSQL connection URL, including the password and SSL settings, into your password manager. Paste only the URL—not a surrounding `psql` command—into Void's `PostgreSQL DATABASE_URL` prompt.

| Provider                                                                     | Connection setup                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [PlanetScale Postgres](https://planetscale.com/docs/postgres/connecting)     | Choose **Postgres**, not Vitess/MySQL. Open **Connect**, create role credentials, and use the direct primary connection on port `5432`, not PgBouncer on `6432`.                                                                                      |
| [Neon](https://neon.com/docs/get-started-with-neon/connect-neon)             | Open **Connect**, select the database and owner role, and turn **connection pooling off**.                                                                                                                                                            |
| [Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres) | Open **Connect** and use the direct connection where IPv6 is available, or the **Session pooler** on port `5432` for IPv4 connectivity. Do not select the transaction pooler on `6543`. Replace the password placeholder with your database password. |

For a dedicated Supabase project, [disable the Data API](https://supabase.com/docs/guides/api/securing-your-api#disable-the-data-api) so the platform's tables are not exposed through Supabase's auto-generated endpoints. Void uses the PostgreSQL connection, not Supabase API keys.

Once installation claims the database, continue using that same database for resume and maintenance commands. Uninstall never deletes external PostgreSQL.
