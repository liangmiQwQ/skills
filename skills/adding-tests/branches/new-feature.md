# Testing a New Feature

Feature tests define the contract of the public API — they document what behavior the feature guarantees and prevent future regressions.

## Structure

```
/// [One-line: what scenario this validates]
///
/// Spec: [requirement, PR, or feature description]
#[test]
fn [feature]_should_[expected_behavior]_when_[condition]() {
    // 1. Setup — minimal real environment for the scenario

    // 2. Action — invoke the feature's public entry point
    //    (not internal helpers)

    // 3. Verify — assert the user-observable result
}
```

## Rules

**Cover the happy path first.** One test that proves the feature works end-to-end is more valuable than five that test corner cases of an untested core.

**Derive edge cases from the spec.** Only test boundary conditions explicitly described in the requirements or obviously implied by the feature's contract. Don't invent cases.

```
// ✅ Edge case from the spec: "empty input returns empty output"
fn feature_returns_empty_when_input_is_empty() { ... }

// ❌ Invented edge case with no spec backing it
fn feature_handles_null_pointer_in_nested_optional_field() { ... }
```

**Test at the public boundary.** Call the same entry point a user would — CLI command, exported function, HTTP endpoint. Don't reach inside to test steps.

**Don't over-specify.** Assert that the output contains what it must; don't assert that it contains nothing else. Leave room for the implementation to evolve.

```
// ✅ Checks what matters
assert!(output.contains("Created project: my-app"));

// ❌ Brittle — breaks on any output change
assert_eq!(output, "Created project: my-app\n");
```

## Checklist

- [ ] Happy path covered first
- [ ] Edge cases trace back to the spec or contract
- [ ] Tests call the public API, not internals
- [ ] Assertions check what must be true, not everything that happens to be true
- [ ] Would stay green if the implementation is replaced with a different approach
