---
outline: deep
---

# AI

Run Workers AI models and provider APIs from server code with `ai` from `void/ai`. Provider requests use Cloudflare's [AI Gateway](https://developers.cloudflare.com/ai-gateway/).

## Local Development

For a direct Cloudflare project, connect your account and start development:

```sh
void connect --platform cloudflare
npm run dev
```

When the app imports `void/ai`, Void enables a remote Workers AI binding during
development and preview. Requests use your Cloudflare account and its allowance;
Workers AI has no local simulator. Use your Cloudflare login or
`CLOUDFLARE_API_TOKEN` in an automated environment.

For a team platform, use `void connect <platform-url>` and link your project.
Development requests use that platform's account and usage limits.

## Basic Usage

Call `ai.run()` with a model name and inputs. Model names and input types are fully typed from `@cloudflare/workers-types`.

```ts
import { defineHandler } from 'void';
import { ai } from 'void/ai';

export const POST = defineHandler(async (c) => {
  const { prompt } = await c.req.json();

  return ai
    .run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [{ role: 'user', content: prompt }],
    })
    .match({ ok: (result) => c.json(result), limited: (limit) => limit.response() });
});
```

Every operation runs through `.match({ ok, limited })`. Both handlers are required. Return a fallback from `limited`, or use `limit.response()` to send a structured HTTP 429. Limits include `resource`, `reason`, and an optional `retryAt`; other failures throw. Await `.match()`, rather than the operation itself.

You can use any model available through Cloudflare's AI binding, including Workers AI models such as `@cf/meta/llama-3.3-70b-instruct-fp8-fast` and Cloudflare Gateway models such as `google/gemini-2.5-flash` or `openai/gpt-4.1-mini`. The input object must match the selected Cloudflare model's schema. Models that return binary data, such as generated images, are returned as a `Blob` from `ai.run()`.

## Streaming

Use `ai.stream()` to get a streaming response with SSE headers that you can return directly from a route handler:

```ts
import { defineHandler } from 'void';
import { ai } from 'void/ai';

export const POST = defineHandler(async (c) => {
  const { prompt } = await c.req.json();

  return ai
    .stream('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [{ role: 'user', content: prompt }],
    })
    .match({ ok: (result) => result, limited: (limit) => limit.response() });
});
```

Streaming responses end with a `void:error` SSE event if generation is interrupted after the response starts. A recognized quota interruption calls your `limited` handler and emits `void:limit`, preserving the message from `limit.response()`. `fetchStream()` throws on either terminal event so your UI can exit its generating state. This also applies to streaming provider responses and `ai.run()` with `stream: true`.

## Listing Models

Use `ai.models()` to list available models:

```ts
const models = await ai
  .models()
  .match({ ok: (result) => result, limited: (limit) => limit.response() });

// Filter by task
const textModels = await ai
  .models({ task: 'Text Generation' })
  .match({ ok: (result) => result, limited: (limit) => limit.response() });
```

## Markdown Conversion

Use `ai.toMarkdown()` to convert documents to markdown:

```ts
const result = await ai
  .toMarkdown([{ name: 'document.pdf', blob: pdfBytes }])
  .match({ ok: (result) => result, limited: (limit) => limit.response() });
```

## Usage Limits

