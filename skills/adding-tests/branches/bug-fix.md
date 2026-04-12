# Testing a Bug Fix

A bug fix test is a **regression guard** — it proves the bug existed and won't silently come back.

This is language-independent; Rust is used as an example, but the rules apply to TS, Go, or any other language.

## Test Structure

```rust
/// [One-line: what behavior this validates]
///
/// Reproduces: [issue link or description]
///
/// Scenario:
/// 1. [User action that triggers the bug]
/// 2. [Expected behavior after fix]
/// 3. [Actual behavior before fix]
#[test]
fn [behavior]_should_[work]_when_[condition]() {
    // 1. Setup — simulate REAL user environment
    //    - Use temp directories for file system
    //    - Use test guards for configuration
    //    - Read from real config files when possible

    // 2. Action — perform the EXACT user action from the bug report

    // 3. Verify — validate USER-VISIBLE outcome
    //    - Exit codes
    //    - Error message content (not just type)
    //    - Side effects (file creation, process state)
}
```

## Rule 1: Always Reproduce the Exact Issue Steps

**Before writing any test, identify the reproduction steps from the issue.**

You can read the issue with `gh` CLI and follow the reproduction steps.

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

## Rule 2: Validate User-Visible Outcomes, Not Function Return Values

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

## Rule 3: Mock as Little as Possible

**Mock only when there is no real alternative.**

```rust
// ✅ GOOD: Read package.json from project root

// ❌ BAD: Create a package.json by yourself
```

## Test Categories

### Integration Test (PREFERRED)

**Use when**: Bug involves multiple components (config + executor + filesystem).

```rust
#[tokio::test]
async fn [feature]_should_[expected_behavior]_when_[condition]() {
    // Setup: Use real config, real file system (temp dir)
    // Action: Call the main entry point function
    // Verify: Check exit code, error messages, side effects
}
```

- Uses real dependencies when feasible (temp dirs, test guards)
- Tests the actual public API of your module

### Unit Test (Use sparingly)

**Use only when**: Testing pure algorithms (version parsing, path normalization).

```rust
#[test]
fn semver_parsing_handles_v_prefix() {
    assert_eq!(parse_version("v20.19.0"), "20.19.0");
}
```

**Do NOT unit test**: configuration propagation, file system interactions, process spawning, error message formatting.

Never modify runtime code (add a parameter to a function) just to make a unit test work.

### E2E Test (Use only for critical user journeys)

**Use when**: Testing complete CLI experience (install → use → uninstall).

```rust
#[test]
fn fresh_install_and_first_project_creation() {
    let vp = VpProcess::start().unwrap();
    vp.run("vp new my-project").assert().success();
    vp.run("cd my-project && vp dev").assert().success();
}
```

## Test Isolation

Each test must be completely isolated:

```rust
// ✅ Test guard for config isolation
let _guard = EnvConfig::test_guard(EnvConfig {
    node_version: Some("18.0.0".to_string()),
    ..EnvConfig::for_test()
});

// ✅ Temp directory for file isolation
let temp_dir = TempDir::new().unwrap();
let project_path = AbsolutePathBuf::new(temp_dir.path().to_path_buf()).unwrap();
```

## Anti-Patterns

| Anti-Pattern                   | Why It's Bad                           | Better Approach                                   |
| ------------------------------ | -------------------------------------- | ------------------------------------------------- |
| Mocking everything             | Tests pass but real usage fails        | Use real dependencies with temp dirs/test guards  |
| Testing private functions      | Refactoring breaks tests unnecessarily | Test public behavior that calls private functions |
| Modifying real code for test   | Makes runtime code complex             | Test behavior instead of implementation           |
| Adding params to fns for tests | Makes runtime code complex             | Test behavior instead of implementation           |

## Checklist

- [ ] Reproduces the exact steps from the issue
- [ ] Validates user-visible behavior (not internal functions)
- [ ] Isolated — temp dirs, test guards, no shared state
- [ ] Integration test unless there's a good reason not to be
- [ ] Would stay green if internals are refactored

Write one test per bug unless the bug manifests differently under multiple conditions.
