---
outline: deep
---

# Schema and CI

## Changing the Platform Schema

The schema lives in `platform/packages/api/src/schema.ts`. Generate a migration after changing it:

```sh
vp run --filter @voidcloud/api db:generate
```

Review the generated SQL and migration journal before committing them. Released migrations are append-only. An upgrade applies new migrations while the previous Workers may still serve requests, so schema changes must remain compatible with that code.

`platform/packages/api/drizzle/compatibility.json` records which earlier runtimes have been verified against the new schema. Add an edge only after testing that compatibility. The runtime build checks that the migration files and recorded schema history agree. See `packages/platform/README.md` for the manifest contract.

## CI in a Fork

The uncredentialed test workflows use GitHub-hosted runners in forks. They build and test the workspace without requiring Void Cloud accounts, tokens, or deployment access.

If your fork has a released platform version, set the repository variable
`VOID_PLATFORM_PRODUCTION_REF` to its immutable 40-character commit SHA. Platform
pull requests then create that version's database, seed representative user,
project, and encrypted-secret records, and apply the proposed migrations. The
check verifies existing data and runs the previous runtime against the upgraded
schema. Mutable branch or tag names are rejected.

Without an explicit SHA, required compatibility checks use the latest successful
GitHub deployment to `Prod` (or `VOID_PLATFORM_PRODUCTION_ENV`). They require
read access to deployment history and stop if no completed deployment is found.
Advancing the production branch does not change the selected baseline. Fork
workflows that call platform CI must grant `deployments: read` alongside
`contents: read`.

The upstream repository also contains workflows for deploying Void Cloud and publishing the official npm packages. Forks should configure their own release workflow around the built CLI and `platform upgrade --runtime`; the [source-build CI example](/guide/platform/development/runtime#deploying-source-builds-from-ci) shows the required inputs. Keep production credentials in protected environments restricted to the appropriate release refs.

Public releases use matching versions for the CLI, scaffolder, adapters, and
packaged platform. The publish workflow rejects mismatched versions and previously
unpublished `void` versions that npm cannot reuse. Stable versions use `latest`;
prereleases use their named channel, such as `beta` or `rc`. Numeric prereleases
use `next`. The scaffolder installs its exact matching CLI version, so
`create-void@beta` cannot silently select the stable CLI. Packaged platform
runtimes record the release commit as their source revision.

The npm release job uses [trusted publishing](https://docs.npmjs.com/trusted-publishers/)
from GitHub-hosted runners, with `id-token: write` and no stored npm publishing
token. Configure a trusted publisher for each public package using this
repository, `publish.yml`, and the `Release` environment, allowing direct
`npm publish`. A brand-new package
needs an initial authenticated publication before its trusted publisher can be
configured; subsequent releases use OIDC.

The managed build fallback CLI also derives its version from
`packages/void/package.json`; there are no separate version pins to update.
Build its image from the repository root with
`docker build --file platform/packages/api/container/Dockerfile .`.
The root `.dockerignore` limits that build context to the agent, Dockerfile,
and public SDK manifest.

Publishing requires both SDK CI and platform CI, including the platform unit and
API integration suites. Release tags also run the Windows SDK checks; a passing
SDK-only build cannot publish a changed control plane.

### Retrying a Release

To retry a failed release without moving an existing tag, add `+retry.N` to a
new Git tag, with `N` starting at `1`. Keep the package versions unchanged:

| Git tag                  | Package version | npm channel |
| ------------------------ | --------------- | ----------- |
| `v0.21.0`                | `0.21.0`        | `latest`    |
| `v0.21.0+retry.1`        | `0.21.0`        | `latest`    |
| `v0.21.0-beta.1+retry.2` | `0.21.0-beta.1` | `beta`      |

For example, when the packages are at `0.21.0`, commit the release fix and tag
that commit:

```sh
git tag -a 'v0.21.0+retry.1' -m 'Retry 0.21.0 publication.'
git push origin 'refs/tags/v0.21.0+retry.1'
```

The retry suffix belongs only in the Git tag, not in `package.json`. A `-1`
suffix is a distinct prerelease version, not a retry. Tag and package versions
are checked before dependency installation and the full CI jobs; retries still
run the normal release checks.

Retries publish only package versions that are still missing from npm. They
cannot replace an already-published version. If an earlier attempt partially
published the release and you changed its package contents, bump the version
instead of combining different contents under the same version.

For implementation history, use the design archive at `platform/meta/design-docs/README.md`. Its proposals explain earlier decisions; the source and current guides define the supported behavior.
