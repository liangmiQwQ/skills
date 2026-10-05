# How to Create a Project Well

`SKILL.md` lists the steps. This guide explains the thinking behind them, so you can make good calls when a request doesn't match a step exactly. Read it before writing any file.

## What the templates are for

A new project is judged by everything except its code: can someone clone it, install, check, test, release, and understand the rules in a few minutes? The templates are Liang's answer to that question, tuned over many projects. Each file holds decisions that aren't visible from the file alone:

- The common `AGENTS.md` rules are shared by all of Liang's projects. Agents working in the new project later rely on them being there.
- `CONTRIBUTING.md` is written for outside contributors, which is why it is long and friendly.
- CI lints once on Linux but tests on three operating systems, because lint results don't depend on the OS while runtime behavior does.
- The release workflow builds, writes a changelog and publishes to npm, so that a release is only `vp run release`.

So treat a template as a finished design you are instantiating, not a suggestion you rewrite. When you feel like shortening or "cleaning up" a template file, the template is probably encoding something you can't see. Keep it.

You still need judgment, but in the right places: filling placeholders, mapping the request onto the stacks, and handling what the templates don't cover.

## Read the request carefully

Requests are short, and each word maps to a specific decision. Decide what each one means before scaffolding, and ask when a word could reasonably mean two different things.

- **"private" / "public"** is the GitHub repository visibility, which is what `moi init` needs. It says nothing about npm. A private repo can still publish a public package, and most of Liang's packages are meant to be published. Only skip publishing when the user says so ("don't publish", "internal only").
- **"workspace" / "monorepo"** is a layout, not a different kind of project. The stack is still decided by what the packages are (a library, a CLI). See [Workspaces](#workspaces).
- **"typescript"** means a JavaScript stack. It doesn't pick between `js-lib` and `js-cli`. The project name and description usually do: a config helper like `oxlint-flat-config` is a library.
- **No description** means you don't know what the project is for. Ask. Don't describe the scaffold ("TypeScript workspace for X") instead, because that ends up in the GitHub description, README and `package.json`, where it reads as nonsense.

When you must assume, pick the reading that matches the template defaults and say so in your final message.

## Changing a template file

Every change to a copied file should be one of these:

1. **A filled placeholder**: `{{repo}}`, `{{TODO: ...}}` and so on.
2. **A required adjustment**: a scoped package name, an extra package, a CLI binary, moving files for a workspace.
3. **A tool's own output**: the formatter rewriting a file, a package manager writing a lockfile.

If a change is none of these, ask why you want it. If the template is wrong, fix it in the `liangmiQwQ/new` repository so every future project benefits, then apply the same fix to the new project. If the template is fine and the change is just your taste, don't make it.

At the end, `diff` each generated file against its template. This catches the changes you made without noticing.

## Writing the docs

`AGENTS.md`, `CONTRIBUTING.md` and `README.md` are read for years, not just today. Write what stays true.

- Good: what the project is, who it is for, where things live, gotchas a newcomer can't see in the code (for example, that lint config only works in the root `vite.config.ts`).
- Bad: the current state of the scaffold ("the entry point is empty", "no tests yet", "remove this flag later"), tool versions ("use the 0.6 API", "pnpm 12.9.1"), and anything a tool already enforces.

Keep the fixed text of the templates word for word, and only write where a placeholder is. When you merge `*.part.md` files into `{{toolchain}}` and `{{setup}}`, a part may bring its own `## Rules` section. Move those paragraphs into the template's existing `## Rules` section, above the common rules, instead of creating a second heading with the same name.

## Placeholder code and tests

The project code is a placeholder, but it must still pass every check, so CI is green from the first commit and stays meaningful:

- Export one small function that throws `Not implemented yet` (or `todo!()` in Rust).
- Write one test that calls it and expects the throw.

Don't make an empty suite pass with `--passWithNoTests`, and don't silence lint with an `oxlint-disable` comment on an empty file. Both hide the infrastructure you were asked to set up, and someone has to remember to undo them later.

## Dependencies

Templates don't pin versions, so every project starts on the latest ones. For JavaScript, all versions live in the default catalog in `pnpm-workspace.yaml`, and manifests reference them with `catalog:`.

`vp install -D <pkg>` writes a plain version into `package.json` instead of the catalog, and it can resolve an outdated version from a stale cache. So do it in this order:

1. Look up each version with `npm view <pkg> version`. For Vite+, use the version `@liangmi/vp-config` supports (`npm view @liangmi/vp-config peerDependencies.vite-plus`).
2. Write the catalog entries yourself, then add each dependency to `devDependencies` as `catalog:`.
3. Run `vp install`, then check that `node_modules` has the versions you looked up.

Add `packageManager` to the root `package.json` with the pnpm version that was used, since contributors use corepack.

## Workspaces

There is no workspace template, because a workspace is just the stack's files arranged in two levels:

- **Root**: `common` and `js`, with the stack's `package.json`. It is `"private": true` (a workspace root is never published), named `<repo>-monorepo`, and only keeps the scripts that act on the whole workspace: `check`, `prepare`, recursive `build` and `test`, and `release` as `bumpp -r`. The dev tools and the catalog live here.
- **`packages/<repo>`**: the stack layer (`package.json`, `src`, `tests`, `vite.config.ts`). The package keeps every template field, including `publishConfig`, and is not private. Remove only the scripts the root now runs (`prepare`, `release`).
- **Workflows** stay as they are. The release workflow already publishes with `-r`, which skips private packages.

Vite+ only reads `lint` and `fmt` from the root `vite.config.ts`, so `$use-vp-config` puts the root config there and package configs only set `pack`, `test` and `run`. Mention this in the project's `AGENTS.md`, since it surprises people.

## When nothing fits

Websites, napi-rs projects, mixed languages: some requests have no template. Start from the closest stack and keep its shape, its rules and its infrastructure. Build only the missing part by hand, and look at Liang's existing projects (`$global-projects`) for how they did it. If you can't decide something that changes the project's shape, like whether it publishes or what the packages are, ask.

Never drop the templates because one part doesn't fit. That turns one unknown into a whole project of guesses.

## A worked example

The request "create a project called oxlint-flat-config, private, typescript workspace" once produced a broken repo. Here is what went wrong, and what each step should have been:

| The agent did                                                        | It should have                                                                |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Read "private" as "no publishing" and made every package private     | Made the GitHub repo private and kept the package publishable                 |
| Had no description, so wrote "Private TypeScript workspace"          | Asked what the project does                                                   |
| Found no workspace template and wrote every file from scratch        | Applied `js-lib` in two levels, as described in [Workspaces](#workspaces)     |
| Cut `CONTRIBUTING.md` to 3 lines, replaced the `AGENTS.md` rules      | Kept the template text and only filled placeholders                           |
| Merged CI into one Linux job, removed npm publishing from releases   | Kept both workflows unchanged                                                 |
| Wrote "entry point is empty", "remove `--passWithNoTests` later"     | Wrote a throwing placeholder and a test for it, and only lasting facts        |

Each mistake was a reasonable local decision. Together they produced a repo that looked complete but didn't do what Liang's projects do. Following the templates, and asking about the two unclear words, avoids all of them.
