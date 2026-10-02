---
outline: deep
---

# Custom Headers

Define custom response headers in [`void.config.ts`](../../reference/config) using the `routing.headers` field. Keys are URL patterns, values are arrays of `"Name: value"` strings.

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

## Scope

Header rules apply to static assets, SSR pages, and API responses, including hashed assets served from cache.

For hashed assets, you can add headers, but the platform keeps control of caching and response encoding. Rules cannot replace `Cache-Control`, `Content-Type`, `Content-Encoding`, `Content-Length`, `Content-Range`, `Accept-Ranges`, or `Transfer-Encoding` on these files.

Header rules do not apply to ISR cache responses.

### Blocked headers

`Set-Cookie` and `Clear-Site-Data` are ignored in header rules. On a shared domain such as `*.void.app`, a rule could otherwise affect cookies or data belonging to another project's subdomain.

## Framework `_headers` files

Void reads `_headers` files produced by supported frameworks. Your `routing.headers` rules run afterward, so they can override framework defaults. No additional setup is needed.
