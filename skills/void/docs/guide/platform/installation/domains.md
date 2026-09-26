---
outline: deep
---

# Domains and Resources

## Adding a Domain

When your domain is ready, run:

```sh
void platform domain set example.app --plan
void platform domain set example.app
```

The command selects your installed platform (or offers a picker), finds or creates its zone, sets up DNS and routing, and verifies HTTPS before publishing the new application URLs. Set the management token as described in [installation setup](/guide/platform/installation/setup) when creating DNS or a zone. Grant the existing runtime token **Cache Purge: Purge** on the new zone; Void checks that permission through the running platform without asking you to paste its token again.

If nameservers or certificates are pending, follow the printed guidance and rerun the same command. Your workers.dev app URLs continue working during and after setup. Projects, deployments, secrets, and the platform API URL stay the same, so developers do not reconnect and configured login callbacks do not change. DNS and configuration changes may take time to propagate.

Use `--installation <id>` to select an installation explicitly, `--zone example.com` for an app domain such as `apps.example.com`, or `--dedicated-zone` for catch-all routing on a dedicated zone. Nested domains still need the wildcard certificate described below. This command adds the first domain; replacing an existing application domain is not currently supported. It uses the installed runtime and does not require `--runtime` or an app redeploy.

Browser login sessions are specific to each origin. Apps using their own OAuth providers may need to register their new callback URLs. Void's built-in auth uses the request origin automatically unless the app overrides that configuration.

### What Changes in Testing Mode?

Each deployed app gets a small forwarding Worker and its own `workers.dev` origin. It forwards requests, including WebSockets and SSE, through the same platform router. Names include installation and project IDs; a later project with the same slug cannot inherit a deleted project's test URL.

Testing origins use shared ISR storage but bypass the extra edge response cache because you cannot use your zone's purge API for `workers.dev`. Custom-domain requests use the normal edge cache after activation. Existing test URLs and forwarding Workers are retained when you add a domain; new apps then use the domain without creating more forwarding Workers. Like other platform Workers, forwarders are retained for manual cleanup on uninstall; platform disablement and project suspension still apply to their traffic.

## Other Domain Options

::: details Custom API hostname

Pass `--control-plane-domain platform.example.net` during installation. The hostname must belong to a zone the selected account and management token can manage. Omitting it keeps the API on `workers.dev`.

:::

### Using a Nested Application Domain

::: details Use apps.example.com within an existing company zone

An app at `my-app.apps.example.com` needs a certificate for `*.apps.example.com`. Universal SSL for `example.com` only covers first-level hostnames. Configure an active wildcard certificate with [Advanced Certificate Manager](https://developers.cloudflare.com/ssl/edge-certificates/advanced-certificate-manager/), a paid add-on, or use an existing custom wildcard certificate before installation:

```sh
void platform install --application-domain apps.example.com --zone example.com --plan
```

The management token needs **SSL and Certificates: Read** (or Edit) on that zone for the certificate check. Void does not order certificates or enable paid products automatically. Leave `--dedicated-zone` off: that flag is only for installations whose application domain is the entire zone and adds catch-all routes for otherwise unmatched traffic.

:::

## Cloudflare footprint

New platform resources use deterministic `void-<installation-name>-<role>` names where Cloudflare allows them, such as `void-team-api`. Choose an unused installation name in the account; Void stops on an unowned name conflict instead of replacing that resource. Existing installations keep their recorded names, including older names with suffixes.

| Resource                                  |                                 Count | Purpose                                                                                       |
| ----------------------------------------- | ------------------------------------: | --------------------------------------------------------------------------------------------- |
| Workers                                   | 5, plus one per app using workers.dev | API/control plane, proxy, tail ingestion, dispatch, email gateway, and test-origin forwarders |
| KV namespaces                             |                                     3 | Routing, ISR cache, and static asset storage                                                  |
| R2 buckets                                |                                     1 | Static and deployment assets                                                                  |
| Queues                                    |                                     2 | Usage events and cron firing                                                                  |
| Workers for Platforms dispatch namespaces |                                     1 | User application Workers                                                                      |
| Hyperdrive configurations                 |                                     1 | External platform PostgreSQL                                                                  |
| AI Gateways                               |                                     1 | Installation-isolated AI routing and metering                                                 |
| Proxied wildcard DNS records              |                                0 or 1 | Created only when an application domain is configured                                         |
| Zones                                     |                                0 or 1 | Created only when the requested application zone is absent                                    |

The API Worker uses four Durable Object classes for usage, cron scheduling, error monitoring, and concurrency. Worker bindings create the request and log datasets in Analytics Engine. The core installation doesn't create Container applications, a GitHub App, a dashboard Worker, or build Workers.
