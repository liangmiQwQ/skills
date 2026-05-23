---
name: creating-pr
description: Load this skill before creating, drafting, modifying, or submitting PR on GitHub
---

## Title

For most projects, maintainers use `squash and merge`. We should follow Conventional Commits for PR title.

```
<type>[optional scope]: <description>
```

The type of PR is decided on the code behavior changes. For example, even if a PR is linked to a `Bug` issue, but it actually adds the missing feature to close it, its type still should be `feat`.

We generally use a lowercase starting imperative sentence as the `<description>` part.

For example

```
feat(cli): add global packages support
```

## PR Setting

If no special requirement provided, submit draft PR.

Always check `Allow edits by maintainers`.

## Description

PR description should always follow simple and human-readable principles.

Avoid excessive headings and checklists when simple paragraphs are enough. Try to use short paragraphs to express your idea and implementation details. Try using sentences like `This PR adds ...`, `The current behavior ...`, `Follows ...'s behavior`

If this PR is linked to an issue, put a `Close #xyz` on the top of the description.

For bug fixes without an issue, you should describe the bug first. And then describe this PR's changes.

For projects with `.github/workflows`, we do not need to describe `Validation` part because CI will help verify your implementation.

Add a line `🤖 Generated with [The Agent Tool's Name]` in the bottom of the description.

A good PR description should like this, comments should be removed in practice. Paragraphs inside `CORE DESCRIPTION` part can be repeated as needed.

```markdown
Close #1 <!-- If there is a linked issue -->

<!-- CORE DESCRIPTION START -->

The current ... <!-- Describe a bug or current behavior if no issue linked-->

This PR adds ... <!-- Describe behavior changes if there is -->

This PR includes ... <!-- Describe implement details if it is worth telling like refactor, module movements,especially for chore/refactor PR -->

No behavior changes. <!-- If this is a chore/refactor PR -->

<!-- CORE DESCRIPTION END -->

🤖 Generated with [Agent Name] <!-- Replace [Agent Name] with the tool you're using, e.g. Codex / Claude Code. -->
```
