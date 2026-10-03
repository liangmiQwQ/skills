# {{repo}} Agent Guide

{{TODO: One paragraph. What the project is, and who it is for.}}

## Project Overview

{{TODO: Non-obvious architecture and design trade-offs only. Delete this section if there is nothing beyond what the code says.}}

{{toolchain}}

## Rules

Keep AGENTS.md updated with the project codebase. Consider if there is need to modify AGENTS.md after your changes. Only record non-obvious rules and gotchas in AGENTS.md. Don't store things that can be read from files, like project structure or project status.

Keep code functional. Write simple code that junior developers can understand, and make functions reusable if possible. Use Unix philosophy to design your code (Every function should only do one thing and should not be too long or complex).

Use existing dependencies and tools. Feel free to add dependencies. Don't reinvent the wheel.

Commit messages and PR titles follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

Add `.gitkeep` file when creating new empty directory.
