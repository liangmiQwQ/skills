## Toolchain

Vite+ is used as the project manager, together with the `@liangmi/vp-config` preset. Use `vp install` to install dependencies, use `vp install -D` if the added dependency can be bundled. Use `vp run` command to run commands in `package.json`. Do not use `pnpm` or `npm` directly. Docs are local at `node_modules/vite-plus/docs`.

Run `vp check` (lint and format) after you make changes. Type checking is part of linting, do not add a separate `tsc` check.
