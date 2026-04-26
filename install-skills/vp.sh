#!/usr/bin/env sh
set -e

PKG="package.json"
BACKUP="${PKG}.bak"

# Save original package.json
cp "$PKG" "$BACKUP"

# Install vite-plus as dev dependency
pnpm install -D vite-plus

# Run experimental sync
cp -r node_modules/vite-plus/skills/* .claude/skills/

# Revert package.json and reinstall
cp "$BACKUP" "$PKG"
rm "$BACKUP"
pnpm install