Workers AI usage is measured in [neurons](https://developers.cloudflare.com/workers-ai/platform/pricing/).
On a direct deployment, usage belongs to your Cloudflare account. Provider-native
requests also use your provider credentials and their billing terms.

A team platform uses its own Cloudflare account and may apply per-user limits. Ask your administrator about the available allowance.

## Cloudflare Gateway Models

`ai.run()` mirrors Cloudflare's `env.AI.run()` model naming and input schemas. Third-party models use Cloudflare model IDs and Cloudflare-managed credentials.

```ts
const result = await ai
  .run('google/gemini-2.5-flash', {
    contents: [
      {
        role: 'user',
        parts: [{ text: 'Explain Durable Objects in one paragraph.' }],
      },
    ],
  })
  .match({ ok: (result) => result, limited: (limit) => limit.response() });
```

Pass AI Gateway options as the third argument: `ai.run(model, inputs, { gateway: { skipCache: true } })`.

For provider-native requests on a direct deployment, configure [`ai.gateway`](../integrations/cloudflare.md#ai-self-host).

## Provider-Native Requests

Use `ai.provider(provider).fetch(path, init)` for a provider-native API with your
own provider key. The request goes through the configured Cloudflare AI Gateway
and retains the provider's native HTTP shape. On a team platform, it also passes
through that installation's proxy.

### OpenAI

```ts
import { defineHandler } from 'void';
import { ai } from 'void/ai';

export const POST = defineHandler(async (c) => {
  const { prompt } = await c.req.json();

  return ai
    .provider('openai')
    .fetch('/chat/completions', {
      body: {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
      },
    })
    .match({ ok: (result) => result, limited: (limit) => limit.response() });
});
```

### Google AI Studio

```ts
const response = await ai
  .provider('google-ai-studio')
  .fetch('/v1/models/gemini-2.5-flash:generateContent', {
    body: {
      contents: [
        {
          role: 'user',
          parts: [{ text: 'What is Cloudflare?' }],
        },
      ],
    },
  })
  .match({ ok: (result) => result, limited: (limit) => limit.response() });
```

### Custom Providers

For providers that are not in Void's default key map, pass the secret name and API-key header:

```ts
const response = await ai
  .provider('custom-provider', {
    apiKeyEnv: 'CUSTOM_PROVIDER_API_KEY',
    apiKeyHeader: 'x-api-key',
    apiKeyPrefix: '',
  })
  .fetch('/v1/respond', {
    body: { prompt: 'Hello' },
  })
  .match({ ok: (result) => result, limited: (limit) => limit.response() });
```

### Image Generation

Use `ai.run()` or `ai.image()` for Cloudflare-native image models:

```ts
export const POST = defineHandler(async (c) => {
  const { prompt } = await c.req.json();
  return ai
    .image('@cf/black-forest-labs/flux-1-schnell', { prompt })
    .match({ ok: (result) => result, limited: (limit) => limit.response() });
});
```

Use `ai.provider().fetch()` for provider-native image APIs. Match the [provider's request schema](https://developers.openai.com/api/reference/resources/images/methods/generate):

```ts
export const POST = defineHandler(async (c) => {
  const { prompt } = await c.req.json();

  return ai
    .provider('openai')
    .fetch('/images/generations', {
      body: {
        model: 'gpt-image-2.5-sunburst',
        prompt,
        size: '1024x1024',
      },
    })
    .match({ ok: (result) => result, limited: (limit) => limit.response() });
});
```

For multipart provider APIs, pass `FormData`:

```ts
export const POST = defineHandler(async (c) => {
  const body = await c.req.parseBody();
  const form = new FormData();
  form.set('model', 'gpt-image-2.5-sunburst');
  form.set('prompt', String(body.prompt));
  form.set('image', body.image as Blob, 'source.png');

  return ai
    .provider('openai')
    .fetch('/images/edits', { body: form })
    .match({ ok: (result) => result, limited: (limit) => limit.response() });
});
```

### Provider Key Convention

Provider-native requests use a project secret, such as `OPENAI_API_KEY` for OpenAI or `GOOGLE_API_KEY` for Google AI Studio.

See the [provider key reference](../reference/api/resources.md#provider-keys) for supported providers and their secret names.

OpenAI-style providers use `Authorization: Bearer <key>`. Google AI Studio uses `x-goog-api-key`. Use `apiKeyHeader` and `apiKeyPrefix` for custom providers.

For production, add your API key as a project secret:

```bash
void secret put OPENAI_API_KEY=sk-...
```

For local development, add it to `.env` in your project root:

```
OPENAI_API_KEY=sk-...
```

### Streaming with Provider-Native APIs

Return the provider response directly. For example, add `stream: true` to the OpenAI request body shown above.
