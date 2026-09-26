---
outline: deep
---

# Sandboxes

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

Importing from `void/sandbox` enables the required Sandbox resources. Native Cloudflare deployments add the `SANDBOX` Durable Object and Container metadata to the Worker. Void Platform deployments provide the same runtime API through a managed Sandbox controller.

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
| `binding`           | `SANDBOX`                  | Binding name for local and native Cloudflare use                      |
| `className`         | `Sandbox`                  | Durable Object class for local and native Cloudflare use              |
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

For code that must run on both deployment targets, use `getSandbox()`. Direct access through `c.env.SANDBOX` is available only on local and native Cloudflare deployments; managed platforms intentionally expose the application Sandbox API without the underlying lifecycle namespace.

## State persistence

A sandbox has a Durable Object identity and a container that can restart:

`getSandbox(id)` selects the same Durable Object for that ID within a deployment. Native Cloudflare deployments preserve that namespace across Worker versions. Each managed platform deployment has its own namespace; rolling back to a retained deployment reconnects to that deployment's namespace.

Files, running processes, exposed ports, and in-memory shell sessions last only as long as the container. It can stop after inactivity (the SDK defaults to `sleepAfter: "10m"`), crash, or restart during platform scheduling. `keepAlive: true` disables the idle timer but doesn't prevent other restarts.

Save anything you need to keep in Durable Object storage, your database, KV, or R2. The SDK also provides helpers to back up and restore directories through R2. Deleting the project on a Void platform removes both layers; routine container restarts only lose container state.

## Deployment

`void deploy` creates a deployment-scoped Sandbox controller and container application in the Void platform account. The controller owns container lifetime, concurrency admission, and runtime accounting; the application receives only the Sandbox operations exposed by `getSandbox()`.

Platform deploys require a registry image reference. The default sandbox works without extra config. If `sandbox.image` points at a custom local Dockerfile, also set `sandbox.platformImage` to an image you have already pushed to a registry.

Managed Sandboxes require Workers Paid on the platform's Cloudflare account. The platform runtime token needs Account / Containers: Edit and Account / Cloudchamber: Edit. These are checked only when an application that uses Sandbox is deployed; installing or upgrading a platform and deploying other applications does not probe Containers access.
