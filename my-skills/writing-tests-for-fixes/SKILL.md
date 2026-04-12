---
name: writing-tests-for-fixes
description: Guide for writing result-oriented tests for infrastructure products. Focus on reproducing real issues and validating system behavior rather than implementation details. Use this when fixing bugs in Infra products (CLI tools, runtimes, package managers, dev tools).
---

# Writing Tests for Fixes - Infra Product Testing Specification

This skill is language-independent, Rust is just an example, you can use the rules for projects with ts / go or any other language.

## Core Principle

**Test behavior, not implementation. Validate outcomes, not code paths.**

For infrastructure products, a test's value is measured by:

1. Does it fail when the user-facing behavior breaks?
2. Does it remain green when internal implementation is refactored?
3. Does it reproduce the exact steps from a user's bug report?

Most of the time, you are supposed to write only one single test for one bug fix, unless this bug happens or run differently in multiple condition.

## Test Structure Template

When fixing a bug, write tests following this exact structure:

```rust
/// [One-line description of WHAT behavior this test validates]
///
/// This test reproduces the issue from: [link to issue or bug description]
///
/// User scenario:
/// 1. [User action that triggers the issue]
/// 2. [Expected system behavior]
/// 3. [Actual behavior before fix / Expected after fix]
#[test]
fn [behavior_description_should_work_correctly]() {
    // 1. Environment setup - simulate REAL user environment
    //    - Use temp directories for file system
    //    - Use test guards for configuration
    //    - Read from real config files when possible

    // 2. Action - perform the EXACT user action from bug report

    // 3. Verification - validate USER-VISIBLE outcome
    //    - Exit codes
    //    - Error message content (not just type)
    //    - Side effects (file creation, process state)
}
```

## Mandatory Rules

### Rule 1: Always Reproduce the Exact Issue Steps

**Before writing any test, identify the reproduction steps from the issue.**

You can read the issue with `gh` cli and follow the reproduction steps / repo's action.

```rust
// ✅ GOOD: Steps clearly map to issue reproduction
/// Reproduction from issue #123:
/// 1. `vp env use 18.0.0` (incompatible version)
/// 2. Run `vp dev`
/// Expected: Clear error about Node version requirement
/// Actual (before fix): Cryptic "missing utils" error
#[test]
fn incompatible_node_version_shows_clear_error() {
    // Step 1: Set version via EnvConfig (simulates `vp env use`)
    let _guard = EnvConfig::test_guard(EnvConfig {
        node_version: Some("18.0.0".to_string()),
        ..EnvConfig::for_test()
    });

    // Step 2: Run command
    let result = run_vp_command("dev");

    // Verification: Clear error message
    assert!(result.stderr.contains("Unsupported Node.js version"));
    assert!(result.stderr.contains("^20.19.0 || >=22.12.0"));
}
```

```rust
// ❌ BAD: Tests implementation details, not the issue
#[test]
fn check_runtime_compatibility_returns_error_for_incompatible_version() {
    let runtime = make_runtime_with_version("18.0.0");
    let err = check_runtime_compatibility(&runtime, "^20.19.0 || >=22.12.0")
        .expect_err("should fail");
    assert!(matches!(err, Error::NodeVersionIncompatible { .. }));
}
```

### Rule 2: Validate User-Visible Outcomes, Not Function Return Values

**Test what the USER sees, not what the CODE returns internally.**

```rust
// ✅ GOOD: Validates user experience
#[test]
fn error_message_guides_user_to_fix() {
    let output = run_failing_command();

    assert!(output.exit_code != 0);
    assert!(output.stderr.contains("vp env use 20.19.0"));
    assert!(output.stderr.contains("or"));
    assert!(output.stderr.contains("nvm use 22.12.0"));
}
```

```rust
// ❌ BAD: Validates internal function returns
#[test]
fn error_type_is_correct() {
    let err = internal_check_function();
    assert!(matches!(err, Error::NodeVersionIncompatible { .. }));
    // Doesn't verify user sees useful information!
}
```

### Rule 3: Mock things as few as possible

**Mock only when necessary**

```rust
// ✅ GOOD: Read package.json from project root

// ❌ BAD: Create a package.json by yourself
```

## Test Categories & When to Use Each

### Integration Test (PREFERRED for most Infra bugs)

**Use when**: Bug involves multiple components (config + executor + filesystem)

```rust
#[tokio::test]
async fn [feature]_should_[expected_behavior]_when_[condition]() {
    // Setup: Use real config, real file system (temp dir)
    // Action: Call the main entry point function
    // Verify: Check exit code, error messages, side effects
}
```

**Characteristics**:

- Uses real dependencies when feasible (temp dirs, test guards)
- Tests the actual public API of your module
- Runs in milliseconds to seconds

### Unit Test (Use sparingly for Infra)

**Use only when**: Testing pure algorithms (version parsing, path normalization)

```rust
#[test]
fn semver_parsing_handles_v_prefix() {
    assert_eq!(parse_version("v20.19.0"), "20.19.0");
}
```

**Do NOT unit test**:

- Configuration propagation
- File system interactions
- Process spawning
- Error message formatting (should be integration test)

Never modify the runtime code (like add a parameter to a function) for making unit tests.

### E2E Test (Use only for critical user journeys)

**Use when**: Testing complete CLI user experience (install → use → uninstall)

```rust
#[test]
fn fresh_install_and_first_project_creation() {
    let vp = VpProcess::start().unwrap();
    vp.run("vp new my-project").assert().success();
    vp.run("cd my-project && vp dev").assert().success();
}
```

## Test Isolation Requirements

Each test must be completely isolated:

```rust
// ✅ GOOD: Uses test guard for config isolation
let _guard = EnvConfig::test_guard(EnvConfig {
    node_version: Some("18.0.0".to_string()),
    ..EnvConfig::for_test()
});

// ✅ GOOD: Uses temp directory for file isolation
let temp_dir = TempDir::new().unwrap();
let project_path = AbsolutePathBuf::new(temp_dir.path().to_path_buf()).unwrap();

// ✅ GOOD: Resets global state
static INIT: Once = Once::new();
INIT.call_once(|| {
    // Initialize test environment once
});
```

## Checklist Before Submitting a Test

Before you mark a test as ready, verify:

- [ ] Does it reproduce the exact steps from the issue?
- [ ] Does it validate user-visible behavior (not internal functions)?
- [ ] Is it isolated (temp dirs, test guards, no shared state)?
- [ ] Is it an integration test unless there's a good reason not to be?
- [ ] Would it remain green if I refactor internal implementation?

## Anti-Patterns to Avoid

| Anti-Pattern                | Why It's Bad                           | Better Approach                                   |
| --------------------------- | -------------------------------------- | ------------------------------------------------- |
| Mocking everything          | Tests pass but real usage fails        | Use real dependencies with temp dirs/test guards  |
| Testing private functions   | Refactoring breaks tests unnecessarily | Test public behavior that calls private functions |
| Modify real code for test   | Make the runtime code complex          | Test behavior instead of implementation           |
| Add params to fns for tests | Make the runtime code complex          | Test behavior instead of implementation           |

## Summary

For Infra product testing:

1. **Write integration tests** - They catch real bugs
2. **Reproduce issue steps exactly** - The test is a regression guard
3. **Validate user outcomes** - Error messages, exit codes, behavior
4. **Test the fix path** - Ensure users can recover
5. **Keep tests focused** - One behavior per test

Remember: Ten tests that pass but don't catch the original issue is worse than no test—it creates false confidence.
