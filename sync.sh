#!/usr/bin/env sh

ska() {
  skills add "$@" -y -a claude-code
}

# ====== SKILLS ADDING AREA BEGIN =======

ska vercel-labs/agent-skills --skill web-design-guidelines
ska tw93/Waza --skill hunt design think
ska vercel-labs/skills
ska anthropics/skills --skill frontend-design
ska vuejs-ai/skills
ska slidevjs/slidev
ska antfu/skills

sh install-skills/vp.sh # For vp skills


# ====== SKILLS ADDING AREA ENDED =======

rm -rf skills/*
cp -r .claude/skills/* skills/
cp -r my-skills/* skills/
rm -rf .claude
pnpm run fmt
