---
description: Tool choices for Rust projects
---

# Rust Project Tools

## Testing

- **insta** — snapshot testing
- **criterion** — benchmarks

## Task Runner

- **just** — Justfile-based, replaces Makefile

## String & Text

- **memchr** — fast string searching
- **regex** — use native `str` methods first when possible

## Async

- **tokio** — async runtime

## Serialization

- **serde** / **serde_json**

## CLI

- **clap** — CLI arg parsing

## JS/Web Tooling

Use these when building JavaScript-related tooling in Rust:

- **oxc** — JS AST / parser / transformer / linter
- **napi-rs** — expose Rust to Node.js

Most cases, I prefer directly use https://github.com/liangmiQwQ/rs-starter.git (except napi-rs project). Please checkout my personal rs-starter template repository to learn more.
