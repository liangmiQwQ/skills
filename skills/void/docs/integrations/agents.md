---
outline: deep
---

# Using Void with Coding Agents

`void init` gives your coding agent Void instructions and reference docs. To add or refresh just that setup, run:

```sh
npx void init --agents
```

Void updates `AGENTS.md` with development guidance and links to the docs, preserving your existing instructions.

The complete Markdown docs ship with the installed package at `node_modules/void/skills/void/docs/`. Agents can read them directly, even without a linked skill.

## Skills

Skills point your agent to the commands and docs it needs for the task. They link to the installed `void` package, so the guidance matches the version your app uses.

Void ships two skills:

- **`void`:** commands and docs for app development.
- **`migrate-vite-cloudflare-to-void`:** migration skill for converting existing `@cloudflare/vite-plugin` apps to Void.

Skills are linked automatically by `void init --agents` when it detects a supported agent's configuration. For example, Claude Code uses `.claude/skills/`. If no agent is detected, skill linking is skipped and `AGENTS.md` points directly to the bundled docs.
