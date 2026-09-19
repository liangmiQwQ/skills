---
outline: deep
---

# Static Assets Caching

Void caches static assets on Cloudflare's edge network. Hashed build files can be reused across deploys, while other files use cache keys tied to the deployment.

## Hashed assets

Files in Vite's `build.assetsDir` (default `assets/`) are produced with content hashes in the filename, such as `assets/app-Ab3xK9.js`. These files are immutable because the filename changes whenever the content changes, so they get aggressive caching:

```
Cache-Control: public, max-age=31536000, immutable
```

Cached at the edge for up to one year. Browsers cache them indefinitely. Because the cache key is unversioned, hashed assets survive across deploys without re-fetching.

If your Vite config customizes `build.assetsDir`, Void automatically detects this and applies the immutable optimization to the configured directory:

```ts
// vite.config.ts
export default defineConfig({
  build: {
    assetsDir: 'static', // hashed assets go to dist/client/static/
  },
});
```

If `build.assetsDir` is set to `""`, meaning hashed files live at the root, the optimization is skipped because there is no directory-based way to distinguish hashed from non-hashed files.

Void also includes presets for where supported meta frameworks (Astro, Nuxt, SvelteKit, etc.) place their hashed assets, so framework-generated assets enjoy optimal caching out of the box.

## Non-hashed assets

Everything else such as `index.html`, `favicon.ico`, and `/about` is edge-cached using deploy-versioned cache keys. On each deploy, the version changes and previous cache entries are invalidated automatically, so there is nothing to purge.

```
Cache-Control: public, s-maxage=31536000, max-age=0, must-revalidate
```

Cached at the edge until the next deploy. Browsers always revalidate on the next request.

**What gets cached:**

- All `GET` requests for non-SSR projects such as SPAs and static sites
- GET requests with file extensions (`.ico`, `.png`, `.css`, etc.) in SSR projects

**What does NOT get cached:**

- `/api/*` routes, which always hit the worker
- SSR-rendered pages (paths without file extensions in SSR projects)
- Non-GET requests
- Responses other than a complete `200`

### Opting out

If your worker serves dynamic content at a URL that looks static (e.g., a dynamically generated image at `/avatar.jpg`), you can prevent caching by setting `Cache-Control: private` or `Cache-Control: no-store` in your response headers. Any response with `Cache-Control` containing `private`, `no-store`, or `no-cache`, or with a `Set-Cookie` header, bypasses the edge cache.

## ETags and 304 Not Modified

All static asset responses include an `ETag` header derived from the file's content hash in R2. When a browser revalidates a cached resource, it sends `If-None-Match` with the previous ETag. If the file has not changed, the edge returns **304 Not Modified** with no body. That saves bandwidth and speeds up page loads.

This happens automatically for all static assets. No configuration is needed.

## Custom headers

You can override caching headers or add your own for any static asset path using [Custom Headers](./headers).

## Request pipeline

Static assets can run in front of the worker, behind the worker, or without any worker at all. Void chooses the pipeline from the app shape so static pages stay static unless application code must inspect document navigations.

### Deploy shapes

| Shape                                                                              | Worker deployed | First handler for assets | First handler for document navigations | Miss behavior                                                                                                          |
| ---------------------------------------------------------------------------------- | --------------- | ------------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `inference.appType: "static"`                                                      | No              | Asset platform           | Asset platform                         | Platform 404 page.                                                                                                     |
| Static SPA deploy                                                                  | No              | Asset platform           | Asset platform                         | Platform serves `/index.html` for unmatched navigations. If user `routing.fallbacks` exist, Void ships fallback rules. |
| Void app with only `/api` routes or managed auth                                   | Yes             | Worker first for `/api`  | Asset platform                         | Static navigations keep the platform SPA fallback; API requests, including document navigations, reach the worker.     |
| Void app with `middleware/`, non-`/api` routes, document WebSockets, live bindings | Yes             | Worker first             | Worker first                           | Asset misses stay 404, then the worker serves `/index.html` for HTML requests after routes and middleware run.         |
| Pages, SSR, and framework apps                                                     | Yes             | Worker first             | Worker first                           | Asset misses stay 404. Pages, SSR, or framework rendering owns HTML responses, including intentional HTML 404s.        |

### Worker-first Void apps

For worker-owned HTML, Void sets Cloudflare assets to `not_found_handling: "none"` and configures `run_worker_first`. The request order is:

