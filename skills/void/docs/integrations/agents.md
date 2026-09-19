---
outline: deep
---

# Using Void with Coding Agents

`void init` gives your coding agent Void instructions and reference docs. To add or refresh just that setup, run:

```sh
npx void init --agents
```

This always creates or updates `AGENTS.md` with four brief bullets covering Void, deployment targets, the development workflow, and where to find the docs. It preserves your existing content outside the versioned Void block and leaves other instruction files untouched. There is no coding-agent selection prompt.

The complete Markdown docs ship with the installed package at `node_modules/void/skills/void/docs/`. Agents can read them directly, even without a linked skill.

## Skills

Skills point your agent to the commands and docs it needs for the task. They link to the installed `void` package, so the guidance matches the version your app uses.

Void ships two skills:

- **`void`:** main development skill. Routes agent requests to the right documentation for CLI commands, routing, pages, database, auth, deployment, and more.
- **`migrate-vite-cloudflare-to-void`:** migration skill for converting existing `@cloudflare/vite-plugin` apps to Void.

Skills are linked automatically by `void init --agents` when it detects a supported agent's configuration. For Claude Code, they are symlinked into `.claude/skills/`. Other detected agents have them linked to their respective directories. If no agent is detected, skill linking is skipped and `AGENTS.md` points directly to the bundled docs.
