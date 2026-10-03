# {{repo}} Agent Guide

{{TODO: One paragraph. What the project is, and who it is for.}}

## Project Overview

{{TODO: Non-obvious architecture and design trade-offs only. Delete this section if there is nothing beyond what the code says.}}

{{toolchain}}

## Project Layout

{{TODO: for complicated project, you need to describe where the submodules are placed. For small project, or common projects, this part can be omitted.}}

## Rules

If you find AGENTS.md is outdated, please notice users to change in response.

Keep code functional. Write simple code that junior developers can understand, and make functions reusable if possible. Use Unix philosophy to design your code (Every function should only do one thing and should not be too long or complex).

Use existing dependencies and tools. Feel free to add dependencies. Don't reinvent the wheel.

Commit messages and PR titles follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

Add `.gitkeep` file when creating new empty directory.
