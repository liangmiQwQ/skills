---
outline: deep
---

# Install a Void Platform

A Void platform lets your team deploy apps into a shared Cloudflare account. As an administrator, you install and maintain the platform. Developers connect the Void CLI to its URL, sign in through an enabled login method, and deploy their apps.

If you're deploying an app for yourself, [deploy directly to Cloudflare](/integrations/cloudflare#deploy-to-your-own-cloudflare-account). You don't need to install a platform first.

The core platform supports GitHub, Google, generic OIDC, and Cloudflare Access login, CLI deploys, D1, KV, R2, Queues, cron jobs, Workers AI, WebSockets, SSE, ISR, routing, logs, and rollback.

The core installation includes managed Sandboxes and an email gateway; email is enabled when you configure a shared mail domain and zone. The user dashboard, GitHub builds and webhooks, build Containers, and custom project domains aren't part of the core installation. Source-built platforms that add the optional GitHub services should follow the [isolated webhook ingress setup](/guide/platform/development/runtime#optional-github-webhook-ingress-for-access-protected-apis) when Access protects the API.

## Installation Guides

- [Prerequisites](/guide/platform/installation/prerequisites)
- [Credentials](/guide/platform/installation/credentials)
- [Install and Configure Login](/guide/platform/installation/setup)
- [First Deployment](/guide/platform/installation/first-deployment)
- [Domains and Resources](/guide/platform/installation/domains)
- [Maintenance and Recovery](/guide/platform/installation/maintenance)
- [Install from CI](/guide/platform/installation/ci)
- [Disable and Uninstall](/guide/platform/installation/uninstall)
