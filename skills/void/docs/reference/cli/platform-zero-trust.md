---
outline: deep
---

# Project Zero Trust {#operator-zero-trust}

Use your administrator session for these commands. See [Platform Management](./platform.md#operator-commands) for platform selection, previews, and confirmation.

Configure the installation-wide Cloudflare Access policy and project overrides:

```sh
void platform zero-trust status [--check]
printf '%s' "$ACCESS_API_TOKEN" | void platform zero-trust configure \
  --identity-providers <id[,id...]> \
  --policies <id[,id...]> \
  [--existing-projects <protected|public>] \
  [--protect-new-projects] \
  --token-stdin \
  --yes
void platform zero-trust reconcile
void platform zero-trust disable

void platform zero-trust project-status <project-id>
void platform zero-trust project-protect <project-id>
void platform zero-trust project-public <project-id>
void platform zero-trust project-reconcile <project-id>
```

Mutations support `--plan`, `--yes`, and `--timeout`; use `--plan` instead of
`--yes` to inspect this change without applying it. The Access management token
is accepted only on standard input. Zero Trust uses the Cloudflare account that
hosts the platform. Omit `--protect-new-projects` to make new projects public
by default. `--existing-projects` is required when you enable Zero Trust and
rejected once it is enabled; later configuration changes keep each project's
protection. `status` reports saved state; `--check` also compares it with
Cloudflare Access. If status remains `configuring` or `disabling`, run
`void platform zero-trust reconcile` to resume the saved operation. Protected
projects support up to 100 custom domains.

The token needs **Access: Apps and Policies Write** plus **Access:
Organizations, Identity Providers, and Groups Read**, scoped to the platform's
Cloudflare account. Select at least one Allow policy that matches people by
identity; Void rejects Bypass and Service Auth policies and rules that allow
Everyone or any service token. See [Project Zero Trust](../../guide/platform/administration/zero-trust.md)
for requirements and recovery.
