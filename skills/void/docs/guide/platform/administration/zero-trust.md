---
outline: deep
---

# Project Zero Trust

Project Zero Trust puts Cloudflare Access in front of the hostnames of projects deployed to your platform, including custom domains. Visitors sign in with one of your identity providers before they reach a protected project. Each project can still be made public.

This is separate from the Access login and protection for the platform API. Projects deployed directly to Cloudflare are not affected.

The steps below set it up. [How Protection Works](#how-protection-works) explains what visitors see, which Access applications Void creates, and what happens while settings change.

## Requirements

- A Cloudflare Zero Trust organization in the account that hosts the platform, with the identity providers and reusable Access policies you want to use. Select at least one Allow policy that matches people by identity. Void rejects Bypass and Service Auth policies, and rules that allow Everyone or any service token.
- A Cloudflare API token for that account with **Access: Apps and Policies Write** and **Access: Organizations, Identity Providers, and Groups Read**. Void keeps it separate from the platform runtime token, stores it encrypted, and never shows it again.
- Free Access applications in the account. Cloudflare's default limit is 500 per account. Count the applications you already manage outside Void, then add the ones Void needs, as described in [Access Applications Void Creates](#access-applications-void-creates).
- Platform API, proxy, and email gateway hostnames outside the project application domain. Configuration is rejected when project protection would cover one of them. Any other hostname under the project application domain also asks for sign-in, except the `/health` path of `void-platform-health.<your domain>`, which Void keeps open for its health checks and never serves from a project. New projects cannot use that name. A project that already uses it keeps every other path, protected or public like any other project.

## Enable Zero Trust

Open **Zero Trust** in the administrator UI, or use the operator CLI:

```sh
printf '%s' "$ACCESS_API_TOKEN" | void platform zero-trust configure \
  --identity-providers <id[,id...]> \
  --policies <id[,id...]> \
  --existing-projects public \
  --protect-new-projects \
  --token-stdin \
  --yes
```

- `--existing-projects protected|public` decides what happens to the projects that already exist. It is required when you enable Zero Trust.
- `--protect-new-projects` protects projects created from now on. Omit it to make new projects public.
- Use `--plan` instead of `--yes` to check the change without applying it.

To change the identity providers, policies, token, or new-project default later, run the same command without `--existing-projects`. Existing projects keep their protection; use the project overrides below to change one project.

## Check Status

```sh
void platform zero-trust status
void platform zero-trust status --check
```

`status` shows the saved settings, the current operation, and how many projects are protected, public, or waiting. `--check` also compares the settings with Cloudflare Access. In the administrator UI, use **Check with Cloudflare**.

## Project Overrides

Project owners and project administrators can protect a project or make it public. Readers can see its state.

```sh
void project zero-trust status
void project zero-trust protect
void project zero-trust public
void project zero-trust reconcile
```

`status` also tells you whether protection can be changed right now. Making a project public does not change the default for new projects.

Installation administrators can do the same from the project page in the administrator UI or with `void platform zero-trust project-status|project-protect|project-public|project-reconcile <project-id>`.

Deploys and rollbacks wait until a project's protection change is finished. If one is refused, run `void project zero-trust status` to see why; the owner or a project administrator can run `void project zero-trust reconcile` before you try again. A protected project can have up to 100 custom domains.

## Disable Zero Trust

```sh
void platform zero-trust disable
```

This removes the Access applications Void created and makes all projects public. On large installations it runs in steps; run it again, or check `void platform zero-trust status`, until Zero Trust shows as disabled with no operation running.

Uninstalling the platform does not remove these applications. `void platform uninstall` refuses to start while Zero Trust is enabled, a change is still running, or some Void-managed Access applications are left. Its error lists their names. Disable Zero Trust first, then uninstall. Once the uninstall starts turning the platform off, Zero Trust changes and deployments are refused. If it stops after that point, run it again, or bring the platform back with `void platform enable` or `void platform repair`. If a project's applications could not be removed, Void retries every hour while the platform is enabled. If the error says a project deletion stopped partway, run `void project delete` for that project again to remove them.

## How Protection Works

Every request to a protected project passes two checks before your code runs:

```text
Visitor
  │
  ▼
Cloudflare Access ─── not signed in ─────────▶ sign-in page
  │ signed in and allowed by your policies
  ▼
Void checks the Access token ─── rejected ───▶ 403 page
  │ token is valid for this hostname
  ▼
Your project: routes, pages, assets, WebSockets
```

A public project skips both. Access lets every visitor through, and Void does not look for a token.

### What Visitors See

A protected project asks visitors to sign in with one of the identity providers you selected. If you selected exactly one, visitors go straight to it. Otherwise, they pick one of the selected providers. A sign-in lasts 12 hours. After that, Access asks again.

Protection follows the project to every hostname it answers on:

| Hostname                                  | Protected project | Public project |
| ----------------------------------------- | ----------------- | -------------- |
| `<slug>.<your domain>`                    | Sign-in required  | Open to anyone |
| The project's `workers.dev` testing URL   | Sign-in required  | Open to anyone |
| Custom domains, such as `app.example.com` | Sign-in required  | Open to anyone |

Void only covers the `workers.dev` testing URLs of this installation. Other Workers in the account are not affected. On an installation without a domain, the `workers.dev` testing URL is the only project URL, and the shared project application covers only those URLs.

#### The 403 Page

Void answers `403 Cloudflare Access authentication required` when a request reaches a protected project without a valid Access token for it. Page requests get a short HTML error page. Requests under `/api`, requests for files, requests that are not `GET` or `HEAD`, and requests that do not accept HTML get the same message as plain text. The response is never cached.

Visitors who went through the sign-in page normally never see it. They can see it:

- for a short time while the project is switching between protected and public;
- while a Zero Trust change is still being applied to the project;
- when a Void-managed Access application was deleted, or its hostnames were changed, in the Cloudflare dashboard. See [Editing Applications in the Dashboard](#editing-applications-in-the-dashboard).

#### Every Path Is Covered

Protection applies to the whole hostname. There are no path exceptions. `/api/*` routes, static files, hashed assets, `robots.txt`, `favicon.ico`, server-sent events, and WebSockets all require a signed-in visitor.

#### Webhooks and Other Non-Browser Clients

Void only accepts policies that match people by identity. It rejects Bypass and Service Auth policies, and rules that allow Everyone or any service token. So a machine cannot pass on its own. Payment and Git webhooks, CI jobs, uptime checks, and plain `curl` calls get the sign-in page or the 403 response.

If a project must accept such requests:

- make the project public with `void project zero-trust public` and check callers in your own code, or
- move the endpoints that machines call into a separate project, and make only that project public.

### Two Checks on Every Request

Cloudflare Access is the first check. It runs at Cloudflare's edge, shows the sign-in page, and applies your policies. Only visitors your policies allow get an Access token for the project.

Void is the second check. Before a protected project runs, Void confirms that the request carries an Access token that:

- was issued by your Zero Trust team;
- belongs to one of the Access applications Void created for this project's hostname;
- has not expired.

If any of this fails, the visitor gets the [403 page](#the-403-page). Your routes, assets, and caches are never reached.

This gives you one guarantee: **deleting a Void-managed Access application, or changing its hostnames, cannot make a protected project public.** If someone deletes Void's application, or points it at other hostnames, visitors are refused instead of let in. Loosening the policies of Void's application in the dashboard does widen who can sign in, until the next update puts Void's policies back.

The second check does not look at your policies again. Who may sign in is decided only by the policies in Cloudflare Access. If you loosen a selected policy, the change applies to every protected project.

### Access Applications Void Creates

Void creates and owns these self-hosted applications in your Zero Trust organization:

| Application                | Covers                                                                    | Policy                                                           | Exists                                                             |
| -------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| Shared project application | `*.<your domain>` and this installation's `workers.dev` testing URLs      | Your selected policies and identity providers                    | Once, while Zero Trust is enabled                                  |
| Public exception           | One public project's `<slug>.<your domain>` and `workers.dev` testing URL | A Bypass policy for Everyone, named `Void project is public`     | One for each public project                                        |
| Custom domain application  | All custom domains of one protected project                               | Your selected policies and identity providers                    | One for each protected project that has custom domains             |
| Health check exception     | `void-platform-health.<your domain>/health`                               | A Bypass policy for Everyone, named `Void platform health check` | Once, while Zero Trust is enabled on an installation with a domain |

Custom domains of a public project need no Access application.

The number of applications Void needs is:

```text
2 + public projects + protected projects that have custom domains
```

Use 1 instead of 2 on an installation without a domain. For example, 40 projects with 10 public and 5 protected projects that have custom domains need 2 + 10 + 5 = 17 applications. Void stops with an error when the account has more than 500 Access applications.

#### Recognizing Void's Applications

Void adds no tags. Its application names follow this pattern:

```text
void-<installation>-<code>-<random>-project-zero-trust     shared project application
void-<installation>-<code>-<random>-public-<project-id>    public exception
void-<installation>-<code>-<random>-protected-<project-id> custom domain application
void-<installation>-<code>-<random>-platform-health        health check exception
```

- `<installation>` is the start of your installation ID, which begins with your installation name.
- `<code>` is 16 characters. It is the same for every application of one installation.
- `<random>` is 32 random characters.
- `<project-id>` is the project ID, such as `proj_abc123def456`. The project slug is not part of the name.

To see the exact names Void recorded, run `void platform zero-trust status` for the shared application and the health check exception, and `void platform zero-trust project-status <project-id>` for a project's applications. There, the public exception is listed as `bypass application name` and the custom domain application as `protected application name`.

### Editing Applications in the Dashboard

Do not edit, rename, or delete Void's applications in the Cloudflare dashboard. Change the identity providers and policies with `void platform zero-trust configure` instead. See [Enable Zero Trust](#enable-zero-trust).

You can still edit the rules inside a selected reusable policy. Void's applications use your policies as they are. Void checks them again during `void platform zero-trust configure` and `void platform zero-trust reconcile`, which stop with an error, and during `status --check`, which reports `present: false`. A policy fails this check when it now allows Everyone or any service token, or uses a Bypass or Service Auth decision.

#### What Happens If You Do

Void writes an application when it updates it: during platform `configure` or `reconcile`, during a project's `protect`, `public`, or `reconcile`, when a custom domain is added to or removed from that project, and while it retries a project that is not settled. Scheduled maintenance does not look for dashboard changes on settled projects. Until one of these runs, your change stays in effect.

| Change in the dashboard                                | Effect                                                                                                                                                                                                | Repair                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Edit hostnames, policies, providers, or session length | Your change stays until the next update, which puts Void's settings back.                                                                                                                             | Run the reconcile command for that application      |
| Delete the shared project application                  | Protected projects answer 403 on `<slug>.<your domain>` and `workers.dev` URLs. Their custom domains and public projects keep working.                                                                | `void platform zero-trust reconcile`                |
| Delete a public exception                              | Visitors of that public project are asked to sign in, because the shared application now covers it.                                                                                                   | `void project zero-trust reconcile` in that project |
| Delete a custom domain application                     | That protected project answers 403 on its custom domains.                                                                                                                                             | `void project zero-trust reconcile` in that project |
| Delete the health check exception                      | Platform health checks fail with a redirect to sign-in, so the admin dashboard shows `dispatch` as unhealthy and `void platform upgrade` and `repair` stop at their health check.                     | `void platform zero-trust reconcile`                |
| Rename an application                                  | Void stops updating or deleting it. Reconcile fails with `The recorded Access application no longer has its Void-owned name.` For the shared application, platform status then shows `error`.         | Rename it back to the recorded name, then reconcile |
| Copy an application with the same name                 | Void ignores the copy while the original exists, and `disable` does not remove it. If the original is later deleted, reconcile fails with `Multiple Cloudflare Access applications are named <name>.` | Delete the copy, then reconcile                     |

When Void recreates a deleted shared project application, the new application issues different Access tokens. Void then moves each protected project to it. On large installations this runs in steps, and protected projects answer 403 until Void reaches them.

#### Checking for Changes

```sh
void platform zero-trust status --check
```

This compares the shared project application and the health check exception with the saved settings, and checks your selected identity providers and policies again. The output includes:

```text
checked: true
live:
  present: true
  drifted: false
```

- `drifted: true` means the shared application or the health check exception no longer matches. Run `void platform zero-trust reconcile`.
- `present: false` means Void could not read it. The application may be deleted, a selected identity provider or policy may be gone or no longer allowed, or the token may not work. Check the token and selections, then run `void platform zero-trust reconcile`.

`--check` only reads. It changes nothing. It does not check public exceptions or custom domain applications. If you think one was changed, run a reconcile command.

#### Repair Commands

| Command                                                   | Rewrites                                                                                     | Who can run it                               |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `void platform zero-trust reconcile`                      | The shared project application, the health check exception, and every project's applications | Installation administrators                  |
| `void platform zero-trust project-reconcile <project-id>` | One project's applications                                                                   | Installation administrators                  |
| `void project zero-trust reconcile`                       | The linked project's applications, or pass `--project <slug>`                                | The project owner and project administrators |

The two project commands work only when platform status is `ready`. While a platform change runs, or after it fails, run `void platform zero-trust reconcile` first.

### What Happens During Changes

Void orders every change so that a protected project never becomes public by mistake. If a step fails, the project keeps its protection, or refuses visitors with the 403 page, until the change can finish.

Void's router can keep a project's previous setting for up to about a minute. During that time, some visitors may see the 403 page instead of the sign-in page.

#### Protecting or Making a Project Public

`void project zero-trust protect` and `void project zero-trust public` usually finish before the command returns.

- **Protect.** Void covers the custom domains first, then turns on its own check, then removes the public exception. Visitors may see the 403 page for a moment before Access starts asking them to sign in.
- **Public.** Void adds the public exception first, then turns off its own check, then removes the custom domain application. Visitors may see the 403 page for a moment before the project opens.

If the command prints `Zero Trust update is still in progress`, run `void project zero-trust reconcile` to continue, or wait for the hourly maintenance. If it fails with `Cloudflare Access could not be updated. Protection remains fail closed.`, fix the cause, then run `void project zero-trust reconcile`. Until then, a project that was protected stays protected. A project you were protecting may already ask for sign-in, or answer with the 403 page, but it is never more open than before. A project you were making public may already be open on some hostnames.

Run `void project zero-trust status` to follow a change. `State:` shows `reconciling` while it runs, `error` when it needs attention, and `protected` or `public` when it is done. `Last error:` explains a failure.

#### Enabling and Disabling Zero Trust

Large changes run in steps. Platform status shows `configuring` or `disabling`, and project owners see `Available: no`. Scheduled maintenance continues within a few minutes.

When you **enable** Zero Trust:

1. Void adds the public exception for each project that stays public. These projects never ask visitors to sign in.
2. Void creates the health check exception, then the shared project application. From here, the `<slug>.<your domain>` and `workers.dev` URLs of protected projects require sign-in.
3. Void goes through the protected projects and covers their custom domains. A project's custom domains stay open until Void reaches it.

If Void cannot add a project's public exception, the project shows `error`, and its visitors are asked to sign in until the next retry succeeds. Void retries every hour, or run `void project zero-trust reconcile` once platform status is `ready`.

When you **disable** Zero Trust:

1. Void turns off its own check for each protected project and removes its custom domain application. Custom domains open here.
2. Void deletes the shared project application, then the health check exception. `<slug>.<your domain>` and `workers.dev` URLs open here.
3. Void deletes the public exceptions. Public projects stay open the whole time.

#### Custom Domains

A custom domain on a protected project goes live only after Void adds it to the project's custom domain application. If Access cannot be updated, the domain stays pending and is not reachable. Void tries again each time it checks the domain.

When you remove a custom domain, Void removes it from the project first, then from the Access application. If the Access update fails, the project shows `reconciling` or `error` and Void retries every hour. A protected project can have up to 100 custom domains. Custom domains on public projects need no Access change.

#### New Projects

A new project starts protected or public based on the default for new projects. If Void cannot set up its protection, creating the project still succeeds with a warning. See [Recovery](#recovery).

#### Deploys and Rollbacks

Deploys and rollbacks wait while a project's protection is not settled, so a deploy cannot publish a project before its protection is in place. They are refused with `Zero Trust protection for this project is not ready`, followed by the reason:

- `Project Zero Trust is still being initialized.`
- `The project public exception is still reconciling.`
- `Project Zero Trust is still reconciling.`

If the saved platform configuration is invalid, they are refused with `The platform Zero Trust configuration is invalid.` instead. Ask a platform administrator to repair it.

A project that is already protected can still deploy during a platform-wide change. While it is being made public, deploys wait until that finishes. See [Project Overrides](#project-overrides) for what to do when a deploy is refused.

### Caching

Responses for signed-in visitors are never shared between visitors. Void skips its shared caches for every request that carries an Access token: [ISR](/guide/edge/revalidation#cache-bypass) and the [static asset edge cache](/guide/edge/static-assets#non-hashed-assets). Each visitor gets a response made for their request.

On a protected project, this means:

- pages render on every request, and ISR never serves a cached page;
- static files and hashed assets skip the edge cache;
- the project handles more requests and may respond more slowly than a public project.

Public projects keep using the shared caches as usual.

## Recovery

A project never becomes public by mistake while a change is in progress. See [What Happens During Changes](#what-happens-during-changes).

- **Status stays `configuring` or `disabling`.** Large changes run in steps. Scheduled maintenance continues them within a few minutes, or run `void platform zero-trust reconcile`.
- **Status shows an error.** Fix the cause shown, such as token permissions or the application limit, then run `void platform zero-trust reconcile`. Otherwise Void retries every hour.
- **One project shows an error.** The rest of the change still finishes. Void retries the project every hour, or its owner or a project administrator can run `void project zero-trust reconcile`. Until then, a project that was already protected stays protected, and a project being newly protected is never more open than before.
- **Adding a domain stays pending because of a project.** Void publishes the new domain only after every project is ready for it. Platform status shows an error that names the projects it could not update. Check each one with `void platform zero-trust project-status <project-id>`, fix the cause, then run `void platform zero-trust reconcile` or rerun the domain command. Void also retries every hour. Your `workers.dev` URLs keep working meanwhile.
- **A new project could not be set up.** Creating the project still succeeds with a warning. Void retries every hour, or run `void project zero-trust reconcile`.
- **The saved API token expired or was revoked.** Run `void platform zero-trust configure --token-stdin` with a replacement token and the same identity providers, policies, and `--protect-new-projects` choice. Omit `--existing-projects`. Void continues the unfinished change, including an unfinished disable. Finish it before changing other settings.
- **A selected identity provider or policy was deleted.** Run `void platform zero-trust disable` to stop the unfinished setup and remove its applications. This makes projects public. Then configure Zero Trust again with the new selections.
