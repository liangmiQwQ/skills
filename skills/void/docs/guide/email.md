---
outline: deep
---

# Email

Send transactional email from your app via [Cloudflare's `send_email` binding](https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/). Import `sendEmail` from `void/email` and Void handles MIME construction, binding inference, and a local-dev inbox.

```ts
import { sendEmail } from 'void/email';

const result = await sendEmail({
  from: 'Acme <acme+noreply@mail.void.cloud>',
  to: 'user@example.com',
  subject: 'Welcome',
  text: 'Thanks for signing up!',
  // html: '<p>Thanks for signing up!</p>', // optional — sent as multipart/alternative when paired with text
});

if (!result.ok) {
  if ('error' in result) {
    // Nothing was sent — the whole call failed before delivery.
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

Zero config on the Void platform (`void deploy`). Every Void project ships with:

- **Sender** — `<your-slug>+noreply@mail.void.cloud`. Used as the default `from` if you omit it. The platform owns the zone with Email Routing + DKIM + SPF + DMARC set up; you do nothing. Project slugs are capped at 56 characters so this local part fits RFC 5321's 64 octets; a project created before the cap with a longer slug must pass `from` explicitly.
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

The project owner's email (the GitHub address you signed up with) is added automatically when the project is created, so it skips `void email allow` — not the verification. See [Setup](#setup) for when it is verified at once and when there is a link to click.

::: warning When this is the right fit
The shared sender is great for: ops alerts to the team, notifications to the project owner, reply-by-email flows on top of inbound, internal/app-internal mail.

For SaaS sending to arbitrary end-users (every signup gets a welcome email), the per-recipient verification model doesn't fit. On [your own Cloudflare account](#your-own-cloudflare-account) with Workers Paid, Void onboards your mail domain for Email Sending, which lifts the verified-recipient gate. Otherwise use [Resend](https://resend.com), [Postmark](https://postmarkapp.com), or [SES](https://aws.amazon.com/ses/) directly — install their SDK and call it from your handler. We may formalize this with a provider abstraction later if there is demand; until then, calling the SDK directly is simple enough that the wrapper would not earn its keep.
:::

## Options

| Option        | Type                         | Notes                                                            |
| ------------- | ---------------------------- | ---------------------------------------------------------------- |
| `from`        | `string \| { email, name? }` | Optional. Pinned to the project sender — see below.              |
| `to`          | `Address \| Address[]`       | Required. One or more recipients.                                |
| `subject`     | `string`                     | Required. UTF-8 supported (encoded as RFC 2047).                 |
| `text`        | `string`                     | At least one of `text` / `html` is required.                     |
| `html`        | `string`                     | Sent as `multipart/alternative` if both are provided.            |
| `replyTo`     | `Address`                    | Optional `Reply-To` header.                                      |
| `cc`, `bcc`   | `Address \| Address[]`       | Optional. Each recipient is sent its own message envelope.       |
| `headers`     | `Record<string, string>`     | Custom headers; reserved headers (From, Date, etc.) are ignored. |
| `attachments` | `Attachment[]`               | See [Attachments](#attachments).                                 |

At most 100 recipients across `to`, `cc` and `bcc` per call. Each address is checked with [`email-validator`](https://www.npmjs.com/package/email-validator): an ASCII dot-atom local part (before the `@`) of at most 64 characters — no whitespace, control character or RFC 5322 special, no leading, trailing or doubled dot, and no quoted local part — and a dotted domain of ASCII labels (at most 63 characters each) whose TLD starts with a letter and is at least 2 characters, so `user@localhost` is refused and an IDN domain must be given as punycode (`xn--…`); at most 254 characters in total (RFC 5321: a 256-octet forward-path `<local@domain>` and a 64-octet local part are the longest every receiver must accept). The address itself carries no display-name syntax; a display name goes around it (`"Name <addr>"` or `{ email, name }`). All of these are checked before anything is built and return `INVALID_TO` (`INVALID_FROM` for `from`; `MIME_ERROR` for `cc`, `bcc` and `replyTo`). The platform's inbound router applies the same package to `forward()` and `reply()` addresses, so nothing a handler records is dropped there for its shape. Custom header names must be RFC 5322 field names (printable ASCII, no colon); a name too long to fit a 998-octet line — a field name cannot be folded — is rejected with `MIME_ERROR` before anything is built.

`Address` accepts either a string (`"hello@acme.dev"` or `"Name <hello@acme.dev>"`) or an object (`{ email, name? }`). Display names with non-ASCII characters are RFC 2047 encoded automatically.

On the platform the sender is pinned to your project. `from` must be your project's own platform address — `<project-slug>@mail.void.cloud` or `<project-slug>+<tag>@mail.void.cloud`, optionally with a display name (`Acme <acme+noreply@mail.void.cloud>`). Anything else is rejected with `INVALID_FROM`. Omit `from` and Void fills in `<project-slug>+noreply@mail.void.cloud` for you. Sending from your own domain on the platform is not supported yet.

On your own Cloudflare account, `from` defaults to `email.from` from `void.json` and must be on a domain your account can send from; Cloudflare rejects any other sender and `sendEmail` reports it as `INVALID_FROM`.

## Attachments

```ts
await sendEmail({
  from: 'Acme <acme+noreply@mail.void.cloud>',
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
  from: 'Acme <acme+noreply@mail.void.cloud>',
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

`contentType` is inferred from the filename extension when omitted; when given, it must be a valid media type (`type/subtype`, optionally followed by `; attribute=value` parameters — no `name`, which is set from `filename`), or `sendEmail` returns `MIME_ERROR`. `contentId` is the identifier the HTML references as `cid:<id>`: letters, digits, the RFC 5322 `atext` symbols and dots, optionally with an `@domain` part and optionally in one pair of angle brackets (`logo`, `logo@acme.dev` and `<logo@acme.dev>` all render as `Content-ID: <…>`); anything else — whitespace, quotes, parentheses, a stray `<` or `>`, or an empty string — returns `MIME_ERROR`. Total message size (after base64 expansion) is capped at 10 MB to match Cloudflare's limit; oversize payloads return `MIME_ERROR` instead of failing upstream.

## Result and errors

`sendEmail` returns a discriminated union — there are no thrown errors:

```ts
interface SendEmailDelivery {
  recipient: string; // the envelope `To` used for this CF send
  messageId: string;
}

type SendEmailRecipientResult =
  | { recipient: string; ok: true; messageId: string }
  | { recipient: string; ok: false; error: SendEmailError };

type SendEmailResult =
  | { ok: true; ids: SendEmailDelivery[] }
  | { ok: false; error: SendEmailError } // pre-flight failure
  | { ok: false; deliveries: SendEmailRecipientResult[] }; // mid-batch failure
```

`ids` carries one entry per envelope send. Because the CF `EmailMessage` envelope is single-recipient, multi-recipient calls (`to`/`cc`/`bcc`) fan out into one CF send per unique address, each with its own messageId. Addresses are matched case-insensitively across the three fields and `recipient` is the lowercased address; a capture under `void dev` or the test harness reports the same list.

There are three discriminated cases:

- **All success** (`ok: true`) — every recipient delivered.
- **Pre-flight failure** (`ok: false`, has `error`) — validation / MIME / missing binding rejected the call before any sends were attempted. Retrying the whole call is safe.
- **Mid-batch failure** (`ok: false`, has `deliveries`) — sends were attempted and some failed. Each recipient has its own per-recipient outcome (`ok: true` with `messageId`, or `ok: false` with `error`). Retry only recipients with `ok: false` — re-sending to ones with `ok: true` will deliver duplicates. The list always names every recipient of the call; an incomplete or malformed list from the platform proxy is reported as a top-level `UPSTREAM_ERROR` (`result.error`), never as a partial `deliveries`.

```ts
const result = await sendEmail({ to: ['a@x.dev', 'b@x.dev', 'c@x.dev'], ... });
if (result.ok) {
  // every recipient delivered
} else if ('error' in result) {
  // pre-flight failure — retry the whole call
} else {
  // mid-batch failure — retry only the failed recipients
  const toRetry = result.deliveries.filter((d) => !d.ok).map((d) => d.recipient);
}
```

Error codes:

| Code                     | Meaning                                                                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BINDING_MISSING`        | No email transport: neither the worker's own `SEND_EMAIL` binding (an own-account deploy without `email.from`) nor the platform proxy is available, or a Class B/C dev server. |
| `INVALID_FROM`           | `from` was missing, malformed, not the project sender (platform), or a sender Cloudflare would not accept (own account).                                                       |
| `INVALID_TO`             | `to` was empty, contained an invalid or over-long address, or the call had more than 100 recipients.                                                                           |
| `UNVERIFIED_DESTINATION` | Cloudflare rejected the recipient as unverified.                                                                                                                               |
| `MIME_ERROR`             | Failed to build the MIME message (oversize attachments, malformed input).                                                                                                      |
| `QUOTA_EXCEEDED`         | Platform quota for outbound email reached (retry next billing period), or Cloudflare's own rate or daily limit on the sending account — the platform's, or your own.           |
| `UPSTREAM_ERROR`         | Other binding failure; the original error is attached as `error.cause`.                                                                                                        |

Which branch carries the code depends on when the send failed.
`BINDING_MISSING`, `INVALID_FROM`, `INVALID_TO` and `MIME_ERROR` are pre-flight,
so they arrive as a top-level `result.error`. `UNVERIFIED_DESTINATION` is always
per-recipient and therefore only ever appears inside `result.deliveries` —
never as `result.error`. `QUOTA_EXCEEDED` and `UPSTREAM_ERROR` can arrive either
way. Narrow with `'error' in result` rather than assuming.

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
  from: 'acme+noreply@mail.void.cloud',
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
      from: 'acme+noreply@mail.void.cloud',
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

On the platform the `from` default is **not** `message.to`. A reply is sent from
your project's own slug on the platform mail zone — `<slug>+noreply@<domain>` —
built from the `__VOID_PROJECT_SLUG` and `__VOID_EMAIL_DOMAIN` bindings the
platform injects. `replyEmail` throws when the slug is set but the domain is
absent and you omitted `from`, rather than guessing a sender. With no slug at
all — a worker on your own Cloudflare account — the reply is sent from
`message.to`, the address on your own zone the message was delivered to.

::: warning The platform pins the reply sender
You may override `from`, but only with an address on your own slug. The proxy
accepts a reply sender whose local-part before the first `+` equals the slug the
message was delivered to, on the zone it arrived on. Anything else is **dropped
silently** — `replyEmail` still resolves, and the only trace is in the platform's
log stream, not your project's.

This is what stops one project replying as another project's address. Note that
`message.to` is the _stripped_ address (`<tag>@<domain>`), so `from: message.to`
is exactly the shape the pin rejects.
:::

::: warning The platform gates the reply recipient
A reply's `to` goes through the same gate as `sendEmail()` and `forward()`: it
must be one of your project's verified destinations —
`void email allow <address>`, then the recipient's verification click. A reply
to any other address is **dropped silently**: the inbound message is still
accepted, `replyEmail` still resolves, nothing reaches your worker, and the
only trace is in the platform's log stream, not your project's.

So the ticket example above answers only senders you have allowlisted. An
auto-responder to arbitrary senders needs
[your own Cloudflare account](#your-own-cloudflare-account)
(`--platform cloudflare`), where `reply()` is Cloudflare's own reply-to-sender
and Void adds no allowlist.
:::

Note the asymmetry with `sendEmail`: `sendEmail` returns an error result and
never throws, while `replyEmail` throws when it cannot determine a sender.

### Configuring inbound delivery

In production, inbound runs on one shared mail facility. The platform routes `<slug>+anything@<mail domain>` to your worker's `email()` export — **there is nothing to configure in the Cloudflare dashboard and no per-project DNS work**. Your handlers are live as soon as the deploy lands.

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

The harness uses the same precedence rules as the production dispatcher. Reserved key `_default` mirrors `email/_default.ts`. It also applies the platform's inbound admission limits before your handler runs: a message over 10 MiB, or carrying more than 1024 distinct headers, is recorded in `rejects` and the handler is not called — exactly what the platform does before dispatch. With `slug: null` there is no platform router in front of the worker, so neither limit applies.

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

On the second deploy every row reads ready: no prompt, no account call, and wrangler reports `Email Routing rules are up to date.` Answer No, and the deploy continues without email.

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

On a subdomain, `email/_default.ts` gets no rule and never runs: mail to any other `@mail.acme.com` address bounces at Cloudflare. The checklist says so in a `!` row, and the handler is absent from the address map.

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

then deploys **without** email. Pass `--require-email` to fail instead. Automatic resource provisioning is not an escape hatch: it creates D1/KV/R2/Queue/Hyperdrive resources, never a mail setup. To read the rows without deploying or being asked anything, run `void email status --platform cloudflare`.

So the CI story is: run `void email setup --platform cloudflare` once on your machine (it runs the same preflight, checklist and prompt as the first deploy, then writes `wrangler.jsonc`, without deploying), commit `wrangler.jsonc`, and let CI run `void deploy --platform cloudflare --require-email`. With the binding and `addresses` committed, every row reads ready and nothing is asked — on Workers Free too, where the committed binding is what remembers the refused sending onboarding (see [Sending](#sending)).

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
