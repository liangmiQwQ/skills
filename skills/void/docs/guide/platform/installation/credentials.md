---
outline: deep
---

# Credentials

Keep one password-manager entry for this platform. Paste the saved values into the installer when asked; most do not need shell environment variables.

## Cloudflare API Tokens {#runtime-token-permissions}

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

Enabling email lets administrators [register email domains for projects](/guide/platform/administration/email#registering-email-domains-for-projects) and lets projects register destination addresses through the runtime token. That needs **Email Routing Addresses: Edit** and **Email Sending: Edit** on the account, plus **Zone: Read**, **Zone Settings: Edit** and **Email Routing Rules: Edit** on the zones that will carry mail; the token link preselects them when email is enabled. Email Sending onboarding itself needs Workers Paid on the account.

To enable email, set `VOID_EMAIL_SENDER_DOMAIN` to the shared sender domain and `VOID_EMAIL_SHARED_ZONE_ID` to its Cloudflare zone ID when installing or upgrading. Void records both values for later upgrades and rejects attempts to replace them during an ordinary upgrade. The mail zone can differ from the application zone, but it must belong to the selected platform Cloudflare account; without an explicit mail-zone identity, shared inbound delivery stays unavailable. The dedicated email gateway is deployed in the platform account. Each customer zone uses its own ingress Worker to forward mail to that gateway.

The installer prepares the shared mail route and verifies inbound readiness before it opens platform traffic. If that setup fails, the installation remains disabled. Correct the reported Cloudflare permission, mail-zone configuration, or routing conflict, then rerun the same install or upgrade command; a fresh install resumes with `void platform install --resume --name <installation-id>`.

Void checks access before provisioning. If it reports a missing permission, update the token's permissions for the selected account or zone and retry.

:::

## R2 Upload Credentials

The installer opens the **R2 token creation** form directly, requesting an account token (or a user token if your role cannot create account tokens). Select **Object Read & Write**—the form starts with read-only access—and keep **Apply to all buckets in this account (including newly created buckets)** selected. This lets the token access the buckets Void creates afterward. Create the token and save its **Access Key ID** and **Secret Access Key**. These are different from the management/runtime tokens above. See [R2's token instructions](https://developers.cloudflare.com/r2/api/tokens/).

## Signing and Encryption Keys {#signing-and-encryption-keys}

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
