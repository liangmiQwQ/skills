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

### In `void.config.ts` (persistent)

```json
{
  "remote": true
}
```

### Via environment variable (one-off)

```bash
VOID_REMOTE=1 vite dev
```

`VOID_REMOTE=0` disables remote mode even if `void.config.ts` has `"remote": true`.

## Supported Bindings

| Binding | Local (default)            | Remote              |
| ------- | -------------------------- | ------------------- |
| D1      | Local SQLite via Miniflare | Remote D1 database  |
| KV      | Local file-backed KV       | Remote KV namespace |
| R2      | Local file-backed R2       | Remote R2 bucket    |
| AI      | Always proxied             | Always proxied      |

AI requests use your platform’s account and allowance in both local and remote mode. There is no local AI simulator.

## Checking Remote Mode

When the dev server starts with remote mode active, it prints:

```
⚡ Remote bindings active (my-project.apps.example.com)
   DB      → remote D1
   KV      → remote KV
   STORAGE → remote R2
```

## Limitations

- **Network latency:** each binding call makes a network request, so responses may be slower than local development.
- **R2 multipart uploads:** `createMultipartUpload()` and `resumeMultipartUpload()` are not supported in remote mode.
- **R2 conditional writes:** `put(..., { onlyIf })` requires a current Void platform and an active deployment with the native remote-binding handler. Update the platform and redeploy the project if this operation is unavailable. Failed preconditions return `null`.
- **D1 dump:** `db.dump()` is not supported in remote mode.
- **D1 batches:** `db.batch()` requires an updated platform and project deployment.
