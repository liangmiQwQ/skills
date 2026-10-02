---
outline: deep
---

# Authentication

::: warning ⚠️ Void Apps Only
Void-managed auth requires a native Void app on Cloudflare. For meta-frameworks or Node.js, Bun, and Deno, use Better Auth directly.
:::

Void configures [Better Auth](https://www.better-auth.com/) for your app, including its database connection, API routes, and client. Start with email and password, or add a social login provider.

## Quick Start

### 1. Enable auth

Import `auth` from `void/client` to enable email/password auth automatically. Use [configuration](#config) to add social providers.

### 2. Sign up and sign in

Use the preconfigured auth client from `void/client`:

```tsx
import { auth } from 'void/client';

// sign up
await auth.signUp.email({
  email: 'alice@example.com',
  password: 'example-password-123',
  name: 'Alice',
});

// sign in
await auth.signIn.email({
  email: 'alice@example.com',
  password: 'example-password-123',
});
```

### 3. Protect a server route

Call `requireAuth` in a route handler or page loader that needs a signed-in user. It returns that user, or throws `401` if the request isn't authenticated:

```ts
// routes/api/profile.ts
import { defineHandler } from 'void';
import { requireAuth } from 'void/auth';

export const GET = defineHandler((c) => {
  const user = requireAuth(c);
  return { email: user.email };
});
```

In a pages-mode loader, use `getUser` or `getSession` when you want to allow unauthenticated access:

```ts
// pages/dashboard.server.ts
import { defineHandler, type InferProps } from 'void';
import { getUser } from 'void/auth';

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(() => {
  const user = getUser();
  return { user };
});
```

### 4. Sign out

```tsx
await auth.signOut();
```

## Config

Auth turns on automatically when you:

- import anything from `void/auth`
- import `auth` from `void/client`
- add `auth` to `void.config.ts`
- add a root-level `auth.ts` file

Email/password is enabled by default. To add social providers:

```json
{
  "auth": {
    "providers": ["email", "google", "github"]
  }
}
```

Use `auth.providers` when you want to enable social providers explicitly. Provider credentials come from `AUTH_<PROVIDER>_CLIENT_ID` and `AUTH_<PROVIDER>_CLIENT_SECRET`.

See the full provider list in the [config reference](../reference/config.md#auth).

For example, `github` uses:

- `AUTH_GITHUB_CLIENT_ID`
- `AUTH_GITHUB_CLIENT_SECRET`

## Client Usage

The `auth` client uses [Better Auth's client API](https://www.better-auth.com/docs/concepts/client) at `/api/auth`. Void selects the client for your framework automatically.

For a custom client, import `createAuthClient` from `void/client`.

## Server Usage

`void/auth` provides the server-side helpers:

```ts
import { getSession, getUser, requireAuth } from 'void/auth';
```

- `getUser()` returns the current `AuthUser | null`
- `getSession()` returns `{ user, session } | null`
- `requireAuth(c)` returns the authenticated user or throws `401`

Import `AuthUser` and `AuthSession` from `void/auth` for type annotations. See their fields in the [API reference](../reference/api/auth.md#authuser).

## Behavior

Auth sessions use the same database as your app. Void creates `BETTER_AUTH_SECRET` on deploy if it is missing and reuses it on later deploys.

Local development needs no secret setup. To preview a production build locally, provide `BETTER_AUTH_SECRET`.

## Customization

For advanced configuration, create `auth.ts` at the project root and export `defineAuth(...)`:

```ts
import { defineAuth } from 'void/auth';

export default defineAuth(({ defaults }) => ({
  ...defaults,
  trustedOrigins: ['https://example.com'],
}));
```

`defaults` already includes Void's conventions. Extend it explicitly instead of expecting a deep merge.

For the full set of available options, see the official [Better Auth options reference](https://www.better-auth.com/docs/reference/options).

## Database and Migrations

Auth tables live alongside your app's tables. During local development, Void creates them automatically.

Void platforms create auth tables automatically. For a direct Cloudflare deploy, include them in your checked-in migrations:

```sh
void db generate
```

Review and commit the SQL before deploying. Void includes your auth configuration and plugin tables; you don't need to duplicate them in `db/schema.ts` or run the Better Auth CLI.

MySQL stores OAuth access, refresh, and ID tokens as unbounded text. Existing direct-deploy MySQL apps should run `void db generate` once after upgrading to widen earlier `varchar(255)` token columns. Void platform deployments apply the same safe widening automatically.
