---
outline: deep
---

# Install a Void Platform

A Void platform lets your team deploy apps into a shared Cloudflare account. As an administrator, you install and maintain the platform. Developers connect the Void CLI to its URL, sign in through an enabled login method, and deploy their apps.

If you're deploying an app for yourself, [deploy directly to Cloudflare](../integrations/cloudflare.md#deploy-to-your-own-cloudflare-account). You don't need to install a platform first.

The core platform supports GitHub, Google, generic OIDC, and Cloudflare Access login, CLI deploys, D1, KV, R2, Queues, cron jobs, Workers AI, WebSockets, SSE, ISR, routing, logs, and rollback.

The core installation includes an email gateway; email is enabled when you configure a shared mail domain and zone. The user dashboard, GitHub builds and webhooks, build Containers, custom project domains, and sandbox orchestration aren't part of the core installation. Source-built platforms that add the optional GitHub services should follow the [isolated webhook ingress setup](./platform-development.md#optional-github-webhook-ingress-for-access-protected-apis) when Access protects the API.

## Before You Start {#prerequisites}

Start with a Cloudflare account you can administer, an account with your chosen login provider, and an empty hosted PostgreSQL database. GitHub is the default and is optional when another method is selected. A domain is recommended. If yours is not ready, choose **Use workers.dev for testing** during installation and [add a domain later](#add-a-domain-later). The steps below explain how to get the credentials the installer asks for.

Void creates the Workers, storage, queues, routing, and database tables through the CLI.

This setup has costs: Workers for Platforms requires a paid plan, and your database and Cloudflare usage have their own pricing. External PostgreSQL is required in either mode. Native single-app deployments remain Workers Free-compatible unless the app uses a paid-only product.

## 1. Prepare Your Cloudflare Account and Domain

In the [Cloudflare dashboard](https://dash.cloudflare.com/), select the account where you want the platform to live:

1. Open **Workers for Platforms** and enable its plan. Review [Workers for Platforms pricing](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/platform/pricing/) before confirming.
2. Open **R2 Object Storage** and complete its activation. Void creates the bucket later.
3. For a domain installation, choose a domain you own, such as `example.app`. If you need one, register it with your preferred registrar. Use a spare domain's root: apps will be served at `my-app.example.app`. For workers.dev testing, skip this step and the DNS setup below.

If that domain is already in this Cloudflare account, use its existing zone. Otherwise, [add the domain to Cloudflare](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/) and follow the nameserver instructions until the zone is active. A zone is Cloudflare's DNS configuration for a domain; creating one does not buy the domain.

You can also let Void create the zone during installation. Setting it up now lets you scope the API tokens to that zone and finish installation without a DNS pause. The platform API uses `workers.dev` by default, so it needs no additional domain.

## 2. Install the CLI and Preview {#preview-the-installation}

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

The preview shows the actual resource names and GitHub callback URL that installation will use with the same configuration. It also links directly to the runtime-token form, the account's R2 token page, and GitHub OAuth registration. It does not open credential setup pages or save an installation draft; Cloudflare browser login still opens when needed.

You can select either path directly:

```sh
void platform install --application-domain example.app --plan
void platform install --workers-dev --plan
```

`--workers-dev` cannot be combined with `--application-domain`, `--zone`, or `--dedicated-zone`.

## 3. Create the Platform Database {#platform-database}

Use an empty PostgreSQL database dedicated to this platform. It stores users, projects, and deployments; individual apps can still use D1. Void creates the tables and the Hyperdrive connection, but does not provision the PostgreSQL server.

Void does not require a particular database provider. Use an existing PostgreSQL host or choose a service such as **Neon**, **PlanetScale Postgres**, **Supabase**, or others.

1. Create a fresh database or project dedicated to the platform, with no existing application tables. Use a database role that can create and manage its tables and schemas.
2. Open the provider's connection details and select the primary database. Use a direct connection or a session-mode pooler, not transaction pooling. The connection must work from both your computer and Cloudflare.
3. Copy the PostgreSQL connection URL, including the password and SSL settings, into your password manager. Paste only the URL—not a surrounding `psql` command—into Void's `PostgreSQL DATABASE_URL` prompt.

| Provider                                                                     | Connection setup                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Neon](https://neon.com/docs/get-started-with-neon/connect-neon)             | Open **Connect**, select the database and owner role, and turn **connection pooling off**.                                                                                                                                                            |
| [PlanetScale Postgres](https://planetscale.com/docs/postgres/connecting)     | Choose **Postgres**, not Vitess/MySQL. Open **Connect**, create role credentials, and use the direct primary connection on port `5432`, not PgBouncer on `6432`.                                                                                      |
| [Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres) | Open **Connect** and use the direct connection where IPv6 is available, or the **Session pooler** on port `5432` for IPv4 connectivity. Do not select the transaction pooler on `6543`. Replace the password placeholder with your database password. |

For a dedicated Supabase project, [disable the Data API](https://supabase.com/docs/guides/api/securing-your-api#disable-the-data-api) so the platform's tables are not exposed through Supabase's auto-generated endpoints. Void uses the PostgreSQL connection, not Supabase API keys.

Once installation claims the database, continue using that same database for resume and maintenance commands. Uninstall never deletes external PostgreSQL.

## 4. Prepare Credentials

Keep one password-manager entry for this platform. Paste the saved values into the installer when asked; most do not need shell environment variables.

### Cloudflare API Tokens {#runtime-token-permissions}

For a domain installation, create two custom tokens using Cloudflare's [API token setup](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/). Name them **Void Platform Management** and **Void Platform Runtime**. Scope them to your selected account and application zone.

For workers.dev testing with the default API hostname, browser login can authorize installation: you only need to create the runtime token and R2 credentials below. Skip the zone permissions until you add a domain.

Browser login does not grant AI Gateway access. A preview can therefore show **inspect ai-gateway**: Void verifies that resource with the runtime token after you confirm installation, before creating any resources. Include **Account → AI Gateway → Edit** on that token. Other infrastructure continues using your browser login, and a normal API-token installation keeps using its management token when that token already has access.

The management token lets your CLI install and maintain the platform. The runtime token is stored as a Worker secret so the platform can deploy apps after you close your terminal. They are separate credentials.

The runtime-token link preselects all required account permissions, including Workers Tail, Hyperdrive, and AI Gateway when needed. Review them against the short summary beside the link before creating the token. If the form differs, use that summary to correct it. For a domain installation, also select the indicated zone. See [Cloudflare's token template documentation](https://developers.cloudflare.com/fundamentals/api/how-to/account-owned-token-template/).

::: details Permissions to select for each token

Use the following permissions for the core platform. Cloudflare may label write access as **Edit** or **Write**, depending on the token screen; see its [permission reference](https://developers.cloudflare.com/fundamentals/api/reference/permissions/).

| Scope   | Permission         | Management | Runtime                                 |
| ------- | ------------------ | ---------- | --------------------------------------- |
| Account | Account Settings   | Read       | Read                                    |
| Account | Workers Scripts    | Edit       | Edit                                    |
| Account | Workers Tail       | Read       | Read                                    |
| Account | D1                 | Edit       | Edit                                    |
| Account | Workers KV Storage | Edit       | Edit                                    |
| Account | Workers R2 Storage | Edit       | Edit                                    |
| Account | Queues             | Edit       | Edit                                    |
| Account | Hyperdrive         | Write      | Write                                   |
| Account | Account Analytics  | Read       | Read                                    |
| Account | AI Gateway         | Edit       | Edit when installing with browser login |
| Zone    | Zone               | Read       | —                                       |
| Zone    | DNS                | Edit       | —                                       |
| Zone    | Workers Routes     | Edit       | —                                       |
| Zone    | Cache Purge        | —          | Purge                                   |

The management token also needs **Zone Edit** with authority to create zones if you ask Void to create the zone. If it already exists, use the selected zone with Zone Read and DNS Edit. Nested application domains additionally need **SSL and Certificates: Read** on the management token. A custom runtime that enables custom project domains needs **SSL and Certificates: Edit** on the runtime token; the core runtime does not enable that feature.

Enabling email lets administrators [register email domains for projects](./platform-administration.md#registering-email-domains-for-projects) and lets projects register destination addresses through the runtime token. That needs **Email Routing Addresses: Edit** and **Email Sending: Edit** on the account, plus **Zone: Read**, **Zone Settings: Edit** and **Email Routing Rules: Edit** on the zones that will carry mail; the token link preselects them when email is enabled. Email Sending onboarding itself needs Workers Paid on the account.

To enable email, set `VOID_EMAIL_SENDER_DOMAIN` to the shared sender domain and `VOID_EMAIL_SHARED_ZONE_ID` to its Cloudflare zone ID when installing or upgrading. Void records both values for later upgrades and rejects attempts to replace them during an ordinary upgrade. The mail zone can differ from the application zone, but it must belong to the selected platform Cloudflare account; without an explicit mail-zone identity, shared inbound delivery stays unavailable. The dedicated email gateway is deployed in the platform account. Each customer zone uses its own ingress Worker to forward mail to that gateway.

The installer prepares the shared mail route and verifies inbound readiness before it opens platform traffic. If that setup fails, the installation remains disabled. Correct the reported Cloudflare permission, mail-zone configuration, or routing conflict, then rerun the same install or upgrade command; a fresh install resumes with `void platform install --resume --name <installation-id>`.

Void checks access before provisioning. If it reports a missing permission, update the token's permissions for the selected account or zone and retry.

:::

### R2 Upload Credentials

The installer opens the **R2 token creation** form directly, requesting an account token (or a user token if your role cannot create account tokens). Select **Object Read & Write**—the form starts with read-only access—and keep **Apply to all buckets in this account (including newly created buckets)** selected. This lets the token access the buckets Void creates afterward. Create the token and save its **Access Key ID** and **Secret Access Key**. These are different from the management/runtime tokens above. See [R2's token instructions](https://developers.cloudflare.com/r2/api/tokens/).

### Signing and Encryption Keys {#signing-and-encryption-keys}

The **JWT signing key** signs platform login tokens. The **Project encryption key** encrypts app secrets stored by your platform. Generate a separate key for each by running this command twice:

```sh
openssl rand -base64 32
```

Save each result in your password manager, then paste it into the corresponding installer prompt. The command generates 32 random bytes encoded as base64, suitable for either field. Keep the two original keys for recovery; do not regenerate them when resuming or upgrading.

::: details Generate the keys without printing them to your terminal

On macOS, this copies a suitable random value to the clipboard:

```sh
openssl rand -base64 32 | pbcopy
```

Paste it into your password manager as **JWT signing key**. Run the command again and save the second value as **Project encryption key**. On PowerShell, use `Set-Clipboard` instead of `pbcopy`. If OpenSSL is unavailable, use your secret manager's secure generator for 32 random bytes in base64, or `node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64"))'`.

:::

When email is enabled, Void also creates an independent **Email signing key** for confirmation links and service-to-service email requests. The installer keeps it in encrypted recovery state. Set `VOID_PLATFORM_EMAIL_SIGNING_SECRET` to a separate value of at least 32 random bytes when you need an externally custodied copy, including a headless installation whose local recovery files will not persist.

## 5. Install and Connect GitHub {#install}

For workers.dev testing, start the interactive install and continue to the GitHub setup below:

```sh
void platform install --workers-dev
```

For a domain installation, the management token is the one value the interactive installer needs in the shell. Browser login cannot create the application's DNS record. In Bash or zsh, read the token without displaying it or putting its value in command history:

```sh
printf 'Cloudflare management API token: '
read -rs CLOUDFLARE_API_TOKEN
printf '\n'
export CLOUDFLARE_API_TOKEN
void platform install
```

::: details PowerShell equivalent

```powershell
$env:CLOUDFLARE_API_TOKEN = [System.Net.NetworkCredential]::new('', (Read-Host 'Cloudflare management API token' -AsSecureString)).Password
void platform install
```

:::

Use the same name, account, and domain as the preview, then confirm the installation plan. Void saves a local setup draft and opens the runtime-token page when that token is missing. Paste the token into the masked prompt. As you continue, it opens GitHub and R2 at their respective steps. Each page has a short checklist and a clickable fallback link in the terminal. Values already supplied through the environment or saved setup are reused without opening their pages again.

### Choose login methods {#configure-github-oauth}

The installer offers GitHub, Google, generic OIDC, and Cloudflare Access login.
Cloudflare Access protection is a separate choice from Access login. The
GitHub-only setup below retains the existing workflow.

For Google, create an OAuth client and register the printed callback URL. You
can restrict it to named Google Workspace domains. For OIDC or Access login,
provide the issuer URL, client ID, and client secret. Select **Company-approved
users** when the configured company policy should allow colleagues to create
accounts automatically without individual invitations.

When using the configurable setup, installation prints a one-time setup code
and a `/setup` URL. Enter the code, authenticate with the chosen administrator
method, and review the identity before confirming its administrator role. That
method becomes enabled; additional selected methods are saved as pending
configurations to test and enable in Settings. No GitHub account is required
for a Google-only or OIDC-only installation.

For scripts, pass `--auth-config <path>` with nonsecret configuration and
environment-variable references for secrets. For example:

```json
{
  "connections": [
    {
      "configuration": {
        "id": "google",
        "kind": "google",
        "label": "Company Google",
        "clientId": "your-google-client-id",
        "allowedDomains": ["example.com"]
      },
      "clientSecretEnv": "GOOGLE_CLIENT_SECRET"
    }
  ],
  "administratorConnectionId": "google",
  "admission": {
    "mode": "company",
    "connections": ["google"],
    "access": false
  }
}
```

`--plan` reads this configuration without requiring the referenced secret.
Supply the secret through your secret manager when applying the installation.

#### Cloudflare Access {#cloudflare-access-setup}

Choose Access login, platform protection, or both. Protection can also be used
with GitHub or another login method. With company-approved signup, a colleague
who passes the company gate can create an ordinary account using GitHub even
when their GitHub email differs from their company email.

Automatic setup uses an existing Zero Trust organization, selected identity
providers, and existing company policies. Void creates dedicated applications
and a scoped service token for protected installation checks. It preserves your
company policies, including device and MFA requirements.

The setup credential needs **Access: Apps and Policies Write** and
**Access: Organizations, Identity Providers, and Groups Read** in the identity
account. Creating protection also needs **Access: Service Tokens Write**.
Provide a separate setup token through `VOID_PLATFORM_ACCESS_SETUP_TOKEN` if
your Cloudflare management credential lacks these permissions. These permissions
are not required by the platform's runtime token. See Cloudflare's
[Access API](https://developers.cloudflare.com/api/resources/zero_trust/subresources/access/subresources/applications/)
and [service-token permissions](https://developers.cloudflare.com/api/resources/zero_trust/subresources/access/subresources/service_tokens/methods/create/).

To automate Access setup, add this to the authentication configuration file:

```json
{
  "protection": true,
  "cloudflareAccess": {
    "mode": "create",
    "identityProviderIds": ["your-company-identity-provider-id"],
    "policyIds": ["your-company-allow-policy-id"]
  }
}
```

Keep the file's `connections` list from the example above, or use a connection
with `{"id":"access","kind":"cloudflare-access","label":"Company Access"}`
to create Access login as well. Omit `protection` for login-only setup.

To connect applications managed elsewhere, select **Connect existing applications**.
Scripts use `mode: "existing"`, optional `accountId`, and `loginApplicationId`
and/or `protectionApplicationId`. For login, set `loginClientSecretEnv`. For
protection, supply `serviceToken` with `id`, `clientIdEnv`, and `clientSecretEnv`
for a token already admitted by the application. The selected policies must
cover both printed API and proxy origins. Connecting existing resources needs
read access to their applications, policies, organization, identity providers,
groups, and service tokens; Void leaves their policies unchanged.

Access login alone can connect to another account using only its issuer, client
ID, and secret, without a `cloudflareAccess` block or Cloudflare management token.
Follow Cloudflare's [OIDC application guide](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/saas-apps/generic-oidc-saas/)
and register the exact callback printed by Void.

For the default GitHub-only setup:

1. The installer opens [GitHub's new OAuth App form](https://github.com/settings/applications/new) when it needs OAuth credentials. Sign in as the account that will own the login integration.
2. Set **Application name** to your platform's display name and **Homepage URL** to the API URL Void just printed.
3. Set the **Redirect URI** (also called **Authorization callback URL**) to the exact printed URL ending in `/auth/callback`, then register the application. This URL is now pinned in your saved draft and remains the same if credential setup is interrupted.
4. Save the **Client ID**, generate a **Client Secret**, and save that too. GitHub's [registration guide](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app) describes the form.

This OAuth App handles sign-in. A GitHub App with repository access and build webhooks is not required for the core platform.

The prompts collect the runtime token, administrator GitHub username, PostgreSQL URL, GitHub client ID and secret, R2 credentials, and signing/encryption keys. Secret values are masked and setup progress is encrypted locally using the system keychain. Keep a password-manager copy for recovery on another machine.

Void shows installation progress while it prepares the database, provisions Cloudflare resources, deploys the services, and verifies platform health. Progress is checkpointed for recovery. When installation finishes, open the printed admin dashboard link and sign in with the GitHub account you selected as administrator. This creates your first admin user; no app or CLI login is required. Void also prints the API URL to use when you [connect and deploy an app](#connect-and-deploy-an-app).

Remove the management token from the shell when finished:

```sh
unset CLOUDFLARE_API_TOKEN
```

In PowerShell, use `Remove-Item Env:CLOUDFLARE_API_TOKEN`. Keep the saved token for future maintenance.

::: details If setup pauses for DNS or is interrupted

If Void created a zone, it stops in `waiting-for-dns` and prints nameservers. Set those at your registrar, wait for the zone to become active, then resume using the installation ID printed by Void:

```sh
void platform install --resume --name <installation-id>
```

Keep the management token available for any remaining DNS changes. When using a source build, also pass the same `--runtime` directory. Resume uses the saved checkpoint and original secrets; do not start a second installation or generate replacement keys. If setup failed before a checkpoint was saved, rerun the original command.

If setup stops or fails, rerun `void platform install`. It lists unfinished installations, including those that reached provisioning, and offers **Continue setup** or **Start a new platform install**. Entering an existing unfinished name also asks whether to resume it; declining lets you enter another name. Continuing restores your saved answers and checkpoints. Starting new does not reuse or delete previous credentials or resources. `--resume --name <id>` continues directly and is required for non-interactive recovery. Read-only `--plan` runs do not save drafts. Completed platforms are managed with `platform status`, `repair`, or `upgrade`, not reinstalled.

If Cloudflare rejects a saved runtime token during continued credential setup, Void opens the token page and asks for a replacement in the same run. Network or service failures do not discard saved tokens. Tokens supplied through the environment must be corrected there instead.

:::

## 6. Verify and Deploy Your First App {#connect-and-deploy-an-app}

First verify the new platform and sign in as the GitHub administrator you chose:

```sh
void platform status
void platform auth login
void platform system health
```

Administrator login is separate from the credentials used to deploy apps. In a new or unlinked Void app directory, connect using the installed API URL and deploy your first project:

```sh
void connect https://void-company-api.example.workers.dev
void deploy --platform void --project my-first-app
```

`void connect` validates the platform and signs you in when needed. Confirm project creation when deploy asks. To use a project that already exists, run `void project link` instead. An app already linked to another platform keeps its existing destination; use a fresh app directory for your first test.

The CLI stores login credentials in your system keychain, separately for each platform URL. With no URL, `void connect` offers Cloudflare or a Void platform; `void connect --platform void` offers saved platforms and an option to enter another URL.

For CI, create a bounded, project-scoped deploy credential while signed in as
the project owner:

```sh
void project token create --name ci --expires-in 30
```

Store the printed `VOID_TOKEN` and `VOID_API_URL` in the CI secret manager, then
use `void connect <url> --no-login` in a fresh checkout if connection metadata
is not committed. Rotate with `void project token renew <id>` and revoke with
`void project token revoke <id>`. A human login token is not a CI credential.

If Cloudflare Access protects the platform, Access proof and the project
credential are both required; the service token does not grant Void user or
operator authority. A deploy that uses prerendering or remote bindings calls
both the API and proxy, so store `VOID_ACCESS_CREDENTIALS` in the CI secret
manager with entries for both exact HTTPS origins. Include both entries even
when the same admitted service-token pair is used for both origins:

```json
{
  "https://void-company-api.example.workers.dev": {
    "CF_ACCESS_CLIENT_ID": "<service-token client ID>",
    "CF_ACCESS_CLIENT_SECRET": "<service-token client secret>"
  },
  "https://void-company-proxy.example.workers.dev": {
    "CF_ACCESS_CLIENT_ID": "<service-token client ID>",
    "CF_ACCESS_CLIENT_SECRET": "<service-token client secret>"
  }
}
```

`VOID_ACCESS_ORIGIN` can scope credentials to one origin only; setting it to
the API origin does not authorize proxy requests.

Use these commands to inspect connections and installations:

```sh
void platform list
void platform use [id]
void platform status [id]
```

## Managing Access

After installation, sign in with the GitHub account you chose as the first administrator:

```sh
void platform auth login
void platform signup allow github teammate
```

Void shows the proposed access change and asks you to confirm it. Once approved, `teammate` can connect to the platform's API URL and sign in with GitHub.

To see who can join, run `void platform signup show`. You can also allow an email address or a domain such as `*@example.com`. For an OIDC user without verified email, use `void platform signup allow identity <connection-id> <subject>`; the subject match is exact and the provider's domain or group restrictions still apply. Remove that grant with `void platform signup disallow identity <connection-id> <subject>`. `void platform signup open` permits public signup; `void platform signup restrict` requires an allowlist match again.

Your administrator session lasts for one hour. Use it to inspect users, projects, logs, and platform health. The [Platform Administration guide](./platform-administration.md) walks through those workflows, previews, and automation. You can also open `<API origin>/admin/login` to use the browser admin UI.

## Add a Domain Later

When your domain is ready, run:

```sh
void platform domain set example.app --plan
void platform domain set example.app
```

The command selects your installed platform (or offers a picker), finds or creates its zone, sets up DNS and routing, and verifies HTTPS before publishing the new application URLs. Set the management token as described [above](#install) when creating DNS or a zone. Grant the existing runtime token **Cache Purge: Purge** on the new zone; Void checks that permission through the running platform without asking you to paste its token again.

If nameservers or certificates are pending, follow the printed guidance and rerun the same command. Your workers.dev app URLs continue working during and after setup. Projects, deployments, secrets, and the platform API URL stay the same, so developers do not reconnect and the platform's GitHub OAuth callback does not change. DNS and configuration changes may take time to propagate.

Use `--installation <id>` to select an installation explicitly, `--zone example.com` for an app domain such as `apps.example.com`, or `--dedicated-zone` for catch-all routing on a dedicated zone. Nested domains still need the wildcard certificate described below. This command adds the first domain; replacing an existing application domain is not currently supported. It uses the installed runtime and does not require `--runtime` or an app redeploy.

Browser login sessions are specific to each origin. Apps using their own OAuth providers may need to register their new callback URLs. Void's built-in auth uses the request origin automatically unless the app overrides that configuration.

### What Changes in Testing Mode?

Each deployed app gets a small forwarding Worker and its own `workers.dev` origin. It forwards requests, including WebSockets and SSE, through the same platform router. Names include installation and project IDs; a later project with the same slug cannot inherit a deleted project's test URL.

Testing origins use shared ISR storage but bypass the extra edge response cache because you cannot use your zone's purge API for `workers.dev`. Custom-domain requests use the normal edge cache after activation. Existing test URLs and forwarding Workers are retained when you add a domain; new apps then use the domain without creating more forwarding Workers. Like other platform Workers, forwarders are retained for manual cleanup on uninstall; platform disablement and project suspension still apply to their traffic.

## Other Domain Options

::: details Custom API hostname

Pass `--control-plane-domain platform.example.net` during installation. The hostname must belong to a zone the selected account and management token can manage. Omitting it keeps the API on `workers.dev`.

:::

### Using a Nested Application Domain

::: details Use apps.example.com within an existing company zone

An app at `my-app.apps.example.com` needs a certificate for `*.apps.example.com`. Universal SSL for `example.com` only covers first-level hostnames. Configure an active wildcard certificate with [Advanced Certificate Manager](https://developers.cloudflare.com/ssl/edge-certificates/advanced-certificate-manager/), a paid add-on, or use an existing custom wildcard certificate before installation:

```sh
void platform install --application-domain apps.example.com --zone example.com --plan
```

The management token needs **SSL and Certificates: Read** (or Edit) on that zone for the certificate check. Void does not order certificates or enable paid products automatically. Leave `--dedicated-zone` off: that flag is only for installations whose application domain is the entire zone and adds catch-all routes for otherwise unmatched traffic.

:::

## Cloudflare footprint

Resources use a `void-<installation-name>-<random-suffix>-*` prefix where Cloudflare allows names. This keeps installations recognizable and avoids predictable Worker names colliding during setup.

| Resource                                  |                                 Count | Purpose                                                                                       |
| ----------------------------------------- | ------------------------------------: | --------------------------------------------------------------------------------------------- |
| Workers                                   | 5, plus one per app using workers.dev | API/control plane, proxy, tail ingestion, dispatch, email gateway, and test-origin forwarders |
| KV namespaces                             |                                     3 | Routing, ISR cache, and static asset storage                                                  |
| R2 buckets                                |                                     1 | Static and deployment assets                                                                  |
| Queues                                    |                                     2 | Usage events and cron firing                                                                  |
| Workers for Platforms dispatch namespaces |                                     1 | User application Workers                                                                      |
| Hyperdrive configurations                 |                                     1 | External platform PostgreSQL                                                                  |
| AI Gateways                               |                                     1 | Installation-isolated AI routing and metering                                                 |
| Proxied wildcard DNS records              |                                0 or 1 | Created only when an application domain is configured                                         |
| Zones                                     |                                0 or 1 | Created only when the requested application zone is absent                                    |

The API Worker uses four Durable Object classes for usage, cron scheduling, error monitoring, and concurrency. Worker bindings create the request and log datasets in Analytics Engine. The core installation doesn't create Container applications, a GitHub App, a dashboard Worker, or build Workers.

## Resume, repair, recover, and upgrade

You can omit an installation ID when only one is configured. With several installations, choose one interactively or pass its ID in CI.

### Resume an installation

If setup stops or fails, continue from the saved progress:

```sh
void platform install --resume --name <id>
```

You can correct the database URL if the initial connection failed. Once Void has claimed the database or provisioned Hyperdrive, that database is fixed for the installation. A later command with a different URL stops before making changes.

### Cloudflare Access blocks the health check {#cloudflare-access}

If installation reports **Default-Deny (error 1050)**, Cloudflare blocked the HTTP health check before it reached Void. This is separate from the API token used to deploy the Workers.

Keep the company protection in place. Automatic Access setup saves its scoped
service credentials with the installation's encrypted recovery material. For an
existing gate, verify that its service policy admits the installation token and
that the application covers the printed API and proxy origins. A Cloudflare
management API token does not authenticate an Access-protected HTTP request.

For externally supplied credentials, set `VOID_ACCESS_CREDENTIALS` from your
secret manager to an object keyed by each exact API/proxy origin, with
`CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` in each entry. Then rerun
`void platform install --resume --name <id>`. Void retains the saved resources
and stops if the gate still rejects its checks. Account-wide Default-Deny and
deployed-application policies remain your responsibility.

### Expired administrator setup code

Resume an unfinished installation with `void platform install --resume --name <id>`.
For completed provisioning whose administrator setup is still pending, run
`void platform repair <id>`. Void prints a fresh setup code if the earlier code
expired. Enter it at `/setup`, sign in, and confirm the displayed identity.
An installation that already has an administrator does not reopen setup.

### Repair missing resources

Preview what needs repair, then apply it:

```sh
void platform repair [id] --plan
void platform repair [id]
```

Repair recreates missing infrastructure that the installer owns. It does not restore PostgreSQL rows or data stored in provider resources. If an adopted or external resource is missing, restore it yourself before continuing. A disabled platform stays disabled through repair and upgrade.

### Upgrade the platform

Use the installed CLI's packaged runtime to upgrade:

```sh
void platform upgrade [id] --plan
void platform upgrade [id]
```

An upgrade validates the runtime, applies supported pending migrations, deploys the Workers, and checks their health. Existing Worker secrets are preserved.

::: details Migration safety, credential rotation, and interrupted upgrades

Some upgrades briefly put the platform into maintenance mode. Traffic resumes after the new version passes health checks. If an upgrade is interrupted during maintenance, rerun the same command to complete it.

To update the runtime Cloudflare token, GitHub OAuth credentials, or R2 credentials,
provide their `VOID_PLATFORM_*` environment variables when running the upgrade.
Only the supplied values replace live credentials. Recovery data from an older
workstation does not overwrite them, and upgrades preserve the live signing keys
and complete project-encryption keyring. Keep current credentials in your secret
manager so they can also restore a missing Worker during repair.

Database migrations only move forward. Void checks compatibility before upgrading and tells you if an intermediate release is needed. If deployment fails, it attempts to restore the previous Workers against the compatible database schema. Retrying does not repeat completed migrations.

If an upgrade asks you to finish Sandbox cleanup, follow the [`sandbox-drain` instructions](../reference/cli.md#operator-system), then rerun the upgrade. Administrator login remains available during that maintenance step.

After a successful upgrade, you can restore a declared-compatible earlier runtime without reversing migrations:

```sh
void platform rollback [id] --runtime /path/to/earlier/runtime --plan
void platform rollback [id] --runtime /path/to/earlier/runtime
```

Keep the earlier runtime files if you need rollback. If the installed version is a custom build, also pass its files with `--from-runtime /path/to/current/runtime`. Void checks that the earlier version can run against your current database and refuses incompatible rollbacks. A later `upgrade` can move forward again. See [Platform Development](./platform-development.md#deploying-your-runtime) for working with custom builds.

:::

### Manage an installation from another machine

Use `discover` to restore the administrator's local installation records:

```sh
void platform discover --account <account-id> --installation <id-or-name>
```

Discovery restores local installation records after verifying the resources belong to your platform. It also works for interrupted or disabled installations. If infrastructure is missing, run `void platform repair [id]` after discovery. If ownership cannot be verified, the command stops without changing resources.

After discovery, provide `VOID_PLATFORM_DATABASE_URL` for migrations and to coordinate administrator commands. You don't need to re-enter the other secrets for an upgrade that preserves every deployed Worker. For an email-enabled installation without its encrypted recovery file, restore `VOID_PLATFORM_EMAIL_SIGNING_SECRET`; recreating only the email gateway needs that key and no Cloudflare runtime token or JWT signing key. Recreating the API or proxy also requires the email key when email is enabled, in addition to their normal secrets. Recreating the API requires its original runtime token (`VOID_PLATFORM_RUNTIME_CLOUDFLARE_API_TOKEN`), GitHub, R2, JWT, and project-encryption values through the `VOID_PLATFORM_*` variables; recreating the proxy requires the runtime token and JWT signing key. Cloudflare can't return these values, so keep them in your organization's secret manager.

If you have not rotated the project-encryption key, restore it with `VOID_PLATFORM_PROJECT_SECRET_KEY`. After rotation, supply `VOID_PLATFORM_PROJECT_SECRET_KEYS_JSON` with all retained keys and `VOID_PLATFORM_PROJECT_SECRET_ACTIVE_KEY_VERSION` with the active key's name. Keep older keys needed to decrypt existing project secrets. These values are used to recreate a missing API Worker; they do not replace the live keys during an ordinary upgrade. Supply them from your secret manager.

### Prepare for disaster recovery

`discover` reconstructs verified installation metadata on another machine. It does not download credentials, key material, or backed-up data. `repair` can then recreate missing installer-owned infrastructure, but it does not recover the data that infrastructure previously held.

Keep a coordinated recovery set for each installation:

- a PostgreSQL backup;
- the installation identity—the JWT signing secret, the email signing secret when email is enabled, and the complete project-encryption keyring—in a secret manager;
- provider-supported backups or exports for every data-bearing provider resource;
- the immutable runtime artifacts and manifest for the installed version or custom source revision.

Capture and label these items as one recovery point so PostgreSQL, provider data, identity, and encryption keys match. Backup and retention capabilities vary by provider and resource; choose and test the supported recovery process for each resource you use.

During a restore, keep platform and application traffic disabled before changing resources. Restore the matching PostgreSQL and provider data with their supported recovery tools, supply the original identity and keyring, and use the preserved runtime artifact. Then run `discover`, preview `repair` with `--plan`, and review every ownership decision and proposed resource change before applying it. Enable traffic only after the restored data and platform health have been verified. Discovery and repair are not substitutes for those backups and do not provide a recovery bypass when required secrets or data are unavailable.

### Where local state lives

Installation records live in `~/.void/platforms/`. Credentials are stored separately in encrypted recovery files, with the encryption key in your operating system's keychain. Keep your original secrets in a password manager for recovery on another machine.

If the keychain isn't available, Void stops before writing secrets. Headless environments can supply `VOID_PLATFORM_RECOVERY_KEY`: a canonical base64-encoded 32-byte key from a secret manager. A temporary CI runner can use a new recovery-encryption key for each run only when every original credential remains available in protected CI secrets, including `VOID_PLATFORM_JWT_SECRET`, `VOID_PLATFORM_EMAIL_SIGNING_SECRET` for an email-enabled installation, and either the original `VOID_PLATFORM_PROJECT_SECRET_KEY` or the complete rotated keyring and active-version pair.

::: details Ownership and interrupted maintenance

Void checks resource ownership and the configured database before making changes. Concurrent maintenance commands are coordinated so one administrator cannot overwrite another's work.

If maintenance is interrupted, rerun the same command. Traffic may stay paused until verification succeeds. Existing routes, domains, and data are preserved.

:::

## Install from CI {#install-from-ci}

For your first installation, follow the interactive walkthrough above. Use this section when automating a configured installation.

::: details Non-interactive inputs

Inject the following values from protected CI secrets. Do not commit them in a workflow or a plaintext secrets file.

| Environment variable                         | Value from the interactive setup                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`                       | Management API token                                                                        |
| `VOID_PLATFORM_RUNTIME_CLOUDFLARE_API_TOKEN` | Runtime API token                                                                           |
| `VOID_PLATFORM_DATABASE_URL`                 | Dedicated PostgreSQL URL                                                                    |
| `VOID_PLATFORM_GITHUB_CLIENT_ID`             | OAuth App client ID                                                                         |
| `VOID_PLATFORM_GITHUB_CLIENT_SECRET`         | OAuth App client secret                                                                     |
| `VOID_PLATFORM_ADMIN_GITHUB_LOGIN`           | Initial administrator's GitHub username                                                     |
| `VOID_PLATFORM_R2_ACCESS_KEY_ID`             | R2 Access Key ID                                                                            |
| `VOID_PLATFORM_R2_SECRET_ACCESS_KEY`         | R2 Secret Access Key                                                                        |
| `VOID_PLATFORM_JWT_SECRET`                   | Original JWT signing secret                                                                 |
| `VOID_PLATFORM_EMAIL_SIGNING_SECRET`         | Dedicated email signing secret when email is enabled                                        |
| `VOID_PLATFORM_PROJECT_SECRET_KEY`           | Original base64-encoded project-encryption key                                              |
| `VOID_PLATFORM_RECOVERY_KEY`                 | Base64-encoded 32-byte key for local encrypted recovery state when no keychain is available |
| `VOID_EMAIL_SENDER_DOMAIN`                   | Optional shared mail domain; requires `VOID_EMAIL_SHARED_ZONE_ID`                           |
| `VOID_EMAIL_SHARED_ZONE_ID`                  | Cloudflare zone ID for that mail domain; requires `VOID_EMAIL_SENDER_DOMAIN`                |

Use that installation's saved signing and encryption keys on every resume or repair that needs them. After a keyring rotation, use the [complete keyring recovery inputs](#manage-an-installation-from-another-machine). The database claim and tables remain after uninstall; use a fresh database for a different installation.

Set both email values to enable email during install or upgrade. Later upgrades reuse the recorded values. If an email-enabled installation has no recorded values, supply both before upgrading.

```sh
void platform install \
  --name team \
  --display-name "Team Void" \
  --account <account-id> \
  --application-domain example.app \
  --zone example.app \
  --yes
```

Mutations require `--yes` in CI; a read-only `--plan` does not. Custom runtimes also require `--runtime <directory>`. For a new installation, register the GitHub callback shown by `--plan` before running the unattended install with the same account, name, and domain options. A custom API hostname is optional.

:::

## Customize the Platform {#continuously-deploy-a-source-build}

To change the platform's implementation or deploy your own build, follow [Platform Development](./platform-development.md). It covers local development, source builds, and CI for a fork.

## Disable and safely uninstall

To pause a platform without removing its data:

```sh
void platform disable [id] --plan
void platform disable [id]
```

Disabled platforms reject application traffic while retaining domains and routes. Repair and upgrade preserve that state. Restore traffic with:

```sh
void platform enable [id] --plan
void platform enable [id]
```

Add `--yes` to commands that make changes in a non-interactive shell.

While disabled, the platform retries queue batches after five minutes instead of delivering them to apps. Queue retention and retry limits still apply. For a long pause, plan a dead-letter queue or another way to recover messages.

### Uninstall

Preview removal before applying it:

```sh
void platform uninstall [id] --plan
void platform uninstall [id]
```

Uninstall blocks platform traffic, removes transient Queues, and records the resources left for you to review. By default, Workers, KV, R2, Hyperdrive, the dispatch namespace, and AI Gateway remain in your account. Adopted resources, external PostgreSQL, zones, DNS records, routes, and custom domains are always retained.

To also remove eligible data resources owned by the installer:

```sh
void platform uninstall [id] --purge-data
```

Even with `--purge-data`, Void retains Workers, R2, AI Gateway, DNS records, routes, custom domains, adopted resources, external PostgreSQL, and zones. Review those in the Cloudflare dashboard if you want to remove them.

::: details Why some resources require manual cleanup

Resources that may have been shared or repurposed require manual review before deletion. Void verifies ownership, keeps those resources in place, and blocks platform traffic.

If removal is interrupted, rerun the command to continue. If a resource has changed ownership, resolve the reported conflict before retrying.

External PostgreSQL and its data always remain under your control.

:::
