---
outline: deep
---

# Email

## Managing Email

These commands apply to a platform that enables email. Every project can send from and receive at `<slug>+tag@<mail domain>` on the platform's shared mail domain; the [email guide](/guide/email) describes what applications do with that.

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

Project owners see administrator-registered domains in `void email domain list` and `status`; `status` names the `void platform email` command for any step they cannot take themselves, and `sync` and `remove` point them at `domain-sync` and `domain-remove`. A domain an owner registered before you switched to `admin` stays theirs to renew, sync and remove. The runtime token needs the email permissions listed in the [self-hosting guide](/guide/platform/installation/credentials#runtime-token-permissions) for this to work.

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
