---
outline: deep
---

# Sign-in and Access

## Signing In

For the browser admin UI, open `<API URL>/admin` and use the administrator login method selected during setup. On a new installation, follow the printed administrator setup instructions to create the first admin user. You do not need to create an app or sign in through the CLI first.

Connect to your platform's API URL, then sign in as an administrator:

```sh
void connect https://platform.example.com --no-login
void platform auth login
```

The first command saves the connection. The second opens your browser to sign in and saves an administrator session in your system keychain. Sessions last for one hour and are stored separately for each platform.

You can check which account is signed in at any time:

```sh
void platform auth status
```

This shows your account, the session's expiry, and the features available on the platform. To end the session, run `void platform auth logout`.

If the platform is protected by Cloudflare Access, `void connect <url>` handles
the company sign-in before Void login. Interactive Access authentication uses a
locally installed `cloudflared` and saves its short-lived credential in your
system keychain for that platform origin. You do not need to copy browser cookies.

For CI, Access credentials do not replace Void deployment credentials. A project
owner creates the latter with `void project token create`; it is independently
revocable, expires within 90 days, and authorizes only that project's deploy
workflow. Human and operator tokens cannot be renewed by Access service proof.

Store Access credentials in origin-keyed `VOID_ACCESS_CREDENTIALS`. A deploy
that uses prerendering or remote bindings needs entries for both the exact API
and proxy HTTPS origins, even when both entries contain the same admitted
service-token pair. `VOID_ACCESS_ORIGIN` selects only one recipient and therefore
cannot cover both calls. Keep the JSON value in your secret manager, not in
application configuration. See [CI deployment setup](/guide/platform/installation/first-deployment)
for the required shape.

## Choosing a Platform

If you manage more than one platform, list your connections and choose a default:

```sh
void platform list
void platform use <connection-id>
```

You can also select a platform for a single command with `--connection`:

```sh
void platform user list --connection <connection-id>
```

Use an ID or URL from the connection list. Administrative commands use this selection even when you run them inside an app with a different deployment destination.

## Recovering Administrator Login

If no administrator can use the configured identity provider, the installation
owner can recover an existing administrator with Cloudflare management access,
direct database access, and the original encrypted recovery credentials:

```sh
void platform config auth recover company --installation <id> --file recovery.json
```

The file identifies the existing account, for example
`{"administratorUserId":"existing-admin-id"}`. Recovery opens a real login test
and asks you to confirm the exact identity before restoring access. It does not
create a new administrator. To use a replacement provider, include its nonsecret
`configuration` with a new connection ID and supply the secret through
`--client-secret-env <name>`. To rotate an existing provider's secret, keep its
connection ID and identity configuration.

For `--yes`, also pin `expectedIdentity` with the exact `issuer` and `subject` in
the file. A successful browser login is still required. Use `--plan` to preview
the affected administrator and connection before starting recovery.

## Giving People Access

Open **Settings** in the administrator UI, or run `void platform config auth`,
to add, test, enable, or disable login methods. Access protection and login
methods are separate settings. A provider test shows the authenticated account
before you explicitly link it or enable the configuration.

To change the company gate after installation, use the installing workstation
with its saved recovery credentials:

```sh
void platform config auth protection show
void platform config auth protection enable --installation <id>
void platform config auth protection disable --installation <id>
```

Enabling offers application creation or connection to an existing application.
It checks every API, proxy, and configured dashboard origin and requires a company
user sign-in. Changing protection ends all current human sessions; sign in again
afterwards. Before removing a gate used for company signup, select another
verified company rule or restricted signup. Removing protection retains the
Cloudflare applications for deliberate cleanup. Disabling an Access login method
does not remove the gate.

Users can add another enabled login to their existing account with
`void auth link <connection-id>` or **Account** in the optional
dashboard. Sign in again first if prompted, then authenticate with the additional
provider and confirm the identity shown. Matching email addresses alone do not
link accounts.

For company installations, choose **Company-approved users** under **Who can
join?** to create accounts automatically for users accepted by your configured
company rules. Individual invitations are not required. Invited/allowlisted
signup remains available when you need to approve people individually.

With invited/allowlisted signup selected, let a teammate join with GitHub by adding their login to the allowlist:

```sh
void platform signup allow github teammate
```

Void shows the change and asks you to confirm it. The teammate can then run `void connect` with the platform's URL and sign in.

You can allow an email address or a whole email domain in the same way:

```sh
void platform signup allow email teammate@example.com
void platform signup allow email '*@example.com'
```

Email patterns apply across the platform's sign-in providers. Quote a domain pattern so your shell passes the `*` to Void.

For an OIDC login without a verified email, allow the identity by its login connection and stable provider subject instead:

```sh
void platform signup allow identity company-sso 'Employee-42'
```

Use the connection ID shown by `void platform config auth list` and the exact subject reported by your identity provider. The match is case-sensitive and does not infer an email address or link another account. Any domain or group restrictions configured for that login method still apply, and the account joins as an ordinary user. Remove the grant with `void platform signup disallow identity company-sso 'Employee-42'`.

To invite someone else by email, use:

```sh
void platform invitation send alex@example.org
```

An invitation grants signup access and sends an email when the platform has email delivery configured. If delivery is unavailable or fails, the result tells you; the person can still join using the platform's URL.

Inspect the current access settings and invitations with:

```sh
void platform signup show
void platform invitation list
```

Invitation history remains available after an involved account is removed. The stored actor ID
remains visible when that account's login no longer exists.

`void platform signup open` allows anyone to sign up. Use `void platform signup restrict` to require an allowlist match again. Disallowing an entry affects future signup; it does not suspend an existing account.
