---
outline: deep
---

# AI

Void provides a typed AI client for Workers AI and Cloudflare's [AI Gateway](https://developers.cloudflare.com/ai-gateway/). Import `ai` from `void/ai` and run inference directly from your route handlers. Direct deployments use your Cloudflare account; a team platform routes requests through its installation's proxy and usage controls.

```ts
import { ai } from 'void/ai';
```

## Handling usage limits

Every AI operation is lazy and must be executed with `.match({ ok, limited })`. Both handlers are required, including for provider-native requests, model listing and document conversion. Return a useful fallback from `limited`, or use `limit.response({ message: 'AI is temporarily unavailable.' })` to send a structured HTTP 429. Limits expose `resource`, `reason`, and an optional `retryAt`. Other failures still reject.

Do not await the operation itself; await its `.match()` call. TypeScript checks your handlers and the resulting success/fallback union.

Streaming responses end with a `void:error` SSE event if generation is interrupted after the response starts. A recognized quota interruption calls your `limited` handler and emits `void:limit`, preserving the message from `limit.response()`. `fetchStream()` throws on either terminal event so your UI can exit its generating state. This also applies to streaming provider responses and `ai.run()` with `stream: true`.

## Basic Usage

Call `ai.run()` with a model name and inputs. Model names and input types are fully typed from `@cloudflare/workers-types`.

```ts
import { defineHandler } from 'void';
import { ai } from 'void/ai';

export const POST = defineHandler(async (c) => {
  const { prompt } = await c.req.json();

  const result = await ai
    .run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [{ role: 'user', content: prompt }],
    })
    .match({ ok: (result) => result, limited: (limit) => limit.response() });

  return c.json(result);
});
```

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

OpenAI-compatible models use OpenAI-style `messages`:

```ts
const result = await ai
  .run('openai/gpt-4.1-mini', {
    messages: [{ role: 'user', content: 'Summarize this deploy.' }],
  })
  .match({ ok: (result) => result, limited: (limit) => limit.response() });
```

Pass Cloudflare AI Gateway options as the third argument:

```ts
const result = await ai
  .run(
    'openai/gpt-4.1-mini',
    {
      messages: [{ role: 'user', content: 'Summarize this deploy.' }],
    },
    {
      gateway: {
        skipCache: true,
      },
    },
  )
  .match({ ok: (result) => result, limited: (limit) => limit.response() });
```

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

  const response = await ai
    .provider('openai')
    .fetch('/chat/completions', {
      body: {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
      },
    })
    .match({ ok: (result) => result, limited: (limit) => limit.response() });

  const result = await response.json();
  return c.json(result);
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

const result = await response.json();
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

Provider-native requests require an API key set as a project secret. The env var name is automatically derived from the provider name:

| Provider prefix    | Env var               |
| ------------------ | --------------------- |
| `openai`           | `OPENAI_API_KEY`      |
| `anthropic`        | `ANTHROPIC_API_KEY`   |
| `google-ai-studio` | `GOOGLE_API_KEY`      |
| `deepseek`         | `DEEPSEEK_API_KEY`    |
| `groq`             | `GROQ_API_KEY`        |
| `mistral`          | `MISTRAL_API_KEY`     |
| `grok`             | `GROK_API_KEY`        |
| `openrouter`       | `OPENROUTER_API_KEY`  |
| `perplexity`       | `PERPLEXITY_API_KEY`  |
| `cohere`           | `COHERE_API_KEY`      |
| `cerebras`         | `CEREBRAS_API_KEY`    |
| `huggingface`      | `HUGGINGFACE_API_KEY` |
| `replicate`        | `REPLICATE_API_KEY`   |
| `baseten`          | `BASETEN_API_KEY`     |
| `cartesia`         | `CARTESIA_API_KEY`    |
| `deepgram`         | `DEEPGRAM_API_KEY`    |
| `elevenlabs`       | `ELEVENLABS_API_KEY`  |
| `fal`              | `FAL_API_KEY`         |
| `ideogram`         | `IDEOGRAM_API_KEY`    |
| `parallel`         | `PARALLEL_API_KEY`    |

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
