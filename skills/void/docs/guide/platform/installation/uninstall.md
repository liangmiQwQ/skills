---
outline: deep
---

# Disable and Uninstall

To pause a platform without removing its data:

```sh
void platform disable [id] --plan
void platform disable [id]
```

Disabled platforms reject application traffic while retaining domains and routes. Repair and upgrade preserve that state. Restore traffic with:

```sh
void platform enable [id] --plan
void platform enable [id]
```

Add `--yes` to commands that make changes in a non-interactive shell.

While disabled, the platform retries queue batches after five minutes instead of delivering them to apps. Queue retention and retry limits still apply. For a long pause, plan a dead-letter queue or another way to recover messages.

## Uninstall

Preview removal before applying it:

```sh
void platform uninstall [id] --plan
void platform uninstall [id]
```

Uninstall blocks platform traffic, removes Queues that no remaining platform Worker uses, and records the resources left for you to review. By default, Workers, the Queues they use, KV, R2, Hyperdrive, the dispatch namespace, and AI Gateway remain in your account. Adopted resources, external PostgreSQL, zones, DNS records, routes, custom domains, and Cloudflare Access resources are always retained.

To also remove eligible data resources owned by the installer:

```sh
void platform uninstall [id] --purge-data
```

Even with `--purge-data`, Void retains Workers, the Queues they use, R2, AI Gateway, DNS records, routes, custom domains, Access resources, adopted resources, external PostgreSQL, and zones. Review those in the Cloudflare dashboard if you want to remove them.

### Remove retained resources

Cloudflare refuses to delete a resource while a platform Worker still uses it. In the Cloudflare dashboard, remove what is left in this order, skipping anything already gone:

1. Delete the platform DNS record, Worker routes, and custom domains.
2. Open each platform Queue and remove the platform API Worker from its consumers.
3. Delete the platform Workers.
4. Delete the platform Queues.
5. Delete the application Workers in the dispatch namespace, then delete the namespace.
6. Delete the platform KV namespaces and Hyperdrive configuration.
7. Empty the R2 bucket, then delete it.
8. Delete the AI Gateway.

If installation configured Cloudflare Access, the uninstall plan lists its recorded applications and service tokens with their ownership and IDs. Review them in Zero Trust after uninstall. Remove installer-created resources only when nothing else uses them; resources connected from an existing company setup remain under their owner's control.

Uninstall does not remove the applications created for [project Zero Trust](/guide/platform/administration/zero-trust). While Zero Trust is enabled or still has Access applications, uninstall and `--plan` stop before any change and list those applications. Run `void platform zero-trust disable` first. Uninstall reads this from the installation database, so it also stops when the database cannot be reached.

::: details Why some resources require manual cleanup

Resources that may have been shared or repurposed require manual review before deletion. Void verifies ownership, keeps those resources in place, and blocks platform traffic.

If removal is interrupted, rerun the command to continue. If a resource has changed ownership, resolve the reported conflict before retrying.

External PostgreSQL and its data always remain under your control.

:::
