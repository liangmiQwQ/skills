---
outline: deep
---

# Platform Operations {#operator-deployments}

Use your administrator session for these commands. See [Platform Management](./platform.md#operator-commands) for platform selection, previews, and confirmation.

Find a deployment, inspect its manifest, or request cancellation:

```sh
void platform deployment list [--project <id-or-slug>] [--status <status>] [--search <text>] [--page <n>] [--limit <n>]
void platform deployment show <id>
void platform deployment cancel <id>
void platform deployment migrate-assets <id> [--cursor <cursor>] [--plan|--yes]
```

Cancellation applies while a deployment is pending, uploading, migrating, or prerendering, and can be requested again while it is canceling. A deployment that has begun switching traffic, is compensating for a failure, or has finished cannot be canceled through this command.

`migrate-assets` copies legacy assets to scoped R2 storage, verifies their contents, and updates each batch only after all its assets are verified. Original assets remain in place, and application traffic stays on the same deployment. Upgrade the platform runtime before using this command. Migrate both active deployments and retained rollback deployments before removing support for older asset storage.

Use `--plan` to preview the first batch. Applying authorizes all remaining batches for that deployment; the CLI previews each batch and prints its result, including `nextCursor`. With `--json`, results are JSON Lines. If a later batch fails or the command is interrupted, resume with the cursor from the last successful result. An ambiguous request is never retried automatically; inspect the deployment before resuming. A completed migration reports `complete: true` and `nextCursor: null`.

Use [`void platform system asset-migrations`](#operator-system) to find deployments requiring migration. Inspect every inventory page, migrate each deployment with `needsMigration` greater than zero, then inspect every page again. Include retained rollback deployments and stored bundles. Investigate rows marked `invalid` before considering migration complete. Keep the older asset readers until the full inventory is valid and no protected deployment needs migration.

Read its runtime logs with:

```sh
void platform deployment logs <id> [--since <time>] [--cursor <cursor>] [--limit <n>] [--follow]
```

The default is the last hour, oldest first, with up to 100 records. `--since` accepts a duration such as `10m`, `2h`, or `1d`, an ISO date, or epoch milliseconds. Set `--limit` from 1 to 500 and pass the response's `nextCursor` as `--cursor` to read another page.

`--follow` reads the remaining pages and checks for new logs every two seconds until you press Ctrl+C. It checks a five-minute overlap for delayed records and suppresses replayed rows. Records that arrive later may need a subsequent historical query. Following stops with an error if a window exceeds 10,000 records; use a narrower historical query in that case.

## Builds {#operator-builds}

Inspect a build or read its output:

```sh
void platform build show <id>
void platform build logs <id> [--since <sequence>] [--limit <n>] [--follow]
```

Build logs start at sequence `0` and return up to 500 lines. Use the returned `lastSeq` as `--since` to continue; `--limit` accepts 1 to 500. Container log retrieval requires managed builds to be enabled. GitHub Actions builds return an external log URL.

Following waits for the final logs after the build becomes terminal. If completion cannot be confirmed within two minutes, the command exits with an error. Older builds without a completion signal may wait for 30 seconds without new lines before following stops.

## System {#operator-system}

Inspect activity, check service health, or review administrative changes:

```sh
void platform system overview
void platform system health
void platform system cli-versions
void platform system asset-migrations [--page <n>] [--limit <n>]
void platform system events [--page <n>] [--limit <n>]
void platform system backfill-queue-tokens
void platform system sandbox-drain [--cursor <opaque-cursor>]
```

`overview` shows platform totals and recent activity. `health` checks the configured services and database, and exits with a nonzero status if a check fails. `cli-versions` reports the CLI versions used by deployments.

`asset-migrations` inventories active deployments, retained rollback deployments, and deployments with stored bundles. It reports their asset counts, `needsMigration`, and an `invalid` flag for unreadable metadata. Read all pages using the response's pagination fields. Migrate each deployment with `needsMigration` greater than zero through [`deployment migrate-assets`](#operator-deployments), then rerun the full inventory. Migration keeps the original assets; removing those assets or their older readers requires separate verification.

`events` shows the administrator, target, and outcome of changes. A pending event means the outcome has not been recorded. Previews and session login/logout do not create these events. `backfill-queue-tokens` repairs older queue entries that are missing authentication tokens and supports `--plan` before applying the repair.

Use `sandbox-drain` when an upgrade from the legacy tenant-owned Sandbox runtime asks you to finish cleanup. Preview with `--plan`; pass the returned `nextCursor` as `--cursor` to inspect later pages. Apply with `--yes` and rerun until it reports `complete: true`, then rerun the interrupted upgrade. Application traffic stays paused during cleanup, while administrator login remains available. The completed upgrade enables the current managed Sandbox controller automatically.

Use the [platform lifecycle commands](./platform-installation.md#lifecycle-commands) to maintain your installation's Workers.

## Hosted Workers {#operator-workers}

The following commands manage the Workers of the hosted Void Cloud platform.
They are unavailable on a self-hosted installation; use the
[lifecycle commands](./platform-installation.md#lifecycle-commands) there instead.

```sh
void platform worker list [--environment <production|staging>]
void platform worker show <worker-name> [--environment <production|staging>]
void platform worker rollback <worker-name> <version-id> [--environment <production|staging>]
void platform worker rollback-all [--environment <production|staging>]
void platform worker events [batch-id] [--environment <production|staging>]
```

Use a name from `worker list`, such as `api` or `proxy`. `show` lists its
versions and current deployment. Preview either rollback with `--plan`, then
apply it interactively or with `--yes` in a script. `events` lists worker
operation events or inspects one batch by ID.
