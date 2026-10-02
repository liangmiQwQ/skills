---
outline: deep
---

# Resource Clients

## KV {#kv}

Imported from `"void/kv"`.

### `kv` {#kv-1}

Typed JSON-aware client for the inferred `KV` binding.

```ts
import { kv } from 'void/kv';

await kv.put('settings', { theme: 'dark' });
const settings = await kv.get<{ theme: string }>('settings');
```

**Key exports:** `kv`, `createKV(namespace)`, `KVClient`, `KVMap`, `PutOptions`, `ListOptions`.

`kv.map(prefix)` creates a typed namespaced view where every key is stored under `prefix:`.

## Storage {#storage}

Imported from `"void/storage"`.

### `storage` {#storage-1}

Default [R2 bucket](https://developers.cloudflare.com/r2/) proxy for the inferred `STORAGE` binding.

```ts
import { storage } from 'void/storage';

await storage.put('avatars/alice.png', file);
const object = await storage.get('avatars/alice.png');
```

**Key exports:** `storage`, `createStorage(bucket)`.

## AI {#ai}

Imported from `"void/ai"`.

### `ai` {#ai-1}

Typed AI client for Cloudflare AI models and provider-native AI Gateway requests.

```ts
import { ai } from 'void/ai';

const result = await ai
  .run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
    messages: [{ role: 'user', content: 'Summarize this release note.' }],
  })
  .match({ ok: (result) => result, limited: (limit) => limit.response() });

const response = await ai
  .provider('openai')
  .fetch('/chat/completions', {
    body: {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Summarize this release note.' }],
    },
  })
  .match({ ok: (result) => result, limited: (limit) => limit.response() });
```

**Key exports:** `ai`, `VoidAi`, provider request types. See [AI](../../guide/ai.md) for provider setup and streaming examples.

## ISR {#isr}

Imported from `"void/isr"`.

### `revalidate(options)` {#revalidate-options}

Revalidate ISR-cached pages on demand. In local development this is a no-op because there is no edge ISR cache.

```ts
import { revalidate } from 'void/isr';

await revalidate({ paths: ['/', '/blog/hello'] });
await revalidate({ all: true });
```

**Signature:**

```ts
function revalidate(options: { paths?: string[]; all?: boolean }): Promise<void>;
```

## Logging {#logging}

Imported from `"void/log"`.

### `logger` {#logger}

Structured logger that emits one JSON line per call so deployed logs can be filtered by message and fields.

```ts
import { logger } from 'void/log';

logger.info('checkout completed', { orderId, userId });
logger.error('webhook failed', { provider: 'stripe', attempt: 3 });
```

**Methods:** `logger.error(message, fields?)`, `logger.warn(message, fields?)`, `logger.info(message, fields?)`.
