---
outline: deep
---

# Maintenance and Recovery

## Resume, repair, recover, and upgrade

You can omit an installation ID when only one is configured. With several installations, choose one interactively or pass its ID in CI.

### Resume an installation

If setup stops or fails, continue from the saved progress:

```sh
void platform install --resume --name <id>
```

You can correct the database URL if the initial connection failed. Once Void has claimed the database or provisioned Hyperdrive, that database is fixed for the installation. A later command with a different URL stops before making changes.

### Cloudflare Access blocks the health check {#cloudflare-access}

If installation reports **Default-Deny (error 1050)**, Cloudflare blocked the HTTP health check before it reached Void. This is separate from the API token used to deploy the Workers.

Keep the company protection in place. Automatic Access setup saves its scoped
service credentials with the installation's encrypted recovery material. For an
existing gate, verify that its service policy admits the installation token and
that the application covers the printed API and proxy origins. A Cloudflare
management API token does not authenticate an Access-protected HTTP request.

For externally supplied credentials, set `VOID_ACCESS_CREDENTIALS` from your
secret manager to an object keyed by each exact API/proxy origin, with
`CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` in each entry. Then rerun
`void platform install --resume --name <id>`. Void retains the saved resources
and stops if the gate still rejects its checks. Account-wide Default-Deny and
deployed-application policies remain your responsibility.

### Expired administrator setup code

Resume an unfinished installation with `void platform install --resume --name <id>`.
For completed provisioning whose administrator setup is still pending, run
`void platform repair <id>`. Void prints a fresh setup code if the earlier code
expired. Enter it at `/setup`, sign in, and confirm the displayed identity.
An installation that already has an administrator does not reopen setup.

### Repair missing resources

Preview what needs repair, then apply it:

```sh
void platform repair [id] --plan
void platform repair [id]
```

Repair recreates missing infrastructure that the installer owns. It does not restore PostgreSQL rows or data stored in provider resources. If an adopted or external resource is missing, restore it yourself before continuing. A disabled platform stays disabled through repair and upgrade.

### Upgrade the platform

Use the installed CLI's packaged runtime to upgrade:

```sh
void platform upgrade [id] --plan
void platform upgrade [id]
```

An upgrade validates the runtime, applies supported pending migrations, deploys the Workers, and checks their health. Existing Worker secrets are preserved.

::: details Migration safety, credential rotation, and interrupted upgrades

Some upgrades briefly put the platform into maintenance mode. Traffic resumes after the new version passes health checks. If an upgrade is interrupted during maintenance, rerun the same command to complete it.

To update the runtime Cloudflare token, GitHub OAuth credentials when GitHub login is enabled, or R2 credentials,
provide their `VOID_PLATFORM_*` environment variables when running the upgrade.
Only the supplied values replace live credentials. Recovery data from an older
workstation does not overwrite them, and upgrades preserve the live signing keys
and complete project-encryption keyring. Keep current credentials in your secret
manager so they can also restore a missing Worker during repair.

Database migrations only move forward. Void checks compatibility before upgrading and tells you if an intermediate release is needed. If deployment fails, it attempts to restore the previous Workers against the compatible database schema. Retrying does not repeat completed migrations.

Upgrades automatically enable managed Sandboxes. The platform runtime token needs Account / Containers: Edit and Account / Cloudchamber: Edit, and the Cloudflare account must use Workers Paid before its first Sandbox application deploy. The upgrade itself does not probe Containers access, so platforms that do not deploy Sandbox applications need no additional plan or permissions.

