---
outline: deep
---

# Revalidation (ISR)

Revalidation caches rendered pages and refreshes them in the background. When a cached page becomes stale, visitors can keep reading it while the Worker renders an updated version. This is often called [Incremental Static Regeneration (ISR)](https://vercel.com/docs/incremental-static-regeneration).

This requires [SSR](../ssr.md) or [Pages mode](../pages-routing/overview) to be configured.

To disable Void's ISR caching across the app while keeping your per-page settings, set `"routing": { "isr": false }` in `void.json`. This overrides per-page revalidate and prerender policies. Set `isr` back to `true` to enable those policies again. Build-time HTML generation with `output: "static"` is unaffected.

## Enabling revalidation

Add a `routing.revalidate` field to `void.json` with a TTL in seconds:

```json
{
  "routing": {
    "revalidate": 60
  }
}
```

Setting `revalidate` to `0` disables revalidation (equivalent to plain SSR).

## Per-path revalidation

You can set different TTLs for different URL patterns using an object:

```json
{
  "routing": {
    "revalidate": {
      "/": 60,
      "/docs/*": 31536000,
      "/user/*": 0,
      "*": 30
    }
  }
}
```

Rules are matched in order, and the first match wins. The `*` glob matches any characters including `/`.

Special values:

- `31536000` (1 year): effectively cached until the next deploy, since deploys clear the ISR cache
- `0`: never cached and always rendered by the worker, which is equivalent to plain SSR for that path

## Per-page revalidation (Pages mode)

In [Pages mode](../pages-routing/overview), you can export a `revalidate` value from a `.server.ts` file to override the global config for that page:

```ts
// pages/products/index.server.ts
export const revalidate = 120; // cache for 2 minutes

export const loader = defineHandler(async (c) => {
  // ...
});
```

Per-page values take precedence over `void.json` patterns.

## Precedence

When multiple sources set a revalidate TTL, the most specific wins:

1. `x-revalidate` response header (per-response)
2. `.server.ts` export (per-page, Pages mode only)
3. `void.json` `routing.revalidate` path pattern match
4. `void.json` `routing.revalidate` global number or `"*"` fallback

## How revalidation works

1. **First request:** there is no cache entry yet. The worker renders the page, returns the response, and writes the result to KV in the background.

2. **Subsequent requests (fresh):** the cached response is served from the edge cache or KV. No worker call is needed.

3. **Subsequent requests (stale):** the stale cached response is served immediately, and the worker re-renders in the background. The next request gets the fresh version.

While a stale entry is available, visitors can receive it without waiting for the refresh. A request without a cached entry still needs to render the page.

## Per-response TTL override

Route handlers can set the `x-revalidate` response header to override the TTL for a specific response:

```ts
export const GET = defineHandler(async (c) => {
  // Don't cache this particular response
  c.header('x-revalidate', '0');

  return c.html('...');
});
```

- `x-revalidate: 0`: skip caching for this response
- `x-revalidate: 300`: cache for 5 minutes instead of the default

Only complete `200` responses are cached. A response with `Cache-Control: private`,
`no-store`, or `no-cache`, or any `Set-Cookie` header, stays private to that request.
If a previously public page starts returning one of those headers during background
revalidation, Void removes its HTML, Pages JSON, and KV cache entries.

## Cache bypass

Requests with `Cookie` or `Authorization` headers bypass the ISR cache entirely and always dispatch to the worker. This ensures personalized or authenticated pages are never served from a shared cache.

## Cache keys and rewrites

For a dispatch rewrite, the cache key includes both the destination and original pathname. A direct request to `/en/docs/foo` therefore uses a different entry from `/docs/foo` rewritten to that destination.

Query parameters are excluded by default. Add `routing.revalidateQueryAllowlist` when specific parameters should produce separate cached responses. Middleware `c.rewrite()` runs after the ISR lookup, so it doesn't create an additional cache variant.

Purge the destination pathname with `revalidate({ paths })`. Purging `/en/docs/foo` clears both direct and rewritten variants. Purging only `/docs/foo` won't clear them, because the entries are stored under the destination.

::: details Upgrading from the older ISR cache format

The current format uses a `v3` host-scoped prefix and a cache-policy version in its
metadata. Entries written before the current response-privacy policy are treated as
cold misses and refill only from responses that are safe to share.

Adding a rewrite also changes the affected page's cache key, so that page starts with a cold cache again.

:::

## On-demand revalidation

You can purge ISR cache entries programmatically from a route handler:

```ts
import { revalidate } from 'void/isr';

export const POST = defineHandler(async (c) => {
  // ... update content in database ...

  // Purge specific pages
  await revalidate({ paths: ['/', '/blog/hello-world'] });

  // Or purge all cached pages
  await revalidate({ all: true });

  return c.json({ ok: true });
});
```
