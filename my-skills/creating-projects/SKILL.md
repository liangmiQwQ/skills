---
name: creating-projects
description: Load this skill when you are required to create projects. Do not load this skill when you are creating reproduction/poc repo.
---

When you are creating a project, you should make it usable and maintainable, you need to make infrastructure tools, release and validation system work perfectly.

When creating projects, what you should focus on is not the project code, but everything except project code.

You can create a small placeholder like `todo!()` macro and `console.error()`. You can fill the code later if I required. If I don't require you implement any logic, just keep placeholders.

## Required initialization gate

For a completely new project, finish the managed project initialization before writing any scaffold or project files:

1. Load the `$global-projects` skill and use its paired resolver to find the configured project root and project CLI.
2. Resolve the repository owner and name. If either is missing or ambiguous, ask the user before creating the project directory.
3. Resolve whether the repository should be public or private. If the user did not specify visibility, ask before continuing.
4. Run the selected CLI's `init` command with the explicit visibility option from `<root>/<owner>/<repo>`.
5. Verify the local path and `origin` remote, then create the scaffold inside that initialized repository.

An explicit request to create or initialize a new project authorizes the managed initialization. Once the owner, name, and visibility are known, do not ask for a second confirmation before running `moi init --public`, `moi init --private`, or the paired `mo` command.

Do not create the project in the current task directory, `work/`, `outputs/`, or another artifact directory unless the user explicitly chose that location. Generic artifact-output guidance does not override the managed project workflow.

Do not use plain `git init` as a substitute for `moi init` or `mo init`. Do not silently skip managed initialization because a required choice is missing; ask the user for that choice instead.

## Related skills

When you are initializing a project, like handling infrastructure and related data, you are supposed to load `$choosing-tools` skills. You can also use `$global-projects` to find how my other projects use CI and tools

## Aspects of a project

When you are initializing a project, you should care about these aspect:

1. Project layout (single-package, or a workspace, one language or multiple-languages mixed)
2. Basic toolchain (Do not only care about build, care about linting, formatting, testing, git hooks, staging)
3. Package Release (Skip for website, how to trigger, maintenance comment in response, GitHub compatible)
4. CI checking (Add CI checks, including test, build, snap tests, e2e tests, codestyle, linting, formatting)
5. Document placeholder (MIT License or other license as required, basically README.md)
6. Editor settings (`.vscode` folder, format and lint)
7. Scripts (For manually validation, and installing the developing products onto the using computer)
8. Deploy (Websites)
9. Tools version (Node version, Rust version)
10. GitHub repo description, PR merge setting
11. AGENTS.md document

You should prepare them in detail but should not make them too complex, for example, linting CI shouldn't be run on all macOS, Linux and Windows, a small library also doesn't need a VitePress website for docs.
