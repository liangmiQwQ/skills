---
name: adding-tests
description: Guide for writing tests that validate real behavior. Routes to the right approach based on context (bug fix, new feature). Core rule: test what the user sees, not how the code works internally. Load this skill when you are doing test related works.
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