1. Platform routing rules that always run before assets, such as redirects and forced rewrites.
2. Worker route table, middleware, auth, WebSocket upgrades, Pages, or SSR.
3. `env.ASSETS.fetch()` from inside the worker for static files.
4. For non-Pages, non-SSR Void apps only, a worker-side SPA fallback to `/index.html` when the original request accepts HTML.
5. The worker's original 404.

This is the path needed for preview auth and other middleware. Cloudflare's platform SPA fallback can serve `index.html` directly for browser navigations; when that happens, middleware never sees the request. Worker-owned HTML avoids that by moving fallback HTML behind middleware.

### Asset-first Void apps

For Void apps with only `/api` routes, Void keeps the platform SPA fallback and scopes `run_worker_first` to `/api` and `/api/*`. Static assets and non-API SPA navigations stay on the asset platform. API requests, including browser document navigations such as OAuth callbacks, reach the worker instead of being rewritten to `index.html`.

### Unmatched requests

`not_found_handling` decides what the asset layer does with a request that matched no asset and no worker route. Void infers it:

| App shape                                         | Inferred value                   | Result for an unknown URL        |
| ------------------------------------------------- | -------------------------------- | -------------------------------- |
| Pages or SSR                                      | `none`                           | The worker's own 404             |
| Worker owns HTML, no `pages/`, no SSR entry       | `none` + worker fallback         | `index.html` with status **200** |
| Asset-first (only `/api` routes, or none)         | `single-page-application`        | `index.html` with status **200** |
| Framework deploy (SvelteKit, Nuxt, Analog, Astro) | `none` — pinned, not overridable | The framework worker's own 404   |

Apps with middleware, a route outside `/api`, document WebSockets, or Live send requests through the Worker first. If they have no Pages or SSR entry, the Worker can then serve `index.html` for HTML navigation. Middleware and auth run before that fallback.

A SPA needs `index.html` for deep links so its client router can load. A generated static site usually needs a real `404.html` instead. Void can't distinguish the two from built files alone. Set [`routing.notFound`](../../reference/config.md#routing-notfound) for the behavior you want:

```json
{ "routing": { "notFound": "404-page" } }
```

Choose `"single-page-application"`, `"404-page"`, or `"none"`. This leaves `run_worker_first` unchanged, so the same requests still reach your middleware and API handlers.

Choosing anything other than `"single-page-application"` disables the Worker's `index.html` fallback. With `"404-page"`, unmatched HTML navigation uses the asset layer's nearest `404.html`. Intentional API `404` responses keep their body, status, and headers. If no `404.html` exists, the Worker's original `404` is kept.

SvelteKit, Nuxt, Analog, and Astro manage their own not-found behavior. Void ignores `routing.notFound` for those deploys and prints a warning. Their prerendered files are served first, and the framework handles unmatched routes without a platform SPA fallback replacing its error page.

TanStack Start, React Router, and vinext follow the rows above on a managed `void deploy` — that path resolves the asset config itself and applies it to the uploaded Worker. Void writes no `assets` policy into their generated Worker config:

| Framework      | Generated worker config      |
| -------------- | ---------------------------- |
| TanStack Start | `dist/server/wrangler.json`  |
| React Router   | `build/server/wrangler.json` |
| vinext (App)   | `dist/server/wrangler.json`  |
| vinext (Pages) | `dist/ssr/wrangler.json`     |

For direct Cloudflare deployment, these frameworks need a complete `assets` policy in their own config: `binding`, `directory`, `not_found_handling`, and `run_worker_first`. Void preserves that policy. Without one, Cloudflare's default applies. The build warns when `routing.notFound` is set so you know to check the framework's asset configuration.

### Generated config

Void owns the generated asset routing policy during dev and build for Void apps. If a root `wrangler.jsonc` contains stale `not_found_handling` or `run_worker_first` values, Void replaces those fields so generated config cannot accidentally change which layer sees a request first.

TanStack Start and React Router are the exception: Void generates no asset policy for them and leaves both fields to your own Cloudflare config. Writing `not_found_handling` alone would make the asset layer answer unmatched requests and the framework Worker would never run, and completing the policy needs `assets.binding` and `assets.directory` that the framework owns, not Void.

## API routes and SSR pages

API responses (`/api/*`) and SSR-rendered pages without file extensions always hit the worker. They are **not** edge-cached by the dispatch layer.