When upgrading from a release that used tenant-owned Sandbox containers, the upgrade may first ask you to finish the legacy cleanup. Follow the [`sandbox-drain` instructions](/reference/cli#operator-system), then rerun the upgrade. Administrator login remains available during that maintenance step.

After a successful upgrade, you can restore a declared-compatible earlier runtime without reversing migrations:

```sh
void platform rollback [id] --runtime /path/to/earlier/runtime --plan
void platform rollback [id] --runtime /path/to/earlier/runtime
```

Keep the earlier runtime files if you need rollback. If the installed version is a custom build, also pass its files with `--from-runtime /path/to/current/runtime`. Void checks that the earlier version can run against your current database and refuses incompatible rollbacks. A later `upgrade` can move forward again. See [Platform Development](/guide/platform/development/runtime#deploying-your-runtime) for working with custom builds.

:::

### Manage an installation from another machine

Use `discover` to restore the administrator's local installation records:

```sh
void platform discover --account <account-id> --installation <id-or-name>
```

Discovery restores local installation records after verifying the resources belong to your platform. It also works for interrupted or disabled installations. If infrastructure is missing, run `void platform repair [id]` after discovery. If ownership cannot be verified, the command stops without changing resources.

After discovery, provide `VOID_PLATFORM_DATABASE_URL` for migrations and to coordinate administrator commands. You don't need to re-enter the other secrets for an upgrade that preserves every deployed Worker. For an email-enabled installation without its encrypted recovery file, restore `VOID_PLATFORM_EMAIL_SIGNING_SECRET`; recreating only the email gateway needs that key and no Cloudflare runtime token or JWT signing key. Recreating the API or proxy also requires the email key when email is enabled, in addition to their normal secrets. Recreating the API requires its original runtime token (`VOID_PLATFORM_RUNTIME_CLOUDFLARE_API_TOKEN`), R2, JWT, and project-encryption values through the `VOID_PLATFORM_*` variables; a GitHub-only installation also needs its original GitHub OAuth values. Recreating the proxy requires the runtime token and JWT signing key. Cloudflare can't return these values, so keep them in your organization's secret manager.

If you have not rotated the project-encryption key, restore it with `VOID_PLATFORM_PROJECT_SECRET_KEY`. After rotation, supply `VOID_PLATFORM_PROJECT_SECRET_KEYS_JSON` with all retained keys and `VOID_PLATFORM_PROJECT_SECRET_ACTIVE_KEY_VERSION` with the active key's name. Keep older keys needed to decrypt existing project secrets. These values are used to recreate a missing API Worker; they do not replace the live keys during an ordinary upgrade. Supply them from your secret manager.

### Prepare for disaster recovery

`discover` reconstructs verified installation metadata on another machine. It does not download credentials, key material, or backed-up data. `repair` can then recreate missing installer-owned infrastructure, but it does not recover the data that infrastructure previously held.

Keep a coordinated recovery set for each installation:

- a PostgreSQL backup;
- the installation identity—the JWT signing secret, the email signing secret when email is enabled, and the complete project-encryption keyring—in a secret manager;
- provider-supported backups or exports for every data-bearing provider resource;
- the immutable runtime artifacts and manifest for the installed version or custom source revision.

Capture and label these items as one recovery point so PostgreSQL, provider data, identity, and encryption keys match. Backup and retention capabilities vary by provider and resource; choose and test the supported recovery process for each resource you use.

During a restore, keep platform and application traffic disabled before changing resources. Restore the matching PostgreSQL and provider data with their supported recovery tools, supply the original identity and keyring, and use the preserved runtime artifact. Then run `discover`, preview `repair` with `--plan`, and review every ownership decision and proposed resource change before applying it. Enable traffic only after the restored data and platform health have been verified. Discovery and repair are not substitutes for those backups and do not provide a recovery bypass when required secrets or data are unavailable.

### Where local state lives

Installation records live in `~/.void/platforms/`. Credentials are stored separately in encrypted recovery files, with the encryption key in your operating system's keychain. Keep your original secrets in a password manager for recovery on another machine.

If the keychain isn't available, Void stops before writing secrets. Headless environments can supply `VOID_PLATFORM_RECOVERY_KEY`: a canonical base64-encoded 32-byte key from a secret manager. A temporary CI runner can use a new recovery-encryption key for each run only when every original credential remains available in protected CI secrets, including `VOID_PLATFORM_JWT_SECRET`, `VOID_PLATFORM_EMAIL_SIGNING_SECRET` for an email-enabled installation, and either the original `VOID_PLATFORM_PROJECT_SECRET_KEY` or the complete rotated keyring and active-version pair.

::: details Ownership and interrupted maintenance

Void checks resource ownership and the configured database before making changes. Concurrent maintenance commands are coordinated so one administrator cannot overwrite another's work.

If maintenance is interrupted, rerun the same command. Traffic may stay paused until verification succeeds. Existing routes, domains, and data are preserved.

:::
