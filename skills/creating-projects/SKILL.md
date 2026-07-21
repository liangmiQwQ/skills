---
name: creating-projects
description: Load this skill when you are required to create projects
---

When you are creating a project, you should make it usable and maintainable, you need to make infrastructure tools, release and validation system work perfectly.

When creating projects, what you should focus on is not the project code, but everything except project code.

You can create a small placeholder like `todo!()` macro and `console.error()`. You can fill the code later if I required. If I don't require you implement any logic, just keep placeholders.

## Related skills

When you are required to create a completely new project (there is no foloder created, and there is no `.git` file), you are supposed to load `$global-project` skills, and use `moi` or `mo` and its `init` subcommand to control the remote and project.

When you are initializing a project, like handling infrastructure and related data, you are supposed to load `$choosing-tools` skills. You can also use `$global-project` to find how my other projects use CI and tools

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
