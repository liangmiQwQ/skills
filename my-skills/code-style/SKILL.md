---
name: code-style
description: Opinionated code style rules covering structure, exports, and comments. Load whenever writing or reviewing code, then read the file for the language in use.
---

# Code Style

Load this skill for any code-related task, then read the file for the language you're working in:

| Language                | Reference            |
| ----------------------- | -------------------- |
| JavaScript / TypeScript | `languages/js-ts.md` |
| Rust                    | `languages/rust.md`  |

## Comments

**Comments explain why, not what.** If a comment restates what the code does, delete it.

Remove procedural comments that narrate the code step by step — they add noise without adding information. If the next reader can infer it from the code in three seconds, the comment is unnecessary.

Keep comments that capture what the code cannot express on its own:

- A non-obvious constraint or external requirement
- Why a seemingly better approach was rejected
- Context that only exists outside the codebase (a spec, a quirk of an upstream service, a compliance rule)

For doc comments: write them on public API items where the name and signature don't fully convey usage. Skip them on private or internal items unless the logic is genuinely complex. Never write a doc comment that only restates the function name — it adds nothing and will drift out of sync.

## Visibility

**Start with nothing visible. Add visibility only when another module needs it.**

Every export or public item is a contract: a name that must stay stable, a surface that must stay compatible. Keep that surface as small as possible.

Reserve the broadest visibility (`export`, `pub`) for the true public API. Use narrower forms (`pub(crate)`, unexported) for everything else. See the language file for specifics.
