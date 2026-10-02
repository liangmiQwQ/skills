---
outline: deep
---

# Sandboxes

Use a Cloudflare Sandbox to run commands, work with files, and connect to servers from server code. Each Sandbox ID selects an isolated container.

```ts
import { defineHandler } from 'void';
import { getSandbox } from 'void/sandbox';

export const POST = defineHandler(async (c) => {
  const sandbox = await getSandbox('default');
  return sandbox.run(['node', '--version']).match({
    ok: (result) =>
      c.json({
        exitCode: result.exitCode,
        stdout: new TextDecoder().decode(result.stdout),
      }),
    limited: (limit) => limit.response({ message: 'Execution is temporarily unavailable.' }),
  });
});
```

Importing from `void/sandbox` enables the required resources. Local development, native Cloudflare deployments, and Void Platform share the same runtime API.

## Configuration

The default environment provides Node.js 24 on Debian Trixie. Local development and native deploys need Docker running. Managed platform deploys use Cloudflare's managed Node.js image.

Use `void.config.ts` when you need a custom image or container size:

```ts
import { defineConfig } from 'void/config';

export default defineConfig({
  sandbox: {
    image: './Dockerfile.sandbox',
    platformImage: 'registry.cloudflare.com/<account-id>/sandbox@sha256:<digest>',
    instanceType: 'standard-1',
  },
});
```

| Field               | Default                     | Description                                                          |
| ------------------- | --------------------------- | -------------------------------------------------------------------- |
| `binding`           | `SANDBOX`                   | Binding name for local and native Cloudflare use                     |
| `className`         | `SandboxV1`                 | Durable Object class for local and native Cloudflare use             |
| `containerName`     | `void-sandbox-v1`           | Cloudflare container application name                                |
| `image`             | Packaged Node.js Dockerfile | Dockerfile or digest-pinned Cloudflare registry image for native use |
| `imageBuildContext` | Directory of `image`        | Docker build context                                                 |
| `platformImage`     | `cloudflare/debian-trixie`  | Image used by managed platform deploys                               |
| `instanceType`      | `lite`                      | `lite`, `standard-1`, `standard-2`, `standard-3`, or `standard-4`    |

Custom images must include the helper matching Void's installed Sandbox SDK version. The SDK image supplies this binary, but is not a runnable environment itself:

```dockerfile
FROM node:24.21.0-trixie-slim
COPY --from=docker.io/cloudflare/sandbox:1.0.0 /usr/local/bin/sandbox-shim /usr/local/bin/sandbox-shim
WORKDIR /workspace
CMD ["sleep", "infinity"]
```

