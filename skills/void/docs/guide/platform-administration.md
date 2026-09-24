---
outline: deep
---

# Platform Administration

`void platform` lets you manage the people and apps on a Void platform from your terminal. You can give teammates access, inspect their projects, follow deployment logs, and check the platform's health.

These commands require an administrator account. If you're setting up a platform for the first time, start with [Install a Void Platform](./self-hosted-platform.md).

## Signing In

For the browser dashboard, open `<API URL>/admin` and sign in with GitHub. On a new installation, signing in with the administrator account selected during setup creates the first admin user. You do not need to create an app or sign in through the CLI first.

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
application configuration. See [CI deployment setup](./self-hosted-platform.md#connect-and-deploy-an-app)
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

## Managing Users and Projects

Start by finding the user you want to inspect:

```sh
void platform user list --search teammate
void platform user show <user-id>
```

Use the ID from the list in the second command. The detail view shows the user's projects and usage. You can change their plan or list just their projects:

```sh
void platform user plan <user-id> pro
void platform project list --user <user-id>
void platform project show <project-id>
```

Project details include resources, domains, and recent builds and deployments. The [command reference](../reference/cli.md#operator-commands) also covers suspending and restoring users, deleting projects, and removing accounts.

### Transferring Project Ownership

Only an installation administrator can change a project's owner. The new owner must already have an account on this platform. Preview the transfer before applying it:

```sh
void platform project owner <project-id> <new-owner-user-id> --plan
void platform project owner <project-id> <new-owner-user-id> --yes
```

The preview shows both owners, their plans and suspension state, active work that blocks the transfer, and the changes to routing and usage counters. Wait for or cancel any active deploy, rollback, or build before retrying.

After the transfer, the former owner becomes a project administrator. Existing project-scoped CI deploy credentials are revoked; create replacements as the new owner. The new owner's plan and limits apply immediately. Usage before the transfer remains charged to the former owner; later usage is charged to the new owner. If an apply reports partial convergence, inspect the project and operator event log before repeating it.

New users on a self-hosted installation start with the `custom` profile, which
does not cap application requests, AI usage, deployment frequency, or retained
Worker deployments. Named profiles such as `pro` apply the platform's quota and
retention policies; they do not purchase Cloudflare services or bill your users.
Storage figures are not a hard storage-quota boundary. Set an operating budget
and retention policy before opening signup beyond your invited team.

The last active administrator cannot be deleted or suspended, including through
the browser admin UI. Another administrator must still have access. Automatic
usage limits do not remove administrator access and do not count as a manual
suspension.

When removing another administrator, Void revokes their administrator access
before changing application traffic or deleting resources. If cleanup fails,
access stays revoked and the error describes the partial result. A remaining
administrator can inspect it and retry cleanup.

## Managing Email

These commands apply to a platform that enables email. Every project can send from and receive at `<slug>+tag@<mail domain>` on the platform's shared mail domain; the [email guide](./email.md) describes what applications do with that.

### Deciding who mail may reach

By default, mail from the shared sender reaches only the recipients each project has verified. For a team whose applications mainly mail colleagues, widen that once for the whole installation:

```sh
void platform email policy
void platform email policy-set domains --domains example.com,corp.example.net
void platform email policy-set any
void platform email policy-set verified
```

`domains` lets every project mail any address on the listed domains in addition to its verified recipients; `any` lifts the check. Cloudflare still refuses a recipient it has not verified until your mail domain is onboarded for Email Sending, which needs Workers Paid on the platform's account. Until then such sends come back as `UNVERIFIED_DESTINATION` for that recipient, whatever the policy says. Two things the policy never changes: sends from a project's own custom domain, and mail to any address on the platform's own mail domain — those stay verified-recipient-only, so no project reaches another project's inbox without its consent. A tightening applies to new send admissions as soon as it commits; previously admitted attempts may finish. The same setting is on the admin UI's **Email** page.

### Project caps

Each project has 200 recipient submissions per UTC calendar month and 10 in a rolling 60-second window by default. An attempt stays charged once it starts, including a failed or uncertain outcome. Raise or lower a project's caps by id or slug:

```sh
void platform email limit hr-portal --monthly 2000 --burst 30
```

The project's page in the admin UI shows the current values and clears an override.

### Recovering an interrupted send

If a sender stops after beginning a provider call, its unresolved attempt blocks
removal of the project or sender domain. Inspect the attempt ID and start time:

```sh
void platform email attempts --project hr-portal
```

First confirm that the original execution has ended through your Worker logs or
incident records. Once the attempt is at least 24 hours old, resolve it with an
audit reason that contains no recipient address or message content:

```sh
void platform email attempt-resolve <attempt-id> --ended --reason "Original Worker execution ended; provider outcome could not be verified" --plan
void platform email attempt-resolve <attempt-id> --ended --reason "Original Worker execution ended; provider outcome could not be verified"
```

This records the send as `outcome_unknown` and releases its cleanup fence. The
attempt remains charged and is never retried. If its 30-day delivery record has
expired, only its recipient-free fence is removed. Do not resolve an attempt
while its original execution may still be active.

Inspect a project's retained receipt and recipient outcomes with:

```sh
void platform email logs hr-portal --page 1 --limit 50 --json
```

Logs include operation IDs, recorded outcomes, provider references, and error codes.
After project deletion, use its project ID until the 30-day metadata retention
period expires. Message bodies, subjects, attachments, and credentials are not logged.

### Registering email domains for projects

Your users may hold no Cloudflare account. Tell the platform that administrators register email domains, so `void email domain add` prints the command to ask you for instead of opening a token-creation page:

```sh
void platform email settings-set --domains admin
```

Then register a domain for a project. The zone must be in the platform's Cloudflare account; the platform's own credential does the setup, and no Cloudflare credential is stored per domain:

```sh
void platform email domain-add mail.example.com --project hr-portal
void platform email domain-status mail.example.com
void platform email domain-rotate-secret mail.example.com
void platform email domains
```

Name the exact mail domain: a subdomain such as `mail.example.com` when the apex already receives mail, otherwise the apex itself. `domain-status` reports inbound, outbound, and management readiness separately. Follow any required DNS or Cloudflare dashboard step, then use `domain-sync` to reconcile. Use `domain-rotate-secret` when you need to replace the zone ingress credential explicitly. Email Sending onboarding needs Workers Paid; after upgrading, `domain-sync` re-attempts it. For a zone in another Cloudflare account, pipe an API token for that account on standard input:

```sh
void platform email domain-add mail.other.example --project hr-portal --token-stdin --yes < token.txt
```

Project owners see administrator-registered domains in `void email domain list` and `status`; `status` names the `void platform email` command for any step they cannot take themselves, and `sync` and `remove` point them at `domain-sync` and `domain-remove`. A domain an owner registered before you switched to `admin` stays theirs to renew, sync and remove. The runtime token needs the email permissions listed in the [self-hosting guide](./self-hosted-platform.md#runtime-token-permissions) for this to work.

A permission refusal leaves setup blocked. After correcting it, run `domain-sync`
to resume that same setup operation; repeat `domain-rotate-secret` to resume a
blocked rotation without replacing its staged secret. If project deletion leaves
a blocked domain cleanup, correct the permission and run `domain-remove <domain>`
to finish the retained cleanup. If its token has expired or been revoked, provide
a replacement scoped to the same account and zone:

```sh
void platform email domain-remove mail.other.example --token-stdin --yes < token.txt
```

This recovery is available only after project deletion has begun and no other
project uses the connection. For a live project, renew its token through
`domain-add`. A timed-out Cloudflare
mutation stays stopped because replay may duplicate a provider write. After
confirming the original execution ended, wait 24 hours, inspect the exact
routing, Worker, secret, catch-all, or Sending resource named by the preview,
and use its recovery fence:

```sh
void platform email operation-resolve <operation-id> --ended --outcome <applied|not-applied> --reason "Provider state verified" --plan
void platform email operation-resolve <operation-id> --ended --outcome <applied|not-applied> --reason "Provider state verified"
```

Run recovery with the same platform version that created the persisted intent.
`applied` continues without replaying the write; `not-applied` permits that exact
step to retry. Secret rotation keeps its staged generation, and removal resumes
from the unresolved cleanup step. Age alone never authorizes a retry.

Register administrator domains only after a platform upgrade has completed, and remove them before rolling the platform back to a version that predates this feature: an earlier runtime cannot use the platform credential for them and does not distinguish administrator-registered domains from owner-registered ones.

## Previewing Changes

Commands that change the platform show the affected objects before asking for confirmation. To inspect a change without applying it, add `--plan`:

```sh
void platform user suspend <user-id> --reason "Investigating unexpected traffic" --plan
```

The preview shows which account will be suspended and the effect on its projects. Run the command again without `--plan` to confirm interactively, or use `--yes` when the change is ready to apply:

```sh
void platform user suspend <user-id> --reason "Investigating unexpected traffic" --yes
```

Scripts must use `--yes` to apply these changes. Authentication commands run directly and do not use `--plan` or `--yes`. After a change, `void platform system events` shows the administrator, affected objects, and recorded outcome.

Changes can take longer when an account owns many resources. Requests that change the platform allow five minutes by default; use `--timeout` to set a different limit in seconds:

```sh
void platform user delete <user-id> --timeout 600 --plan
```

If a request times out or loses its connection, some work may already have finished. Check the affected objects and `system events` before retrying. Void reports partial results when it can and does not automatically repeat the change.

## Following Logs

To investigate a deployment, find its ID and follow its runtime logs:

```sh
void platform deployment list --project <project-id>
void platform deployment logs <deployment-id> --since 10m --follow
```

Runtime logs include application messages, exceptions, and HTTP status codes. Without `--follow`, the command reads a page of historical logs. Use `--since` to choose a duration, an ISO date, or a timestamp in milliseconds.

Logs can become available after a request finishes. Following checks a five-minute overlap to pick up delayed records without printing them again. Records delayed longer than that may need a later historical query.

Build logs use the build's ID:

```sh
void platform build logs <build-id> --follow
```

Following waits for the final logs before stopping, including diagnostics written after the build's status changes. For a GitHub Actions build, the command gives you the URL of its logs.

## Checking the Platform

Use the overview to see recent activity, or run a health check to test the platform's services and database:

```sh
void platform system overview
void platform system health
```

Health checks use the services configured for the selected platform. An unhealthy result exits with a nonzero status, so the same command can be used in a script.

The browser dashboard's **System Status** checks refresh every 30 seconds. Failed checks show an HTTP status or connection error beside the service name. If the dashboard cannot refresh the checks, it reports that status is unavailable instead of displaying stale results.

Use `void platform upgrade`, `repair`, `disable`, and `enable` to maintain your platform. See [platform maintenance](./self-hosted-platform.md#resume-repair-recover-and-upgrade).

For disaster recovery, keep a matching PostgreSQL backup, provider data backups, installation identity and complete project-encryption keyring, and immutable runtime artifacts. Keep traffic disabled while restoring data, run `discover` to reconstruct verified local metadata, and review `repair --plan` before recreating missing installer-owned infrastructure. Neither command restores backed-up data. See [Prepare for disaster recovery](./self-hosted-platform.md#prepare-for-disaster-recovery) for the full sequence.

## Using Scripts

Add `--json` to read a command's result from another program:

```sh
void platform user list --page 1 --limit 50 --json
void platform system health --json
```

Results go to standard output. Command errors go to standard error as JSON and exit with a nonzero status. With `--follow`, each log response is a separate JSON line.

Operator tokens expire after one hour. For CI, mint a new operator token at the start of each job from a valid full API login session belonging to an active administrator. Choose the platform explicitly, inject the full session as `VOID_TOKEN` from your secret manager, and capture the exchange output directly into the protected job environment:

```sh
export VOID_API_URL=https://platform.example.com
VOID_OPERATOR_TOKEN="$(
  printf '%s' "$VOID_TOKEN" | void platform auth token --token-stdin
)" || exit 1
export VOID_OPERATOR_TOKEN
unset VOID_TOKEN
void platform system health --json
unset VOID_OPERATOR_TOKEN
```

Disable shell tracing for the exchange and do not write either token to logs or plaintext files. A full API login session expires after 30 days and can be revoked sooner; renew it through the normal authenticated login flow and update the protected CI secret. A job that runs longer than one hour must repeat the exchange while its full API session is still valid. An expired operator token cannot refresh itself, and Void does not issue permanent service tokens for administrator automation.

`auth login --token-stdin` performs the same elevation and saves the one-hour operator token in the system keychain for interactive use. See [operator authentication](../reference/cli.md#operator-authentication) for the full command syntax.

An email zone has one connection and ingress Worker shared by its exact domain assignments. Removing one assignment preserves resources used by the others. The Email administration page can explicitly rotate that connection secret; ordinary synchronization does not rotate it. Setup and cleanup outcomes include operation IDs, and uncertain provider writes remain recorded until reconciled.
