---
outline: deep
---

# First Deployment

First verify the new platform and sign in with the administrator login method selected during setup:

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

After installation, sign in as the first administrator. For a teammate who uses GitHub, add their login to the signup allowlist:

```sh
void platform auth login
void platform signup allow github teammate
```

Void shows the proposed access change and asks you to confirm it. Once approved, `teammate` can connect to the platform's API URL and sign in with GitHub.

To see who can join, run `void platform signup show`. You can also allow an email address or a domain such as `*@example.com`. For an OIDC user without verified email, use `void platform signup allow identity <connection-id> <subject>`; the subject match is exact and the provider's domain or group restrictions still apply. Remove that grant with `void platform signup disallow identity <connection-id> <subject>`. `void platform signup open` permits public signup; `void platform signup restrict` requires an allowlist match again.

Your administrator session lasts for one hour. Use it to inspect users, projects, logs, and platform health. The [Platform Administration guide](/guide/platform-administration) walks through those workflows, previews, and automation. You can also open `<API origin>/admin/login` to use the browser admin UI.
