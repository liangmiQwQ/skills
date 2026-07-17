---
name: code-style
description: You are required to load this before writing code. Load this skill for code-related task. Do not use this skill for simple reading code or analyze tasks unless it's related to personal codestyle.
---

Load $precise-minior-adjustment skill as needed, it is used to tell agents how to make code simple and consistent with other parts in codebase.

After your finish your task, also run a round of simplify according to $precise-minior-adjustmen before commit or summarizing.

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

---

After your finishing your whole implementation, check the code diff, if the diff is more than 50 lines while there are no comments added, there are problems.

## Diagnostics Handling

In my project, I have a set of strict linting rules. It's normal to meet the diagnostics.

When meeting diagnostics, the first thing you do is to think, not to change the code. You should check whether the diagnostic's purpose fit the current code's purpose and behavior target. You should check whether following diagnostic will make the code more complex, more confusing or more simple.

You should reject some unreasonable diagnostics, and keep the reasonable ones. Follow the code style.

When you are rejecting an unreasonable diagnostics, prefer use comment (`// oxlint-disable-...`, `#[allow(...)]`) to disable it, instead of disabling it globally and modifying config files. You can also check the codebase to know whether there is other cases disable the same rules, if a rule is disabled too many time, you can suggest me to adjust config file in the response. But do not modify them urself unless I required.

## Visibility

**Start with nothing visible. Add visibility only when another module needs it.**

Every export or public item is a contract: a name that must stay stable, a surface that must stay compatible. Keep that surface as small as possible.

## Organize

One goal to achieve when coding is to make the code more structured and predictable. That will make humans easy to control and review your code.

For example, you can use a big `match`(Rust), and handle different branches for different cases with simple lines.

A thousand lines of structured, predictable, regular code is better than five hundred lines of messy code.

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
