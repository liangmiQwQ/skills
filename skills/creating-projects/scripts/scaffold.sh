#!/usr/bin/env bash
# Usage: scaffold.sh <stack> <dest> <owner> <repo> [description]
#
# Copies `common` and the stack's layers into <dest> in order, then:
# - renames `_name` paths to `.name` and `__repo__` paths to <repo>
# - merges every layer's `AGENTS.part.md` into `{{toolchain}}`
#   and `CONTRIBUTING.part.md` into `{{setup}}`
# - fills `{{owner}}`, `{{repo}}`, `{{repo_ident}}`, `{{description}}`, `{{year}}`, `{{rust_version}}`
# - runs every layer's `setup.sh` inside <dest>
#
# `{{TODO: ...}}` placeholders are left for the agent to write.

set -euo pipefail

if [ $# -lt 4 ]; then
  sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//' >&2
  exit 1
fi

stack=$1
dest=$2
export OWNER=$3
export REPO=$4
export DESCRIPTION=${5:-}
export REPO_IDENT=${REPO//-/_}
export YEAR=$(date +%Y)

templates="$(cd "$(dirname "$0")/../templates" && pwd)"

case "$stack" in
  rust) layers=(common rust) ;;
  js-lib) layers=(common js js-lib) ;;
  js-cli) layers=(common js js-cli) ;;
  *) echo "Unknown stack: $stack (expected rust, js-lib or js-cli)" >&2; exit 1 ;;
esac

mkdir -p "$dest"
dest="$(cd "$dest" && pwd)"
if [ -n "$(ls -A "$dest" | grep -vx '.git')" ]; then
  echo "$dest is not empty" >&2
  exit 1
fi

for layer in "${layers[@]}"; do
  cp -R "$templates/$layer/." "$dest/"
done
rm -f "$dest/AGENTS.part.md" "$dest/CONTRIBUTING.part.md" "$dest/setup.sh"

# Rename deepest paths first so parents still exist while renaming children
find "$dest" -depth -mindepth 1 -not -path "$dest/.git/*" \( -name '__repo__' -o -name '_*' \) | while read -r path; do
  base=$(basename "$path")
  case "$base" in
    __repo__*) mv "$path" "$(dirname "$path")/$REPO${base#__repo__}" ;;
    _*) mv "$path" "$(dirname "$path")/.${base#_}" ;;
  esac
done

merge_parts() {
  for layer in "${layers[@]}"; do
    if [ -f "$templates/$layer/$1" ]; then
      cat "$templates/$layer/$1"
      echo
    fi
  done
}
export TOOLCHAIN="$(merge_parts AGENTS.part.md)"
export SETUP="$(merge_parts CONTRIBUTING.part.md)"
if [[ " ${layers[*]} " == *" rust "* ]]; then
  export RUST_VERSION="$(rustc --version | cut -d' ' -f2)"
fi

find "$dest" -type f -not -path "$dest/.git/*" -print0 | xargs -0 perl -pi -e '
  s/^\{\{toolchain\}\}\n/$ENV{TOOLCHAIN}\n/;
  s/^\{\{setup\}\}\n/$ENV{SETUP}\n/;
  s/\{\{owner\}\}/$ENV{OWNER}/g;
  s/\{\{repo\}\}/$ENV{REPO}/g;
  s/\{\{repo_ident\}\}/$ENV{REPO_IDENT}/g;
  s/\{\{description\}\}/$ENV{DESCRIPTION}/g;
  s/\{\{year\}\}/$ENV{YEAR}/g;
  s/\{\{rust_version\}\}/$ENV{RUST_VERSION}/g;
'

for layer in "${layers[@]}"; do
  if [ -f "$templates/$layer/setup.sh" ]; then
    (cd "$dest" && bash -euo pipefail "$templates/$layer/setup.sh")
  fi
done

echo "Scaffolded $stack into $dest"
grep -rnE --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=target '\{\{(TODO|[a-z_]+\}\})' "$dest" || true
