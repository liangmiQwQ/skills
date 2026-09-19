---
outline: deep
---

# Remote Development

Void normally uses local D1, KV, and R2 through [Miniflare](https://miniflare.dev/). Remote mode lets you run local code against a project deployed to your Void platform, for example to test with existing data or investigate an issue.

Calls such as `db.select()` and `env.KV.get()` use the deployed resources without changing your application code. Writes affect real data, so use a staging project when possible.

## Prerequisites

Before enabling remote mode, you need:

1. Connect to your team's platform with `void connect <url>`. It signs you in when needed.
2. Link a project with `void project link`. Deploy it at least once so its resources exist.

## Enabling Remote Mode

### In `void.json` (persistent)

```json
{
  "remote": true
}
```

### Via environment variable (one-off)

```bash
VOID_REMOTE=1 vite dev
```

`VOID_REMOTE=0` disables remote mode even if `void.json` has `"remote": true`.

## Supported Bindings

| Binding | Local (default)            | Remote              |
| ------- | -------------------------- | ------------------- |
| D1      | Local SQLite via Miniflare | Remote D1 database  |
| KV      | Local file-backed KV       | Remote KV namespace |
| R2      | Local file-backed R2       | Remote R2 bucket    |
| AI      | Always proxied             | Always proxied      |

AI inference is always routed through the proxy regardless of remote mode. There is no local AI emulation.

## How It Works

In remote mode, binding calls go through your platform's proxy, authenticated with your login token. The proxy uses the linked project's configuration to choose the D1 database, KV namespace, or R2 bucket.

You don't need to change any code. Imports like `import { db } from "void/db"` and direct binding access via `c.env.KV` both work transparently.

When the dev server starts with remote mode active, it prints:

```
⚡ Remote bindings active (my-project.void.app)
   DB      → remote D1
   KV      → remote KV
   STORAGE → remote R2
```

## Limitations

- **Network latency:** each binding call makes a network request, so responses may be slower than local development.
- **R2 multipart uploads:** `createMultipartUpload()` and `resumeMultipartUpload()` are not supported in remote mode.
- **R2 conditional writes:** `put(..., { onlyIf })` requires a current Void platform and an active deployment with the native remote-binding handler. Update the platform and redeploy the project if this operation is unavailable. Failed preconditions return `null`; Void never retries a conditional write as an unconditional REST upload.
- **D1 dump:** `db.dump()` is not supported in remote mode.
- **D1 batch compatibility:** `db.batch()` requires an active deployment with the native remote-binding handler. Void does not split a batch into REST calls because that would lose D1's atomic all-or-nothing behavior.
- **Writes affect real data:** remote mode connects to your actual deployed resources. Inserts, updates, and deletes are real, so use it carefully or point it at a staging project.
