# JavaScript / TypeScript Style

## Structure

**Avoid classes.** Use plain functions and plain objects. `this` binding is a footgun, inheritance hierarchies obscure data flow, and the same behavior is always expressible with functions.

Bad:

```ts
class UserService {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  async getUser(id: string) {
    return this.db.find(id);
  }
}
```

Good — return a plain object when you need to group related functions around shared state:

```ts
function createUserService(db: DB) {
  return {
    getUser: (id: string) => db.find(id),
  };
}
```

Good — just a function when there's no shared state:

```ts
async function getUser(db: DB, id: string) {
  return db.find(id);
}
```

Organize by feature, not by type. A file named `user.ts` with `getUser`, `createUser`, and `deleteUser` is better than a `services/UserService.ts`. No inheritance. No decorators for business logic.

## Exports

Export only what callers need. Everything else is an implementation detail—a name that must stay stable, a surface that must stay compatible.

Start with nothing exported. Add `export` only when another module imports it.

Bad:

```ts
export function buildQuery(filters: Filter[]) { ... }
export function normalizeResult(row: Row) { ... }
export async function fetchUsers(filters: Filter[]) { ... }
```

Good:

```ts
export async function fetchUsers(filters: Filter[]) { ... }

function buildQuery(filters: Filter[]) { ... }
function normalizeResult(row: Row) { ... }
```

Prefer named exports over `export default`—they're easier to trace and rename.

Prefer move the exported function / constant before any other function.

Avoid barrel `index.ts` re-exports unless the package has a genuine public API boundary. Barrel files obscure import origins.

## Comment examples

```ts
// Not using Promise.all — the second request depends on a side
// effect from the first, not just its return value.
await stepOne();
await stepTwo();
```

```ts
// Delay is intentional: the upstream service rejects requests
// that arrive within 100ms of each other.
await sleep(150);
```

Never write `@param` entries that restate the parameter name and type — TypeScript already says that.
