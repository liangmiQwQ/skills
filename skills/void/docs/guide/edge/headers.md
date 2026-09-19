---
outline: deep
---

# Custom Headers

Define custom response headers in [`void.json`](../../reference/config) using the `routing.headers` field. Keys are URL patterns, values are arrays of `"Name: value"` strings.

```json
{
  "routing": {
    "headers": {
      "/assets/*": ["Cache-Control: public, max-age=31536000, immutable"],
      "/*": ["X-Frame-Options: DENY", "X-Content-Type-Options: nosniff"],
      "/*.html": ["Cache-Control: no-cache"]
    }
  }
}
```

## Rules

- **Pattern keys** start with `/`. `*` matches any characters including `/`.
- **Header values** use `Name: value` format. The value may contain colons.
- All matching rules are merged. When multiple rules set the same header name, the **last match wins**.
- User-defined `Cache-Control` overrides the built-in default. The default still applies when no rule matches.

## Example: security headers

```json
{
  "routing": {
    "headers": {
      "/*": [
        "X-Frame-Options: DENY",
        "X-Content-Type-Options: nosniff",
        "Referrer-Policy: strict-origin-when-cross-origin"
      ]
    }
  }
}
```

## Example: override caching

```json
{
  "routing": {
    "headers": {
      "/*.html": ["Cache-Control: public, max-age=300"],
      "/config.json": ["Cache-Control: no-store"]
    }
  }
}
```

## Scope

The dispatch Worker applies header rules to static assets, SSR pages, and API responses, including hashed assets served from cache. For example, you can add the cross-origin headers a page needs for Worker or WebAssembly files.

For hashed assets, you can add headers, but the platform keeps control of caching and response encoding. Rules cannot replace `Cache-Control`, `Content-Type`, `Content-Encoding`, `Content-Length`, `Content-Range`, `Accept-Ranges`, or `Transfer-Encoding` on these files.

Header rules do not apply to:

- ISR cache responses (these have their own cache-control headers)

### Blocked headers

`Set-Cookie` and `Clear-Site-Data` are ignored in header rules. On a shared domain such as `*.void.app`, a rule could otherwise affect cookies or data belonging to another project's subdomain.

## Framework `_headers` files

Meta-frameworks like SvelteKit, Nuxt, and Astro generate a `_headers` file with cache rules for their hashed asset directories. Void automatically parses this file during deploy and merges the rules into the deploy manifest.

- Framework-generated rules are applied **before** `void.json` rules. Since the last match wins, `routing.headers` in `void.json` takes precedence and can override framework defaults.
- The `_headers` file is not uploaded as a static asset. Its contents are parsed and included in the manifest only.

No configuration is needed. If the framework generates a `_headers` file, it is picked up automatically.

## How headers work

1. `void deploy` reads header rules from the framework `_headers` file (if present) and `routing.headers` in `void.json`, then includes them in the deploy manifest.
2. The platform stores the rules in the KV routing entry for your project.
3. The dispatch Worker adds matching headers before returning a response. Most cached responses include those headers. Hashed assets get header rules on each response, including cache hits, so a rule change takes effect without changing the file.

Headers are applied at the edge as part of serving the response; no separate network request is needed.
