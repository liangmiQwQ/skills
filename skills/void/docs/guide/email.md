---
outline: deep
---

# Email

Send transactional email from your app via [Cloudflare's `send_email` binding](https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/). Import `sendEmail` from `void/email` and Void handles MIME construction, binding inference, and a local-dev inbox.

```ts
import { sendEmail } from 'void/email';

const result = await sendEmail({
  from: 'Acme <acme+noreply@mail.example.com>', // use your project's sender address
  to: 'user@example.com',
  subject: 'Welcome',
  text: 'Thanks for signing up!',
  // html: '<p>Thanks for signing up!</p>', // optional — sent as multipart/alternative when paired with text
});

if (!result.ok) {
  if ('error' in result) {
    // A request-level failure; OUTCOME_UNKNOWN may already have been submitted.
    console.error(result.error.code, result.error.message);
  } else {
    // Some recipients failed. `deliveries` says which.
    for (const d of result.deliveries.filter((d) => !d.ok)) {
      console.error(d.recipient, d.error.code, d.error.message);
    }
  }
}
```

Both branches are real. `result.error` exists only on the first, so reading it
unconditionally throws on the second — and the second is the one a new project
hits first, because a recipient you have not verified yet fails per-recipient.

## Setup

On a platform with email enabled, your app needs no email configuration before
`void deploy`. Ask your administrator for the platform's shared mail domain. A
self-hosted administrator [enables email during installation or upgrade](/guide/platform/installation/credentials#runtime-token-permissions); installations without it do not offer platform email. Void Cloud uses `mail.void.cloud`.

Each project on an email-enabled platform has:

- **Sender** — `<your-slug>+noreply@<mail-domain>`. Used as the default `from` if you omit it. The platform administrator configures the mail zone and its Email Routing, DKIM, SPF, and DMARC records. Project slugs are capped at 56 characters so this local part fits RFC 5321's 64 octets; a project created before the cap with a longer slug must pass `from` explicitly.
- **No worker binding to add** — outbound mail is sent by the Void proxy, which holds the
  platform `send_email` binding. Your worker never gets one, so there is nothing to configure.
- **Your own address as a recipient** — the email on your Void account is registered as a recipient when the project is created. It is verified at once when Cloudflare already holds it verified for the platform (you clicked its link for an earlier project of yours); otherwise Cloudflare mails it a verification link, and until you click that link and run `void email destinations` — the listing is what records the click — a send to yourself comes back `ok: false` with a per-recipient `UNVERIFIED_DESTINATION` in `result.deliveries`.

That's it for configuration. Delivery is gated separately: outbound mail only reaches verified recipients, so `sendEmail({ to: '...', subject: '...', text: '...' })` works on first deploy for your own address once it is verified, and for anyone else after `void email allow` — see [Adding recipients](#adding-recipients).

Deploying to your own Cloudflare account instead (`void deploy --platform cloudflare`) takes one line of `void.json` and one Enter on the first deploy — see [Your own Cloudflare account](#your-own-cloudflare-account).

## Adding recipients

Cloudflare's `send_email` binding only delivers to addresses you've registered as recipients. Add them with the CLI:

```sh
void email allow user@acme.com
```

Cloudflare emails the recipient with a verification link. Once they click it and `void email destinations` has picked the click up, you can send to that address from your project. If the link did not arrive or has expired, run `void email allow <address>` again while the address is still pending — the CLI re-sends the link, or tells you how to get a fresh one. List the project's recipients:

```sh
void email destinations
```

The project owner's account email is added automatically when the project is created on an email-enabled platform, so it skips `void email allow` — not the verification. See [Setup](#setup) for when it is verified at once and when there is a link to click.

::: warning When this is the right fit
The shared sender is great for: ops alerts to the team, notifications to the project owner, reply-by-email flows on top of inbound, internal/app-internal mail.

For SaaS sending to arbitrary end-users (every signup gets a welcome email), the per-recipient verification model doesn't fit. On the platform, [registering your own domain](#your-own-domain-on-the-platform) lifts that gate for sends from that domain. On [your own Cloudflare account](#your-own-cloudflare-account) with Workers Paid, Void onboards your mail domain for Email Sending, which lifts the verified-recipient gate. Otherwise use [Resend](https://resend.com), [Postmark](https://postmarkapp.com), or [SES](https://aws.amazon.com/ses/) directly — install their SDK and call it from your handler. We may formalize this with a provider abstraction later if there is demand; until then, calling the SDK directly is simple enough that the wrapper would not earn its keep.
:::

## Your own domain on the platform

The shared sender uses the platform's configured mail domain. To send — and receive — at a domain you own, register its Cloudflare zone with the project:

```sh
void email domain add acme.com
```

`add` opens a Cloudflare API-token template. Restrict the token to the selected account and mail zone before creating it; Workers Scripts permission applies across that account. The CLI accepts a masked paste or a newly copied token and asks you to confirm those restrictions. The platform encrypts the credential for the zone connection, so projects sharing that zone do not need separate ingress Workers.

When an apex already receives mail, the CLI proposes `mail.<domain>`. Use `--subdomain <label|host>` to choose another mail subdomain. Void refuses to replace a foreign enabled catch-all. A domain belongs to one project; multiple exact domains can share a zone, and a project can register more than one domain.

Setup returns an operation ID. If your connection drops, the platform keeps the recorded operation and the CLI checks that operation's status. An uncertain Cloudflare write stops conflicting changes until its outcome can be established.

`void email domain status <domain>` reports three independent results:

- **Inbound**: whether mail can reach the project's handlers.
- **Outbound**: whether sending is ready, restricted to verified destinations, pending, or blocked.
- **Management**: whether the stored Cloudflare credential can manage the connection.

Use `void email domain sync <domain>` to reconcile setup and refresh readiness. Sync does not rotate the connection secret. Use `void email domain rotate-secret <domain>` for an explicit rotation; it applies to all domains sharing that zone connection and verifies the deployed secret before completing. Rotation requires inbound readiness; run `sync` first if setup is incomplete. If a dashboard or credential step is required, the status names it. Removing a domain disables its assignment; zone resources used by another domain remain in place, and unfinished cleanup stays recorded for reconciliation.

After the last assignment's ingress is deleted, the platform forgets its stored
credential. Revoke a token you no longer use in Cloudflare; Void does not revoke
tokens you created yourself. Re-adding a removed domain requires a scoped token
again. A domain can move to another project only after its removal completes
and the zone connection's manager authorizes the new assignment.

Once inbound is ready, mail to any address on that domain reaches your `email/` handlers. Sending to arbitrary recipients also needs outbound readiness; a domain limited to verified destinations still requires recipient verification. Platform quotas and suspension apply to both shared and custom senders.

On an administrator-managed platform, `add` prints the administrator command for new domains. Existing owner-managed connections remain available to their owner. Your administrator may permit shared-sender mail to specific recipient domains or any recipient; destinations on the platform's shared mail domain still require explicit verification.

## Options

| Option           | Type                         | Notes                                                                                                           |
| ---------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `from`           | `string \| { email, name? }` | Optional. Pinned to the project sender — see below.                                                             |
| `to`             | `Address \| Address[]`       | Required. One or more recipients.                                                                               |
| `subject`        | `string`                     | Required. UTF-8 supported (encoded as RFC 2047).                                                                |
| `text`           | `string`                     | At least one of `text` / `html` is required.                                                                    |
| `html`           | `string`                     | Sent as `multipart/alternative` if both are provided.                                                           |
| `replyTo`        | `Address`                    | Optional `Reply-To` header.                                                                                     |
| `cc`, `bcc`      | `Address \| Address[]`       | Optional. Each recipient is sent its own message envelope.                                                      |
| `headers`        | `Record<string, string>`     | Custom headers; reserved headers (From, Date, etc.) are ignored.                                                |
| `attachments`    | `Attachment[]`               | See [Attachments](#attachments).                                                                                |
| `idempotencyKey` | `string`                     | Optional on the Void Platform: 1–128 printable, non-space ASCII characters. Reuse for retries of the same send. |

At most 50 recipients across `to`, `cc` and `bcc` per call. Each address is checked with [`email-validator`](https://www.npmjs.com/package/email-validator): an ASCII dot-atom local part (before the `@`) of at most 64 characters — no whitespace, control character or RFC 5322 special, no leading, trailing or doubled dot, and no quoted local part — and a dotted domain of ASCII labels (at most 63 characters each) whose TLD starts with a letter and is at least 2 characters, so `user@localhost` is refused and an IDN domain must be given as punycode (`xn--…`); at most 254 characters in total (RFC 5321: a 256-octet forward-path `<local@domain>` and a 64-octet local part are the longest every receiver must accept). The address itself carries no display-name syntax; a display name goes around it (`"Name <addr>"` or `{ email, name }`). All of these are checked before anything is built and return `INVALID_TO` (`INVALID_FROM` for `from`; `MIME_ERROR` for `cc`, `bcc` and `replyTo`). The platform's inbound router applies the same package to `forward()` and `reply()` addresses, so nothing a handler records is dropped there for its shape. Custom header names must be RFC 5322 field names (printable ASCII, no colon); a name too long to fit a 998-octet line — a field name cannot be folded — is rejected with `MIME_ERROR` before anything is built.

`Address` accepts either a string (`"hello@acme.dev"` or `"Name <hello@acme.dev>"`) or an object (`{ email, name? }`). Display names with non-ASCII characters are RFC 2047 encoded automatically.

On the platform the sender is pinned to your project. `from` must be your project's own platform address — `<project-slug>@<mail-domain>` or `<project-slug>+<tag>@<mail-domain>`, optionally with a display name — or any address on a domain registered with `void email domain add` (see [Your own domain on the platform](#your-own-domain-on-the-platform)). For example, if your platform's mail domain is `mail.example.com`, you can use `Acme <acme+noreply@mail.example.com>`. Anything else is rejected with `INVALID_FROM`. Omit `from` and Void fills in `<project-slug>+noreply@<mail-domain>` for you.

On your own Cloudflare account, `from` defaults to `email.from` from `void.json` and must be on a domain your account can send from; Cloudflare rejects any other sender and `sendEmail` reports it as `INVALID_FROM`.

## Attachments

```ts
await sendEmail({
  to: 'user@example.com',
  subject: 'Your receipt',
  text: 'Receipt attached.',
  attachments: [
    {
      filename: 'receipt.pdf',
      content: pdfBytes, // string | Uint8Array | ArrayBuffer | Blob
      contentType: 'application/pdf',
    },
  ],
});
```

For inline images (e.g. logos referenced from HTML), set `disposition: 'inline'` and `contentId`:

```ts
await sendEmail({
  to: 'user@example.com',
  subject: 'Hello',
  html: '<img src="cid:logo" alt="Acme">',
  attachments: [
    {
      filename: 'logo.png',
      content: logoBytes,
      contentType: 'image/png',
      contentId: 'logo',
      disposition: 'inline',
    },
  ],
});
```

`contentType` is inferred from the filename extension when omitted; when given, it must be a valid media type (`type/subtype`, optionally followed by `; attribute=value` parameters — no `name`, which is set from `filename`), or `sendEmail` returns `MIME_ERROR`. `contentId` is the identifier the HTML references as `cid:<id>`: letters, digits, the RFC 5322 `atext` symbols and dots, optionally with an `@domain` part and optionally in one pair of angle brackets (`logo`, `logo@acme.dev` and `<logo@acme.dev>` all render as `Content-ID: <…>`); anything else — whitespace, quotes, parentheses, a stray `<` or `>`, or an empty string — returns `MIME_ERROR`. Total encoded message size is capped at 5 MiB, and custom headers at 16 KiB; oversize payloads return `MIME_ERROR` instead of failing upstream.

## Result and errors

`sendEmail` returns a result instead of throwing. A successful result means the provider accepted the send; it does not confirm delivery to the recipient's mailbox.

`ok: true` carries `ids`, one per unique recipient. Addresses are compared case-insensitively across `to`, `cc`, and `bcc`. A custom-domain provider batch can report the same provider reference for several recipients.

`ok: false` carries either a top-level `error` or a complete per-recipient `deliveries` list. Platform results include an `operationId` when available, and per-recipient `state` distinguishes rejection, reservation, submission, provider acceptance, failure, cancellation, and an unknown outcome.

Provider submissions have a 30-second wait limit. Platform `sendEmail` requests are bounded to 60 seconds, including admission and recording the result; native and inbound handler submissions share a 60-second batch budget. A submission that times out returns `OUTCOME_UNKNOWN`; the provider may still accept it later.

Use an idempotency key for sends you may retry:

```ts
const result = await sendEmail({
  to: 'user@example.com',
  subject: 'Invoice ready',
  text: 'Your invoice is available in your account.',
  idempotencyKey: 'invoice:42:ready',
});

if (result.ok) {
  console.log('Accepted by the provider', result.operationId);
} else {
  console.log('Inspect the outcome before retrying', result.operationId, result);
}
```

For 30 days, repeating a key with the same payload returns its recorded outcome without another provider submission. Reusing it with a different payload returns `IDEMPOTENCY_CONFLICT`. A lost response or interrupted provider request can return `OUTCOME_UNKNOWN`; check `void email logs` or repeat the same key. A new key creates a new send and can produce a duplicate. Native Cloudflare binding sends do not support platform idempotency keys.

| Code                     | Meaning                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `BINDING_MISSING`        | No email transport is configured.                              |
| `INVALID_FROM`           | The sender is invalid or not authorized for the project.       |
| `INVALID_TO`             | The recipient list is invalid or exceeds 50 recipients.        |
| `UNVERIFIED_DESTINATION` | The recipient needs verification under the active policy.      |
| `MIME_ERROR`             | The message is invalid or exceeds a size limit.                |
| `QUOTA_EXCEEDED`         | A platform or provider quota has been reached.                 |
| `IDEMPOTENCY_CONFLICT`   | The key was already used for another payload.                  |
| `OUTCOME_UNKNOWN`        | The send may have reached the provider; do not blindly resend. |
| `UPSTREAM_ERROR`         | The provider or platform refused the request.                  |

The default platform allowance is 200 recipient submissions per UTC calendar month and 10 in a rolling 60-second window. Reserved submissions count toward the limits. Hourly cleanup cancels reservations older than 15 minutes that never started and releases their quota. Once an attempt starts, it stays charged even if the provider fails or the outcome is unknown. Administrators can change these limits.

`void email usage` shows monthly recipient attempts, inbound receipts, and the remaining allowance. `void email logs --limit 50` shows up to 100 recent metadata entries retained for 30 days: operation, recipient, direction, state, provider reference, and error code. It does not store subjects, bodies, or attachments. Receiving a message and sending a reply are separate events.

## Local development

During `void dev`, sends are captured to an in-memory inbox instead of going to Cloudflare. The dev server prints the inbox URL when it starts:

```
[void] Email inbox: http://localhost:5173/__void/inbox?token=<printed-token>
```

The inbox shows a list view with subject, sender, recipient, and timestamp. Click a message to see headers, attachments, and an HTML preview rendered in a sandboxed iframe. Each message can be downloaded as a `.eml` file.

Every inbox route requires a local access token. Void includes it in the printed inbox URL and browser links. For command-line requests, send it in the `x-void-dev-trigger` header as shown below; requests without it return `401`. The token is stored in `.void/dev-trigger-token`. Treat inbox URLs as credentials, especially when exposing your dev server to a network.

```bash
# download a message as .eml
curl http://localhost:5173/__void/inbox/<id>/raw \
  -H "x-void-dev-trigger: <printed-token>" -o message.eml

# clear the inbox
curl -X DELETE http://localhost:5173/__void/inbox \
  -H "x-void-dev-trigger: <printed-token>"
```

The buffer holds the most recent 100 messages and survives HMR but not a full server restart. No disk persistence.

Under the hood, your code runs in workerd (a separate process from the Vite dev server), so `sendEmail` hands each captured message to the dev server over the worker's `assets` binding, which Vite wires back into its own middleware. Void apps always have that binding, and so do apps built on a Class A framework (TanStack Start, React Router) once their wrangler config declares one.

The dev inbox is **not** available under a Class B or C framework — SvelteKit, Nuxt, Analog, Astro. Those adapters own their own dev server and worker build, so Void never installs the Cloudflare Vite plugin for them and has nowhere to register the inbox. Declaring an `assets` binding does not help: SvelteKit, Nuxt and Analog do not run your code in a workerd instance fronted by Vite at all, so there is no loopback to bind to. Sends from those apps return `BINDING_MISSING`. Use `createEmailTestHarness` from `void/email/testing` instead, which captures in-process and works everywhere. When the inbox is configured but unreachable, `sendEmail` returns `UPSTREAM_ERROR` — nothing is captured and nothing is sent.

`sendInDev: true` bypasses the dev inbox for a single send. `void dev` binds no send transport at all — the platform's `__VOID_PROXY` service binding is added only on a deployed worker, and the own-account `SEND_EMAIL` binding is stripped under `serve` so miniflare cannot write stray `.eml` files or send real mail (only that entry: a `send_email` binding of your own under another name is left exactly as `wrangler.jsonc` declares it). With the inbox skipped there is nothing left to fall through to, so the call returns `BINDING_MISSING`: it proves the inbox was bypassed, it does not deliver. To verify real delivery, deploy and send from the deployed worker.

```ts
const result = await sendEmail({
  from: 'acme+noreply@mail.example.com', // replace with your project sender
  to: 'verified@acme.dev',
  subject: 'Skips the dev inbox',
  text: 'Not captured — and not delivered either.',
  sendInDev: true,
});
// Under `void dev`: result.error.code === 'BINDING_MISSING'
```

## Testing

Use the test harness to assert on outgoing messages without mocking the binding:

```ts
import { describe, it, expect } from 'vitest';
import { sendEmail } from 'void/email';
import { createEmailTestHarness } from 'void/email/testing';

describe('signup flow', () => {
  it('sends a welcome email', async () => {
    const inbox = createEmailTestHarness();

    await sendEmail({
      from: 'acme+noreply@mail.example.com', // use your project sender
      to: 'user@example.com',
      subject: 'Welcome',
      text: 'Hi!',
    });

    expect(inbox.messages).toHaveLength(1);
    expect(inbox.messages[0].subject).toBe('Welcome');
    inbox.dispose();
  });
});
```

The harness intercepts every `sendEmail` call until `dispose()` is called. `clear()` empties the captured list without releasing the sink.

## Inbound

Inbound mail is a **Void-app-only** feature. Receive it by dropping handlers in the top-level `email/` directory — alongside `crons/` and `queues/`. Void detects them, generates the worker's `email()` export, and dispatches incoming messages by recipient address.

Under a third-party framework — TanStack Start, React Router, SvelteKit, Nuxt, Analog, Astro — Void wires only crons and queues into the framework's own worker entry, so there is nowhere to attach an `email()` export. An `email/` directory in those projects is a build error, not silently dead code. Outbound is unaffected: `sendEmail` is a binding, and it works in every framework.

The same holds for `target: "node" | "bun" | "deno"`: those builds expose HTTP only and never invoke an `email()` export, so an `email/` directory fails the build with guidance.

```ts
// email/_default.ts — fallback for any unmatched recipient
import { defineEmail, parseEmail } from 'void/email';

export default defineEmail(async (message, env, ctx) => {
  const parsed = await parseEmail(message);

  if (parsed.subject?.startsWith('STOP')) {
    message.setReject('Use the unsubscribe link.');
    return;
  }

  await message.forward('archive@example.com');
});
```

The handler receives Cloudflare's native `ForwardableEmailMessage` plus an optional fourth `info` arg with `params` populated for dynamic / tagged route segments:

| Method                             | Purpose                                                                                                                                                                                                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `message.setReject(reason)`        | Reject the message — the sender sees the SMTP error. The reason is cut to 1000 characters and control characters become spaces; an empty one reads `rejected by handler`.                                                                            |
| `message.forward(to, hdrs?)`       | Forward to a verified destination address. `to` is a bare address; one `sendEmail` would refuse throws `INVALID_TO` at the call. `hdrs` holds at most 32 headers, each name and value at most 1024 characters; more throws `MIME_ERROR` at the call. |
| `replyEmail(message, opts)`        | Reply with a threaded `In-Reply-To` / `References`.                                                                                                                                                                                                  |
| `message.reply({ from, to, raw })` | Bring your own MIME bytes (`Uint8Array` or stream). `from` and `to` are bare addresses, checked at the call like `forward`. A native `EmailMessage` cannot be replayed — its body has no public accessor.                                            |
| Returning without action           | Accept the message silently.                                                                                                                                                                                                                         |

`parseEmail(message)` wraps [`postal-mime`](https://www.npmjs.com/package/postal-mime) and returns a structured object with `from`, `to`, `subject`, `text`, `html`, `attachments`, and full `headers`. Call it at most once per message — the underlying stream can only be read once.

### Per-recipient routing

```
email/
  support.ts                — handles support@<your-domain>
  billing.ts                — handles billing@<your-domain>
  support+[ticket].ts       — handles support+ticket-123@... → info.params.ticket = "ticket-123"
  support+vip.ts            — handles exactly support+vip@..., ahead of support+[ticket].ts
  [user].ts                 — dynamic local-part   → info.params.user
  [user]+[tag].ts           — dynamic + subaddress → info.params.user, info.params.tag
  _default.ts               — fallback when no per-address pattern matches
```

Files are matched against the local-part of the `To` address (the portion before `@`), case-insensitive. **Match precedence (most specific wins):**

1. `support+vip.ts` (static + literal tag)
2. `support+[ticket].ts` (static + captured tag)
3. `support.ts` (static)
4. `[user]+vip.ts` (dynamic + literal tag)
5. `[user]+[tag].ts` (dynamic + captured tag)
6. `[user].ts` (dynamic)
7. `_default.ts` (fallback)

The first pattern that matches wins. Within a shape, a literal tag beats a captured tag — `support+vip@` reaches `support+vip.ts`, and every other `support+…@` reaches `support+[ticket].ts`. Handlers of the same shape are tried alphabetically.

If nothing matches and there's no `_default.ts`, control returns to Cloudflare and the sender receives a non-delivery report. Nested folders under `email/` are ignored — the recipient is a flat string, not a path.

### Threaded replies

```ts
// email/support+[ticket].ts
import { defineEmail, parseEmail, replyEmail } from 'void/email';

export default defineEmail(async (message, env, ctx, info) => {
  const parsed = await parseEmail(message);
  await ticketStore.append(info!.params.ticket, parsed.text ?? '');

  await replyEmail(message, {
    text: `Got your message on ticket ${info!.params.ticket}.`,
  });
});
```

`replyEmail` builds the reply MIME with `Subject: Re: <original>` (no double-prefix), `In-Reply-To: <Message-ID>`, and a continued `References` chain, then dispatches through the message's `reply()`. Defaults: `to = message.from`, `subject = "Re: <original>"`.

Everything taken from the inbound message is best-effort, because the remote sender controls it. A `Message-ID` or `References` value too long for a header line is dropped rather than threaded, and a `References` chain over 8 KiB keeps only its newest ids — the parent's `Message-ID` always ends it. Control characters in the subject become a space, and a subject over 4096 characters, or an ASCII one too long to fold, falls back to a bare `Re:`. None of these fallbacks suppresses the reply; pass `subject` to control it exactly.

On the platform, shared-domain replies default to
`<slug>+noreply@<mail domain>`. For mail received at a registered custom domain,
replies default to the address that received the message. `replyEmail` throws
when it cannot determine a sender. Native Cloudflare replies default to `message.to`.

::: warning The platform pins the reply sender
You may override `from` with your project's shared address or an address on
a registered custom domain your project owns. An unauthorized sender is rejected
and recorded in `void email logs`.

For shared addressing, `message.to` has the project prefix removed. Use the
default sender instead of copying that stripped address into `from`.
:::

::: warning The platform gates the reply recipient
A reply's `to` goes through the platform's recipient policy and the transport's
capability checks. Shared sending defaults to your project's verified
destinations: run `void email allow <address>` and have the recipient complete
verification. A blocked reply is recorded in `void email logs`; the inbound
message remains accepted.

Custom-domain sends may reach external recipients when Cloudflare Sending is
enabled. Addresses on the platform's own mail domain always require per-project
consent. Native forwarding and reply operations can have additional Cloudflare
restrictions; check the recorded outcome before assuming a reply was accepted.
:::

In a platform handler, awaiting `replyEmail` or `message.forward` records an
action for execution after the handler finishes. Use `void email logs` to see
its provider outcome. `sendEmail` returns its send result directly.

`message.forward` requires a native Cloudflare email event. A message relayed
from a customer zone cannot use native forwarding; its forward action is
recorded as `UNSUPPORTED_ACTION` without sending or consuming quota. Replies
remain available through that domain's sending capability.

### Configuring inbound delivery

On an email-enabled platform, `<slug>+anything@<mail domain>` reaches your
deployed `email/` handlers without per-project DNS setup. A
[registered custom domain](#your-own-domain-on-the-platform) reaches those
handlers once its inbound readiness is `ready`. Use `void email domain status`
to check current provider routing and any remaining setup steps.

On your own Cloudflare account there is no shared facility: the deploy derives one Email Routing rule per handler and writes it into `wrangler.jsonc` for you — see [Your own Cloudflare account](#your-own-cloudflare-account).

There is no local inbound trigger yet — `void dev` serves the outbound dev inbox only, so test inbound handlers with `createInboundTestHarness` below.

### Testing inbound handlers

Use `createInboundTestHarness` to run handlers through the real dispatcher with a synthesized message and capture replies / forwards / rejects.

`deliver({ to })` takes the address **as it arrives on the wire**, which is
`<slug>+<tag>@<domain>` — the same form the platform delivers to your worker.
The harness strips the `<slug>+` prefix before matching, exactly as the
generated dispatcher does on the platform, so `acme+support+abc-123@acme.dev`
is what matches `email/support+[ticket].ts`. Pass the user-facing
`support+abc-123@acme.dev` and the harness reads `support` as the slug, leaving
`abc-123` to match — which falls through to `_default`. A worker on your own
Cloudflare account receives no slug and matches the full local part; pass
`slug: null` to test that lane, and `support@mail.acme.com` reaches
`email/support.ts` while `support+abc-123@mail.acme.com` reaches
`email/support+[ticket].ts` with `abc-123`:

```ts
const harness = createInboundTestHarness({
  slug: null,
  routes: { support, 'support+[ticket]': ticket },
});
await harness.deliver({ from: 'a@x.dev', to: 'support+abc-123@mail.acme.com' });
```

```ts
import { describe, it, expect } from 'vitest';
import { createInboundTestHarness } from 'void/email/testing';
import support from './email/support+[ticket]';
import defaultHandler from './email/_default';

describe('email handlers', () => {
  it('routes to support+[ticket] and extracts the tag', async () => {
    const harness = createInboundTestHarness({
      routes: { 'support+[ticket]': support, _default: defaultHandler },
    });
    const result = await harness.deliver({
      from: 'user@example.com',
      to: 'acme+support+abc-123@acme.dev',
      subject: 'Help',
      text: 'I have a problem',
    });
    expect(result.handler).toBe('support+[ticket]');
    expect(result.params).toEqual({ ticket: 'abc-123' });
  });

  it('rejects STOP messages via _default', async () => {
    const harness = createInboundTestHarness({ routes: { _default: defaultHandler } });
    await harness.deliver({
      from: 'user@example.com',
      to: 'acme+unknown@acme.dev',
      subject: 'STOP',
      text: 'bye',
    });
    expect(harness.rejects).toEqual(['Use the unsubscribe link.']);
  });
});
```

The harness uses the same precedence rules as the production dispatcher. Reserved key `_default` mirrors `email/_default.ts`. It also applies the platform's inbound admission limits before your handler runs: a message over 10 MiB, or carrying more than 1024 headers or 128 KiB of header data, is recorded in `rejects` and the handler is not called — exactly what the platform does before dispatch. With `slug: null` there is no platform router in front of the worker, so neither limit applies.

## Your own Cloudflare account

`void deploy --platform cloudflare` sets email up on a zone **you** own, through your Cloudflare sign-in (`void cloudflare login`). You never handle a Cloudflare object — no zone id, no routing rule, no token scope. You type one address, read one checklist, and press Enter once.

### Two things to type, once

1. **`email.from` in `void.json`** — the default sender, and the domain Void sets up:

   ```json
   {
     "email": {
       "from": "Acme <support@mail.acme.com>"
     }
   }
   ```

   The host (`mail.acme.com`) must be a zone in the Cloudflare account your deploy is pinned to, or sit under one. Without `email.from`, a deploy that uses email prints `add "email": { "from": "you@mail.acme.com" } to void.json` and deploys without it. Void does not pick a zone for you — wrangler cannot list them — and it never writes `void.json`.

2. **`void cloudflare login`**, or **`CLOUDFLARE_API_TOKEN`** set to a token with **Email Routing Edit** and **Email Sending Edit** (zone and account) alongside the deploy permissions. A browser session created by older Cloudflare tooling lacks the two email scopes; the deploy tells you to run `void cloudflare logout`, then `void cloudflare login` (one browser Allow) and skips the email step. A token's permissions cannot be listed up front, so a token that lacks one shows up as a row Void could not read (`unknown`), with the permission named. A Global API Key pair (`CLOUDFLARE_API_KEY`) is refused: it has no single bearer for the two calls wrangler has no command for.

### The first deploy

Before any of your project code runs, the deploy **reads** — the session, the zone, public DNS (MX on the mail domain and on the apex, `_dmarc`, `cf-bounce`), Email Routing status, the zone's subaddressing setting, the routing rules on your addresses, Email Sending, and what `wrangler.jsonc` already holds — and prints what it found and what it would change:

```
  Email in use   email/support+[ticket].ts · email/_default.ts · sendEmail() in 2 files
    domain    mail.acme.com          (void.json email.from)
    zone      acme.com               account Acme (f721b8e5…) · session dev@acme.com
    apex MX   aspmx.l.google.com     left alone — mail lives on the subdomain
    routing   mail.acme.com  not enabled · subaddressing off
    sending   mail.acme.com  not onboarded
    rules     support@mail.acme.com → acme-support   (absent)
    binding   SEND_EMAIL             (absent)
    sender    noreply@mail.acme.com  (vars.__VOID_EMAIL_FROM absent)

  This changes YOUR Cloudflare account. acme.com itself is not touched.
    + enable Email Routing on mail.acme.com       Cloudflare writes and locks 3 MX + 1 SPF record there
    + turn on subaddressing for acme.com          support+anything@ reaches support@
    + onboard mail.acme.com for Email Sending     MX/SPF/DKIM on cf-bounce.mail.acme.com, _dmarc.mail.acme.com (p=reject)
    + wrangler.jsonc                              send_email: [{ name: "SEND_EMAIL" }], addresses: ["support@mail.acme.com"], vars.__VOID_EMAIL_FROM: "noreply@mail.acme.com"
    + routing rule (created on deploy)            support@mail.acme.com → acme-support
    ! email/_default.ts                           a catch-all exists only on an apex; other @mail.acme.com mail bounces

◆  Set up email on mail.acme.com?  ● Yes / ○ No
```

Enter (Yes is the default) applies only the `+` rows that are not ready, then the deploy continues as usual: the build, the version upload and activation, wrangler's trigger synchronization — which creates the routing rules from the `addresses` array wrangler now finds in your config and prints its own `Email Routing plan:` — and finally the address map:

```
  ✔ deployed  acme-support
    inbound   support@mail.acme.com  →  email/support+[ticket].ts
    outbound  sendEmail() from support@mail.acme.com
```

On the second deploy every row reads ready: no prompt, no account call, and wrangler reports `Email Routing rules are up to date.` Answer No before any setup has been committed, and the deploy continues without email.

DNS can take a few minutes to become visible to the resolver running the deploy. If `void email setup` has already written the exact `addresses` plan but that resolver still sees no subdomain MX, Void preserves the plan and stops before the build or upload. Run `void email status --platform cloudflare`, then retry the deploy after it sees Cloudflare's MX records.

Two rows live in `wrangler.jsonc` rather than in your account, and a deploy that finds every account row ready reconciles them with a plain file write, no prompt: the `addresses` array is rewritten whenever it is not the current derivation (an entry pruned since, a worker rename, a new handler), and `vars.__VOID_EMAIL_FROM` follows a changed `email.from`. Routing rules are `wrangler deploy`'s own work, so a committed `addresses` entry whose rule does not exist yet — the state right after `void email setup` — still reads ready; the address map marks it `(rule created by this deploy)`.

A subdomain is added to a zone that already routes. When Email Routing is **off** on the apex (`Enabled: false`), the subdomain step is not attempted at all — Void never enables routing on the apex from the subdomain path, since that would lock MX records over the apex's live mail — and the checklist prints the dashboard step (`Email → Settings → Subdomains → add mail.acme.com`) instead; `addresses` is withheld until routing on the subdomain reads ready.

### Subdomain or apex

Put mail on a **subdomain** (`mail.acme.com`) unless you have a reason not to. Cloudflare writes its MX and SPF records there and locks them; `acme.com` itself is not touched, so mail you already receive on the apex keeps flowing. The one rule Void enforces: **it never enables routing over live mail.** If the mail domain already has MX records that are not Cloudflare's, the email step stops:

```
acme.com already receives mail (aspmx.l.google.com). Void never enables routing over live mail. Use something@mail.acme.com.
```

The apex path (`email.from` on `acme.com` itself) is allowed with the same one Enter when the apex receives no mail yet (no MX records, or only Cloudflare's own). It is the only path with a catch-all — see the derivation table below.

**Subaddressing** is a per-zone Cloudflare setting, and it is off by default. Until it is on, a rule for `support@mail.acme.com` does not match `support+T-42@mail.acme.com`. The checklist's `turn on subaddressing for acme.com` row flips it for the whole zone — on the apex and every subdomain — so `email/support+[ticket].ts` works the way it does on the platform.

### What Void writes into `wrangler.jsonc`

```jsonc
{
  "send_email": [{ "name": "SEND_EMAIL" }],
  "vars": { "__VOID_EMAIL_FROM": "Acme <support@mail.acme.com>" },
  "addresses": ["support@mail.acme.com"],
}
```

- **`send_email`** — the binding `sendEmail()` delivers through, one `EmailMessage` per recipient. It is written once routing is enabled or sending is onboarded, never on a bare account. An existing `send_email` entry under another name is refused with the rename — a second binding would be silent.
- **`__VOID_EMAIL_FROM`** — your `email.from`, so the worker knows its default sender.
- **`addresses`** — derived from your `email/` directory. `wrangler deploy` turns each entry into an Email Routing rule pointing at this worker (a literal address → this worker; `*@acme.com` → the zone's catch-all). Rules and the catch-all are wrangler's job; Void only derives the list.

**Void owns the `addresses` array.** It is rewritten on every deploy from the current `email/` scan while every existing entry is still one Void derives, and deleted — never emptied to `[]`, which would remove every rule wrangler owns — when a later preflight finds routing not ready, with the reason printed (on every branch, including CI and a declined prompt; a stale array left in place would make wrangler's plan fail after the upload, on every deploy). Two consequences:

- An address already routed to another worker or to a forwarding rule is **pruned** from the array and reported (`! support@mail.acme.com  already routed to …; left alone, not in addresses`). wrangler's plan is never destructive on your account because of something Void derived.
- If the array holds entries Void did not derive, the deploy prints which ones and **skips the email step for that deploy** — the deploy itself continues and the array is left untouched. Remove them, or manage `addresses` by hand and leave `email.from` unset.

Deleting a handler leaves its address in `addresses`: the next deploy names it in a `✘` row as an entry Void no longer derives, and skips the email step until you remove that entry from `wrangler.jsonc` by hand (the row says which). Once removed, wrangler's plan drops the rule with its own y/n (default No) in a terminal, an error in CI. Removing the last handler and every `sendEmail()` call leaves the whole setup in `wrangler.jsonc`; the deploy warns which addresses are still routed to a worker with no `email()` export and how to detach them, and deploys as-is.

How handlers become addresses, with `email.from` on `mail.acme.com` under the zone `acme.com`:

| Handler                                                         | Address on a subdomain                               | Address on the apex          |
| --------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------- |
| `email/support.ts`, `email/support+[ticket].ts`                 | `support@mail.acme.com`                              | `support@acme.com`           |
| `email/_default.ts`                                             | **none** — a catch-all exists only on an apex        | `*@acme.com` (the catch-all) |
| `email/[user].ts`, `email/[user]+[tag].ts` (dynamic local part) | **refused** — a dynamic local part needs a catch-all | `*@acme.com` (the catch-all) |

On a subdomain, `email/_default.ts` gets no rule of its own, so it cannot make arbitrary `@mail.acme.com` addresses reach the worker. Mail admitted by an explicit rule can still fall through to `_default` when no handler pattern matches—for example, bare `support@mail.acme.com` admitted by the rule for `support+anything@`. Addresses that match no Cloudflare rule bounce before the worker runs. The checklist says so in a `!` row, and the handler is absent from the address map.

Inside the worker, a message reaches your handlers exactly as addressed — `support+T-42@mail.acme.com` matches `email/support+[ticket].ts` with `info.params.ticket === "T-42"` — and `setReject`, `forward` and `replyEmail` act on the real message. `replyEmail` defaults `from` to `message.to`, the address on your zone the mail was delivered to.

### Sending

`sendEmail()` uses the worker's own `SEND_EMAIL` binding; there is no proxy hop and no platform quota — Cloudflare's own limits apply, reported as `QUOTA_EXCEEDED`. The `void email usage`, `logs`, `destinations`, `allow` and `disallow` commands are platform commands and do not apply here.

Setup is per mail domain, not per direction: any use of email — an `email/` handler or a `void/email` import — sets the domain up for routing and sending together, so an app that only receives is still onboarded for Email Sending and still gets the binding; Cloudflare meters outbound per message, so a domain that never sends costs nothing, and `replyEmail` goes through Email Routing's own `message.reply()`, which needs no onboarding either way.

Who you can send to depends on your Workers plan. Onboarding the mail domain for Email Sending is what allows **arbitrary recipients**, and it needs **Workers Paid** — billing is dashboard-only, so Void cannot do that for you. On Workers Free the onboarding row fails and the deploy prints:

```
Workers Paid needed for arbitrary recipients. Inbound works; sendEmail() to verified destinations only.
```

Everything else — routing, rules, the binding — still goes through, and the address map ends with `outbound  sendEmail() from support@mail.acme.com   (verified destinations only)`. Verified destinations are the addresses under **Email Routing → Destination addresses** in your Cloudflare dashboard; a handler that `forward()`s to a new address needs the same verification click.

The refusal is remembered by the `send_email` binding that same run writes into `wrangler.jsonc`: Void writes the binding only after it has attempted the onboarding, so a committed binding next to a domain that is still not onboarded means "tried, refused". Later deploys ask nothing about it, `--require-email` passes, `void email status` reads the domain as set up (its sending row says `not onboarded — verified destinations only` and names the retry), and the address map keeps ending with `(verified destinations only)`. The deploy never retries the onboarding on its own. After upgrading to Workers Paid, run `void email setup --platform cloudflare` once: it asks `Onboard mail.acme.com for Email Sending?` and, on Yes, onboards the domain — from then on the map ends without the marker.

If `_dmarc.mail.acme.com` or `cf-bounce.mail.acme.com` already has a TXT record, sending onboarding is refused — it writes its own `_dmarc` (`p=reject`) and DKIM records and Cloudflare would answer with a conflict. Inbound is unaffected; remove the records or keep sending off.

### CI

The email prompt follows wrangler's own interactivity rule: a CI environment as wrangler detects it, or stdin or stdout not a terminal, means non-interactive. A non-interactive deploy that finds something not ready prints the checklist and

```
deploy: email on mail.acme.com is not set up, and this shell cannot ask.
Run `void email setup --platform cloudflare` once locally, commit wrangler.jsonc, then redeploy — deploying without email.
```

then deploys **without** email. Pass `--require-email` to fail instead. When setup has already committed the exact subdomain `addresses` plan and only its MX records are not visible yet, every deploy stops and preserves that plan until DNS can be verified. Automatic resource provisioning is not an escape hatch: it creates D1/KV/R2/Queue/Hyperdrive resources, never a mail setup. To read the rows without deploying or being asked anything, run `void email status --platform cloudflare`.

So the CI story is: run `void email setup --platform cloudflare` once on your machine (it runs the same preflight, checklist and prompt as the first deploy, then writes `wrangler.jsonc`, without deploying), commit `wrangler.jsonc`, and let CI run `void deploy --platform cloudflare --require-email`. Once the MX records are visible, the committed binding and `addresses` make every row read ready and nothing is asked — on Workers Free too, where the committed binding is what remembers the refused sending onboarding (see [Sending](#sending)).

### If the subdomain step is refused

Enabling routing on a subdomain and switching subaddressing on have no wrangler command, and neither does reading the subaddressing flag or telling a zone in another account from one not on Cloudflare. For those calls Void borrows your session's bearer through `wrangler auth token --json`, uses it inside one function, and drops it — nothing is stored, refreshed or written to disk (the child runs with `WRANGLER_WRITE_LOGS=false`, because wrangler would otherwise log the token). Every other read and write goes through Void's own pinned wrangler.

When either call is refused, or the token cannot be read, the deploy does not fail. It prints what Cloudflare answered and the one-time dashboard step:

```
✘ routing   mail.acme.com: Cloudflare answered 403 …
  Cloudflare dashboard → your zone → Email → Settings → Subdomains → add the subdomain, then redeploy
```

and **withholds `addresses` for that run** — no routing rule is created, so nothing points at a worker on a subdomain that does not yet receive mail. Do the dashboard step once and redeploy; the routing row then reads ready and `addresses` is written.

### What stays manual

1. One Enter on the first deploy — it changes your account and locks DNS records.
2. `void cloudflare login` once — or a `CLOUDFLARE_API_TOKEN` with Email Routing Edit + Email Sending Edit (what a CI runner needs).
3. `email.from` typed once.
4. Workers Paid, if you need `sendEmail()` to arbitrary recipients.
5. A verification click when a handler `forward()`s to a new destination.
6. The Subdomains form in the dashboard, only if the subdomain step above is refused.
7. A y/n when a deploy would delete a routing rule — wrangler's own semantics.
