---
name: code-style
description: You are required to load this before writing or reviewing code. Load this skill for any code-related task
---

# Code Style

Read the corresponding file below as needed:

| Language                | Reference            |
| ----------------------- | -------------------- |
| JavaScript / TypeScript | `languages/js-ts.md` |
| Rust                    | `languages/rust.md`  |

## Comments

**Comments are necessary for complex logic.** Do not wrap a sentence's comment into multiple lines unless the linter / checker requires.

We should keep comments simple and short. If the next reader can infer it from the code in three seconds, the comment is unnecessary.

Keep comments that capture what the code cannot express on its own:

- A non-obvious constraint or external requirement
- Why a seemingly better approach was rejected
- Context that only exists outside the codebase (a spec, a quirk of an upstream service, a compliance rule)

And the comments there should explain why, not what.

Never write a doc comment that only restates the function name — it adds nothing and will drift out of sync.

---

Another acceptable form of annotation is a flow comment for complex functions. For a part of complex, multiple phases logic, we can add comments like `// 1. Check environment` `// 2. Read config` to help human divide code into different parts.

If a piece of logic can be clearly divided into multiple stages and exceeds 50 lines, then it needs flow comments.

## Visibility

**Start with nothing visible. Add visibility only when another module needs it.**

Every export or public item is a contract: a name that must stay stable, a surface that must stay compatible. Keep that surface as small as possible.

Reserve the broadest visibility (`export`, `pub`) for the true public API. Use narrower forms (`pub(crate)`, unexported) for everything else. See the language file for specifics.

## Advanced guidance

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, stop your work then ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
