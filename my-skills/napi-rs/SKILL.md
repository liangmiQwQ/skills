---
name: napi-rs
description: Practical guidance for working on napi-rs bindings across Rust and TypeScript/JavaScript projects. Use this skill when creating, changing, or reviewing a project that exposes Rust functionality to Node.js, TypeScript, or JavaScript through `napi-rs`.
---

## Architecture

- Keep core domain behavior in ordinary Rust crates/modules. Keep JavaScript boundary concerns in a thin NAPI layer.
- Treat the NAPI package as both a Rust crate and an npm package. Rust exports native functions with `#[napi]`; JavaScript files often wrap, patch, or select native/WASI/browser entrypoints.
- Put reusable bridge helpers in a small shared Rust module/crate when multiple packages need the same diagnostics, option conversion, span conversion, or serialization logic.
- Keep the public API shape as a cross-language contract: update Rust exports, generated `.d.ts`, JS wrappers, package tests, and docs together.
- Avoid leaking internal Rust lifetimes, allocator ownership, or implementation-only types into the JS API. Convert at the boundary.

## Directory Layout

- Common monorepo layout: `crates/core-*` for Rust logic, `napi/<package>` or `packages/<package>` for NAPI crates/npm packages, and optional `crates/*_napi` or `crates/node_bridge` for shared bridge helpers.
- Common single-package layout: `src/lib.rs` for NAPI exports, `package.json` for npm metadata and `napi` config, `index.js` for wrappers, `index.d.ts` or generated definitions for TypeScript, and `test/` for JS-level tests.
- Keep generated native artifacts, generated bindings, and platform packages separate from source files.
- Check local conventions before adding new files; napi-rs projects vary between one package per crate and one crate exposing many JS APIs.

Avoid editing generated files unless the task is specifically to update generated artifacts.

## Rust Exports and Type Definitions

- Use `#[napi]` for exported functions, classes, `Task` impls, and string enums.
- Use `#[napi(object)]` for plain JS option/result objects.
- Use `#[napi(object, use_nullable = true)]` when TypeScript should see nullable fields for `Option<T>` rather than only optional-like fields.
- Use `#[napi(string_enum)]` for JavaScript string enums.
- Use `#[napi(ts_type = "...")]` for fields whose generated type should be narrower or clearer than the Rust type.
- Use `#[napi(ts_return_type = "...")]` for getters/functions that return serialized data but should appear as richer TypeScript types, such as ESTree `Program`.
- Use `#[napi(js_name = "...")]` when the JS API name differs from Rust naming.
- Use `#[napi(skip_typescript)]` for low-level or internally wrapped exports that should not appear in public `.d.ts`.
- Prefer `Option<T>` for optional JS inputs, then apply Rust defaults at the boundary before calling core crates.
- Prefer explicit `From`/`TryFrom` conversions from NAPI option structs into internal Rust option structs.
- Use `napi::Either<A, B>` for JS union inputs like `boolean | object`, `string | string[]`, or `string | Options`.
- For object maps exposed to JS, use concrete Rust maps and explicit TS annotations such as `Record<string, string>`.

Example boundary shape:

```rust
#[napi(object)]
#[derive(Default)]
pub struct BindingOptions {
    #[napi(ts_type = "'compact' | 'pretty'")]
    pub format: Option<String>,
    pub include_metadata: Option<bool>,
}

let include_metadata = options.include_metadata.unwrap_or(false);
```

## Data Transfer and Serialization

- JavaScript string offsets are UTF-16. Many Rust libraries use UTF-8 byte offsets. Convert offsets/spans before returning locations, diagnostics, AST nodes, comments, or sourcemaps to JS.
- Keep arena allocators, borrowed buffers, parser state, or other short-lived Rust resources scoped to a single operation. Convert everything that must survive into owned JS-safe values before returning.
- Returned data must own what it needs after source text, arenas, and temporary Rust state are dropped. Avoid returning borrowed data through NAPI objects.
- For large tree-shaped results, consider serializing to JSON strings, compact binary buffers, typed arrays, or project-specific raw transfer instead of eagerly materializing deep JS object graphs in Rust.
- For getters that return large data once, move data out with `mem::take` to avoid cloning.
- Keep string ownership explicit in async tasks. Store owned `String`s in the task and use `mem::take` or `Option::take` when moving them into compute work.

## High-Volume Transfer

- Use ordinary `#[napi(object)]` return values for small and medium results where clarity matters more than transfer overhead.
- Use `Buffer`, `Uint8Array`, JSON strings, or custom binary formats when result construction dominates runtime.
- Keep low-level transfer exports `skip_typescript` when they are implementation details behind JS wrappers.
- Preserve safety invariants for JS-owned buffers: valid encoding, exact byte lengths, stable buffer contents during async work, expected size/alignment when required, and no Rust deallocation of JS-owned memory.
- Gate platform-specific transfer tricks with explicit `cfg` checks. Do not assume pointer width, endianness, allocator behavior, or WASM compatibility.
- Document the JS-side decoding contract near both the Rust export and the wrapper that consumes it.

## Async Tasks and Performance

- Use `napi::Task` plus `AsyncTask` when Rust compute can run off-thread.
- `compute` must not touch JS values. It should consume owned Rust data and return owned Rust output.
- `resolve` converts the Rust output into the JS-visible value.
- Do not assume async is faster. If JS-side object construction or deserialization dominates runtime, sync APIs plus worker threads may outperform a Rust `AsyncTask`.
- For parallel processing of many files, prefer Node worker threads calling sync APIs when that matches existing package guidance.
- Avoid unnecessary allocations at the boundary; pass borrowed source into core crates during the operation and allocate only the data that crosses back to JS.

## Package and Build Files

- Check each package's `package.json` `napi` section for `binaryName`, `packageName`, `targets`, and WASI/browser settings.
- Native builds generally run through `napi build` or `napi build --esm --platform`; release builds may add `--release` and feature flags.
- `postbuild-dev` often runs `node scripts/patch.js`; inspect it before changing generated import paths, wrapper exports, or `.d.ts` assumptions.
- Browser/WASI entrypoints live in files such as `browser.js`, `wasm.js`, `wasi-worker*.mjs`, `*.wasi.cjs`, and `webcontainer-fallback.cjs`.
- Workspace scripts may run NAPI packages through npm, pnpm, yarn, or cargo workspace filters. Follow the repository's existing package manager and script names.

## Testing and Validation

Use the narrowest command that covers the changed package:

```bash
cargo test -p <rust-crate>
pnpm --filter <npm-package> build
pnpm --filter <npm-package> test
npm run build
npm test
```

For shared bridge or broad package changes:

```bash
cargo test
cargo clippy --all-targets
cargo fmt --all --check
pnpm test
pnpm typecheck
```

If public TypeScript shapes change, inspect generated `.d.ts` files and update JS/TS tests under the affected package's `test/` directory. If the project has browser/WASI support, run those tests separately because native Node tests do not cover wrapper selection.

## Review Checklist

- Rust exports and generated TypeScript represent the intended JS API.
- Boundary structs convert cleanly into internal Rust options.
- Returned spans, comments, module records, and diagnostics use JS-visible UTF-16 offsets.
- Returned data owns what it needs after allocator/source lifetimes end.
- Async tasks avoid borrowed stack data and do not access JS values in `compute`.
- High-volume transfer platform guards and safety invariants remain intact.
- Native, WASI, browser, wrapper, and `.d.ts` entrypoints still agree.
- Package tests cover changed behavior at the JS API level.
