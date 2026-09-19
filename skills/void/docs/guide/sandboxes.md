---
outline: deep
---

# Sandboxes

> **Managed platform beta paused:** New managed Sandbox deployments and retained
> Sandbox rollbacks are currently disabled. Native Cloudflare deployments keep
> using Cloudflare Sandboxes directly. Platform operators upgrading an existing
> installation must preview and complete
> `void platform system sandbox-drain` before reopening platform traffic. The
> preview is bounded; pass its `nextCursor` back with `--cursor` to inspect later
> pages. Apply is resumable through a leased database checkpoint: rerun it after
> active deployments settle, after it advances a page, or after resolving any
> ownership verification blocker.

For an `unverified_container` blocker, use the reported resource, project,
binding, application ID, and application name to compare the application's
Durable Object namespace with the project's managed dispatch script. Never
delete an account application by name alone. Remove the application and stale
resource row only after proving that both belong to this platform installation,
then rerun the drain.

Use a Cloudflare Sandbox to run commands, work with files, and expose ports from server code. Each session gets an isolated container.

```ts
import { defineHandler } from 'void';
import { getSandbox } from 'void/sandbox';

export const POST = defineHandler(async (c) => {
  const { command } = await c.req.json<{ command: string }>();
  const sandbox = await getSandbox('default');
  const result = await sandbox.exec(command);

  return c.json(result);
});
```

Importing from `void/sandbox` enables the `SANDBOX` Durable Object binding, exports the SDK's `Sandbox` class from the generated Worker entry, and adds the matching `containers` and migration metadata to the Cloudflare worker config.

## Configuration

Most apps do not need config. The default binding is `SANDBOX`, the Durable Object class is `Sandbox`, and local development, native Cloudflare deploys, and Void Platform all use the published image matching the installed `@cloudflare/sandbox` version.

Use `void.json` when you need a custom image or container size:

```json
{
  "sandbox": {
    "image": "./Dockerfile.sandbox",
    "platformImage": "registry.example.com/acme/sandbox:latest",
    "instanceType": "lite",
    "maxInstances": 2
  }
}
```

Available fields:

| Field               | Default                    | Description                                                           |
| ------------------- | -------------------------- | --------------------------------------------------------------------- |
| `binding`           | `SANDBOX`                  | Worker binding name                                                   |
| `className`         | `Sandbox`                  | Durable Object class exported by the Worker                           |
| `containerName`     | `void-sandbox`             | Cloudflare container app name                                         |
| `image`             | Matching sandbox SDK image | Dockerfile path or registry image for local and native Cloudflare use |
| `imageBuildContext` | Directory of `image`       | Docker build context for local and native Cloudflare use              |
| `platformImage`     | Matching sandbox SDK image | Registry image used by `void deploy`                                  |
| `instanceType`      | `lite` on Void deploy      | Container size, such as `lite`, `basic`, `standard-1`                 |
| `maxInstances`      | `20` on Void deploy        | Maximum number of container instances                                 |

## Runtime API

`getSandbox(id, options)` returns the SDK sandbox stub for a session id. IDs are normalized by default so user-provided session ids can safely map to Durable Object names.

```ts
import { getSandbox } from 'void/sandbox';

// inside an async handler
const sandbox = await getSandbox(`user-${user.id}`);
await sandbox.writeFile('/tmp/input.txt', 'hello');
const result = await sandbox.exec('cat /tmp/input.txt');
```

You can also use the namespace directly from `c.env.SANDBOX` when you need lower-level Durable Object control.

## State persistence

A sandbox has a persistent Durable Object identity and a container that can restart:

`getSandbox(id)` selects the same Durable Object for that ID across deploys and rollbacks. Data saved in its persistent storage, including its SQLite database, survives container restarts. Use that storage for session metadata and other state you need to keep.

Files, running processes, exposed ports, and in-memory shell sessions last only as long as the container. It can stop after inactivity (the SDK defaults to `sleepAfter: "10m"`), crash, or restart during platform scheduling. `keepAlive: true` disables the idle timer but doesn't prevent other restarts.

Save anything you need to keep in Durable Object storage, your database, KV, or R2. The SDK also provides helpers to back up and restore directories through R2. Deleting the project on a Void platform removes both layers; routine container restarts only lose container state.

## Deployment

`void deploy` provisions the `SANDBOX` Durable Object namespace, attaches the Cloudflare Container metadata to the Worker upload, and creates or updates the matching container application in the Void platform account.

Platform deploys require a registry image reference. The default sandbox works without extra config. If `sandbox.image` points at a custom local Dockerfile, also set `sandbox.platformImage` to an image you have already pushed to a registry.
