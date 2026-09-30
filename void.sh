set -eu

# Only the skill files are needed, so skip installing void and its build scripts
npm pack void --silent
tar -xzf void-*.tgz package/skills
cp -r package/skills/* ./.claude/skills
rm -rf package void-*.tgz
