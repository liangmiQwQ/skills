#!/usr/bin/env bash

# Stop before `rm -rf skills/*` if any skill fails to install
set -eu

# The lockfile outlives `.claude`, so reset it to drop skills no longer synced
rm -f skills-lock.json

ska() {
  npx skills add "$@" -y -a claude-code
}

# ====== SKILLS ADDING AREA BEGIN =======

ska vercel-labs/agent-skills --skill web-design-guidelines vercel-react-best-practices
ska vercel-labs/skills
ska anthropics/skills --skill frontend-design
ska vuejs-ai/skills
ska slidevjs/slidev
ska antfu/skills
ska liangmiQwQ/mo --skill global-projects
ska liangmiQwQ/new
ska liangmiQwQ/vp-config
ska liangmiQwQ/language-learning
ska yetone/kill-ai-slop
ska zerob13/skills --skill test-doctor
ska antfu/design
sh void.sh

# In `antfu/skills`, `antfu-create-pr` conflicts with our own `creating-pr` skill
rm -rf .claude/skills/antfu-create-pr

# ====== SKILLS ADDING AREA ENDED =======

rm -rf skills/*
cp -r .claude/skills/* skills/
cp -r my-skills/* skills/
rm -rf .claude
pnpm run fmt
