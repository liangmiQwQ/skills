# Rust Style

## Structure

`impl` blocks and methods are idiomatic Rust—use them. Struct + `impl` is the right way to model owned state with associated behavior. Traits are the right abstraction for shared behavior.

Do not force everything into free functions to avoid OOP aesthetics. Follow the language's conventions.

## Visibility (`pub`)

Start with no `pub`. Add visibility only when the item must be accessible outside its module.

`pub(crate)` is usually the right choice for items shared across modules within the same crate. Reserve bare `pub` for the actual public API surface.

Bad:

```rust
pub struct QueryBuilder { ... }
pub fn normalize(row: Row) -> User { ... }
pub async fn fetch_users(filters: &[Filter]) -> Vec<User> { ... }
```

Good:

```rust
struct QueryBuilder { ... }
fn normalize(row: Row) -> User { ... }

pub async fn fetch_users(filters: &[Filter]) -> Vec<User> { ... }
```

Do not add `pub` to satisfy a test. Move the test into the same module with `#[cfg(test)]` instead—it gets access to private items for free.

## Comment examples

```rust
// Retry limit matches the upstream service's idempotency window.
// Exceeding it causes duplicate entries.
for _ in 0..3 {
    if db.insert(&user).await.is_ok() { break }
}
```

Never write `/// Returns the foo` on a function named `get_foo` — it adds nothing and will drift out of sync.

## Avoid chained calls

Prefer `match`, `if ... else ...`, `if let`, `let ... else ...` over chained `and_then`, `map`, `map_or_else`, `filter`, etc. because the former is more readable and maintainable.

Especially for long chains, it's hard to read and debug.

It doesn't means you can never use functional style. It means we should use them sparingly.
Remember, Everything is done for the sake of code readability.
