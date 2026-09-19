---
outline: deep
---

# Durable State

Use a Durable Object when requests need to share state under one name, such as a shopping cart, room, or rate limiter. Void gives you typed methods and stores the object's state between calls.

Void turns each module in `durable-objects/` into a SQLite-backed Cloudflare Durable Object. The filename determines the binding, Worker class, and initial Cloudflare migration, so no manual Cloudflare configuration is needed.

Void writes the inferred binding and migration entry to `wrangler.jsonc`. Commit that file: Cloudflare Durable Object migrations are append-only, and the persisted order ensures a newly added module is migrated after every class already deployed.

## Define state and methods

```ts
// durable-objects/counter.ts
import { defineDurableState } from 'void/durable';

export const Counter = defineDurableState({
  initialState: { count: 0 },
  methods: {
    increment(context, amount: number) {
      context.state.count += amount;
      return context.state.count;
    },
    read(context) {
      return context.state.count;
    },
  },
});

export default Counter;
```

The default export must be the object returned by `defineDurableState()`. Void uses it to export the generated Cloudflare class and associate the inferred binding at worker startup.

For `counter.ts`, Void generates:

| Resource                 | Generated name            |
| ------------------------ | ------------------------- |
| Binding                  | `COUNTER`                 |
| Worker class             | `CounterDurableObject`    |
| Cloudflare migration tag | `void-durable-counter-v1` |

Names are derived from kebab-case filenames: `shopping-cart.ts` becomes `SHOPPING_CART` and `ShoppingCartDurableObject`.

## Call it from a route

Import the same named definition and select an object by name. Calls are typed from the method definitions, including arguments and return values.

```ts
// routes/api/counter.ts
import { defineHandler } from 'void';
import { Counter } from '../../durable-objects/counter';

export const POST = defineHandler(async () => {
  const counter = Counter.get('global');
  const count = await counter.increment(1);
  return { count };
});
```

The same name always resolves to the same Durable Object. Use `getById(id)` when you already have a `DurableObjectId`. For advanced cases, both helpers also accept an explicit `DurableObjectNamespace` as their first argument.

## Execution and persistence

Typed methods run through Cloudflare RPC on the generated Durable Object class. Only your declared methods are exposed; Void’s state-loading and persistence helpers stay private.

Void loads state before the first operation and runs RPC methods one at a time. After a method, `fetch`, or `alarm` handler succeeds, it saves the updated state.

If the handler or save fails, Void restores `context.state` to its previous value. Direct writes to `context.storage` aren't included in that rollback.

Each method receives:

- `context.state`, which can be mutated or replaced
- `context.env`, the Durable Object environment
- `context.id` and `context.storage`
- `context.setAlarm()` and `context.deleteAlarm()`

Methods named `fetch`, `alarm`, or `constructor` are reserved. Define `fetch` and `alarm` as top-level hooks instead:

```ts
export const Room = defineDurableState({
  initialState: { wakeups: 0 },
  methods: {},
  fetch(context) {
    return Response.json(context.state);
  },
  async alarm(context) {
    context.state.wakeups += 1;
    await context.setAlarm(Date.now() + 60_000);
  },
});

export default Room;
```

## State migrations

Version the persisted value when its shape changes. Versions start at `1`, must be contiguous, and run in order before an operation handles the migrated state.

```ts
export const Counter = defineDurableState({
  initialState: { count: 0, label: 'Counter' },
  version: 2,
  migrations: [
    {
      version: 1,
      migrate(old) {
        return { count: (old as { count: number }).count, label: 'Counter' };
      },
    },
    {
      version: 2,
      migrate(old) {
        return { ...(old as { count: number; label: string }), label: 'Total' };
      },
    },
  ],
  methods: {
    read(context) {
      return context.state;
    },
  },
});

export default Counter;
```

These state migrations are separate from Cloudflare's Durable Object class migration. Void generates the latter with `new_sqlite_classes` when it discovers the file.

Do not delete or reorder generated Durable Object migrations in `wrangler.jsonc` after deployment. Native Cloudflare beta deploys can create these classes with the Worker's first deployment, but do not yet apply a later class migration to an existing Worker. Additions, renames, and removals require an explicit supported Cloudflare deployment workflow; after its migration tag is active, `void deploy --platform cloudflare` can resume ordinary version uploads.

## Deployment support

Typed state works in local development and direct Cloudflare deploys of native Void apps. Deploy with `void deploy --platform cloudflare`.

Deploying custom Durable Object modules to a Void platform isn't supported yet. `void deploy --platform void` stops before building and points you to the Cloudflare path. Meta-frameworks and Node.js, Bun, and Deno targets also reject `durable-objects/` with guidance.

This is separate from [typed WebSocket routes](./websockets.md), which also use SQLite-backed Durable Objects and work on both direct Cloudflare and hosted Void deployments.
