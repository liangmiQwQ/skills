---
outline: deep
---

# Platform Management {#platform-management}

Void-managed projects deploy to an explicitly selected platform. Join one with [`void connect`](./auth.md#connect). Connections are stored per API origin, and credentials are scoped to that origin.

## Connection commands {#connection-commands}

```sh
void platform list
void platform use [id]
void platform status [id]
```

`use` and `status` auto-select the only configured platform; with multiple platforms they show a picker interactively and require an id or URL in non-interactive use. A project with a recorded platform URL keeps using that platform when the global default changes.

## Operator commands {#operator-commands}

Use `void platform` to administer the users and apps on your selected platform. Start with the [Platform Administration guide](../../guide/platform-administration.md) for signing in, giving people access, and investigating deployments.

Every command below accepts `--connection <registered-id-or-url>` to select a platform and `--json` for structured output. Without `--connection`, Void uses `VOID_API_URL` if set, then the active platform connection. Application project files do not change this selection.

### Making Changes {#making-changes}

Commands that change users, projects, signup access, invitations, or Workers show a preview before asking for confirmation:

```sh
void platform user plan <user-id> pro --plan
void platform user plan <user-id> pro --yes
```

`--plan` validates the change and prints its effect without applying it. `--yes` applies the change without prompting, which is required in scripts. Use one or the other; they cannot be combined. These flags also apply to deployment cancellation and maintenance commands, but not to authentication commands.

Each preview and apply request allows five minutes. Set `--timeout <seconds>` to an integer from 1 to 3600 to change that limit. Read requests and individual log polls allow 30 seconds.

Void does not automatically retry changes. If a request loses its connection or times out, inspect the affected objects and `void platform system events` before repeating it. Partial results describe the work that completed and exit with a nonzero status.

### Authentication {#operator-authentication}

Sign in, inspect your session, or sign out:

```sh
void platform auth login [--provider <connection-id>] [--token-stdin]
void platform auth status
void platform auth logout
void platform auth token [--token-stdin]
```

Browser login offers the platform's enabled methods; `--provider <connection-id>` selects one. Login saves a one-hour administrator session in your system keychain. Logout revokes that session and removes its local credential.

`auth token` prints your current operator token. With `--token-stdin`, it exchanges a full administrator API login session from standard input for a new operator token. `auth login --token-stdin` saves the exchanged token to the keychain instead of printing it.

For automation, supply `VOID_OPERATOR_TOKEN` with an explicit `VOID_API_URL` or `--connection`. Operator tokens are stored separately from application deployment credentials. The API checks your current administrator access on every request. See [Using Scripts](../../guide/platform/administration/operations.md#using-scripts) for an example.

## Pagination and JSON {#pagination-and-json}

User, project, deployment, invitation, and event lists default to page `1` with 20 items. `--limit` accepts 1 to 100 for these lists. Their JSON responses include the page, limit, and total count.

With `--json`, results go to standard output and command errors go to standard error as JSON. Errors and partial failures exit with a nonzero status. An unhealthy `system health` result stays on standard output and also exits nonzero. Log following writes one JSON object per response, including each page and empty responses.

## Platform Command Groups

- [Installation and maintenance](./platform-installation.md)
- [Plans and authentication configuration](./platform-config.md)
- [Users, projects, and signup access](./platform-users.md)
- [Project Zero Trust](./platform-zero-trust.md)
- [Deployments, builds, and system operations](./platform-operations.md)
- [Email administration](./platform-email.md)