For a managed platform, push your custom image to that platform account's Cloudflare registry and set `platformImage` to its digest-pinned reference. If `image` is already a Cloudflare registry reference, it also becomes the default `platformImage`. External registries and mutable tags are not supported. See [Cloudflare's image management guide](https://developers.cloudflare.com/containers/guides/image-management/#push-images-to-the-cloudflare-registry).

## Runtime API

`getSandbox(id, options)` resolves a Sandbox without starting it. The first command, file operation, or port request starts the container. IDs contain 1–63 characters and are lowercased by default; pass `normalizeId: false` to preserve case.

```ts
import { getSandbox } from 'void/sandbox';

const sandbox = await getSandbox(`user-${user.id}`, {
  inactivityTimeoutMs: 10 * 60 * 1000,
  enableInternet: false,
});
const response = await sandbox
  .run(['node', '--version'], {
    signal: AbortSignal.timeout(5_000),
  })
  .match({
    ok: (result) => Response.json({ exitCode: result.exitCode }),
    limited: (limit) => limit.response(),
  });
```

Commands take an executable and arguments as an array. For shell syntax, explicitly run `['sh', '-c', command]`. Execution options include `cwd` (default `/workspace`), `env`, `user`, `signal`, `pty`, `stdin`, `stdout`, and `stderr`.

`run()` collects command output and handles limits throughout execution with one required `.match({ ok, limited })`. Both handlers are required. Other failures still reject.

`exec()` returns a lazy operation yielding a process through its `ok` handler. Use `output()` to collect `stdout` and `stderr` as `ArrayBuffer`s with the exit code, or read the streams and match `exitCode`. Both `output()` and `exitCode` require their own `.match({ ok, limited })`. Matching `exitCode` keeps a long command active during pauses in its output; unattended background commands can stop when the Sandbox becomes idle.

Use `stdin: 'pipe'` for a writable input stream. `kill(signal?)` stops a process, and `resize(cols, rows)` resizes its terminal.

File operations live under `sandbox.files`: `readFile`, `writeFile`, `stat`, `lstat`, `readDirectory`, `mkdir`, `rename`, and `remove`. Each file operation requires `.match({ ok, limited })`. `readFile()` yields a streaming `Response` to `ok`; use `.text()`, `.arrayBuffer()`, or `.body`. `writeFile()` accepts text, binary data, or a byte stream. Relative file paths require an explicit `cwd` option.

To reach a server inside the container, call `sandbox.fetch(port, new Request(url)).match({ ok, limited })`. `sandbox.running()` checks whether the container is running; `sandbox.destroy()` stops it.

`getSandbox()` options include `inactivityTimeoutMs` (default ten minutes, maximum six hours), `enableInternet` (default `false`), and string `labels`. Internet access and labels take effect on the next container start. `binding` selects a custom native binding; managed platforms use the configured binding.

For code that runs on both deployment targets, use `getSandbox()`. Direct access through `c.env.SANDBOX` is available only on local and native Cloudflare deployments.

The `limited` handler receives `resource: 'sandbox'`, a `reason` of `concurrency` or `runtime_budget`, and `response({ message })` for a structured HTTP 429. Keep user input available so it can be retried. Resolving a Sandbox, checking `running()`, stopping a process, and `destroy()` do not need a quota handler; cleanup remains available after a limit.

## State persistence

`getSandbox(id)` selects the same Durable Object for that ID within a deployment. Native Cloudflare deployments preserve that namespace across Worker versions. Each managed platform deployment has its own namespace; rolling back to a retained deployment reconnects to that deployment's namespace.

Files, running processes, and listening servers last only as long as the container. It can stop after inactivity, crash, or restart. Save anything you need to keep in your database, KV, or R2. Deleting a project on a Void platform removes both its Durable Objects and containers.

## Deployment

Sandboxes require [Workers Paid](https://dash.cloudflare.com/?to=/:account/workers/plans) and Containers access. A managed platform's runtime token needs Account / Containers: Edit and Account / Cloudchamber: Edit.

`void deploy --platform cloudflare` builds native images and deploys the Sandbox alongside the application. `void deploy` on a connected Void Platform applies the platform's Sandbox concurrency and runtime limits. Upgrade the platform before deploying an application built with this Sandbox API.

## Moving from Sandbox SDK 0.x

Update string commands to argument arrays, move file calls under `.files`, and consume process output and file responses as shown above. Replace `sleepAfter` and `keepAlive` with `inactivityTimeoutMs`; remove `maxInstances` from configuration. The old `Sandbox` export, sessions, code interpreter, process-list helpers, and preview-URL helpers are no longer part of this API.

Existing native 0.x Sandboxes need a new Worker configuration and namespace. Back up container files and any Durable Object data, choose a fresh `worker.name`, and remove the old Sandbox bindings, containers, and migrations from that new configuration before deploying. The new default class is `SandboxV1`; existing state does not transfer automatically. Retain the old Worker until you have validated the replacement and restored your data, then clean up its resources. See [Cloudflare's scheduling-policy migration guide](https://developers.cloudflare.com/containers/guides/migrate-to-durable-object-scheduling-policy/).
