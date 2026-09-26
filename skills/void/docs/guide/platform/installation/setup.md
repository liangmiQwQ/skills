---
outline: deep
---

# Install and Configure Login

For workers.dev testing, start the interactive install and choose your login method below:

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

## Choose login methods

The installer offers GitHub, Google, generic OIDC, and Cloudflare Access login.
Cloudflare Access protection is a separate choice from Access login. The
GitHub OAuth steps below apply when you select GitHub login.

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

### Cloudflare Access

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

For the default GitHub-only setup, the prompts collect the runtime token, administrator GitHub username, PostgreSQL URL, GitHub client ID and secret, R2 credentials, and signing/encryption keys. Other login methods collect their configured provider credentials and use the one-time administrator setup code described above. Secret values are masked and setup progress is encrypted locally using the system keychain. Keep a password-manager copy for recovery on another machine.

Void shows installation progress while it prepares the database, provisions Cloudflare resources, deploys the services, and verifies platform health. Progress is checkpointed for recovery. When installation finishes, follow the printed administrator sign-in instructions and open the admin dashboard link. GitHub-only setup creates the first admin user when the selected GitHub account signs in; configurable setup uses the one-time `/setup` code and selected administrator login method. No app or CLI login is required. Void also prints the API URL to use when you [connect and deploy an app](/guide/platform/installation/first-deployment).

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
