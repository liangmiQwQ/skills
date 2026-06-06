---
name: adding-tests
description: Load this skill when a project includes tests, and you are finishing things like bug fix or feature addition and you plan to do tests related work.
---

# Adding Tests

## Core Principle

**One test is usually enough. Only add multiple tests if the bug manifests differently under multiple conditions.**

**Test behavior, not implementation. Validate outcomes, not code paths.**

A test's value is measured by:

1. Does it fail when user-facing behavior breaks?
2. Does it stay green when internals are refactored?
3. Does it catch the real issue it was written for?

## Routing

Identify your context, then read the corresponding file:

| Context     | When to use                                        | Reference                 |
| ----------- | -------------------------------------------------- | ------------------------- |
| Bug fix     | Fixing a reported issue, adding a regression guard | `branches/bug-fix.md`     |
| New feature | Adding new behavior, validating a spec             | `branches/new-feature.md` |

## Universal Rules

These apply regardless of context:

- **Prefer integration tests** — they catch real bugs; unit tests rarely do for most projects
- **Mock as little as possible** — use real deps, temp dirs, test guards
- **One behavior per test** — don't combine multiple assertions for unrelated behaviors
- **Test the public surface** — never modify production code (add params, expose internals) to make a test work

Read the relevant branch file for context-specific guidance.
