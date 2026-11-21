---
name: github-dev-oauth
description: Load this skill when a project needs "Sign in with GitHub" (GitHub OAuth) during local development, such as setting up GitHub login, filling GitHub client ID / secret in `.env`, or fixing a local GitHub OAuth callback. Do not load it for production credentials or GitHub Apps.
---

# GitHub Dev OAuth

I keep one shared GitHub **OAuth App** for local development across all my projects. Do not create a new OAuth App for a project's local development.

## The Shared App

- Credentials live in `~/.env` as `AUTH_GITHUB_CLIENT_ID` and `AUTH_GITHUB_CLIENT_SECRET`.
- Its callback URL is `http://localhost:5173/`. GitHub accepts any `redirect_uri` path under it, so every framework's callback path works (for example `/api/auth/callback/github`).
- It is for `localhost` only. Production always uses a separate OAuth App owned by that project.

## Using It in a Project

1. Make sure the project's `.env` is gitignored before writing anything to it.
2. Copy the two values into the project's `.env` with shell commands, without printing them. Rename the keys when the framework expects other names:

   ```bash
   grep -E '^AUTH_GITHUB_CLIENT_(ID|SECRET)=' ~/.env >> .env
   # Different names, e.g. GITHUB_CLIENT_ID:
   grep -E '^AUTH_GITHUB_CLIENT_(ID|SECRET)=' ~/.env | sed 's/^AUTH_//' >> .env
   ```

3. Run the dev server on `localhost:5173` with a strict port (e.g. `--strictPort` in Vite), so the callback never lands on another port.
4. Request scopes in the project's code. The app itself has no scopes, so each project asks only for what it needs.

## Rules

- Never print, echo, `cat`, or commit the secret, and never put it in a skill, README, PR, or CI config.
- Never use these credentials for production, previews, or deployments. Tell me to create a production OAuth App and store its credentials in the platform's secret store.
- Do not edit `~/.env` unless I ask.
- If `~/.env` lacks the keys, stop and ask me instead of creating an OAuth App.

## Known Limits

- GitHub keeps at most 10 tokens per user, app, and scope set, and revokes an older one beyond that. A project's stored token may stop working after signing in to many others; signing in again fixes it.
- All projects show the same name and logo on GitHub's consent screen, and revoking the app signs out every project.
