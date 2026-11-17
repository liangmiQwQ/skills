#!/usr/bin/env bash

# Stop before `rm -rf skills/*` if any skill fails to install
set -eu

# The lockfile outlives `.claude`, so reset it to drop skills no longer synced
rm -f skills-lock.json

ska() {
  npx skills add "$@" -y -a claude-code
}

# ====== SKILLS ADDING AREA BEGIN =======

ska anthropics/skills --skill frontend-design
ska slidevjs/slidev
ska antfu/skills --skill antfu-issue-triage nitro nuxt pinia pnpm unocss vite vitepress vitest
ska liangmiQwQ/mo --skill global-projects
ska liangmiQwQ/new
ska liangmiQwQ/vp-config
ska liangmiQwQ/language-learning
ska yetone/kill-ai-slop
ska zerob13/skills --skill test-doctor
ska cloudflare/security-audit-skill
sh void.sh

# ====== SKILLS ADDING AREA ENDED =======

rm -rf skills/*
cp -r .claude/skills/* skills/
cp -r my-skills/* skills/
rm -rf .claude
pnpm run fmt
