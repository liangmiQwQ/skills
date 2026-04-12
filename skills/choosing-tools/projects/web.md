---
description: Tool choices for web projects (Vue apps, Nuxt sites, browser UIs)
---

# Web Project Tools

## Core Framework

- **Vue 3 + TypeScript + Vite** for most web apps
- **Nuxt 4** when SSR is needed, or for complex apps that also need a backend — Nuxt handles server routes via Nitro

## Styling

- **UnoCSS** with Wind4 (Tailwind v4) preset + attributify preset
- **Iconify** for icons; `@iconify-json/ph` (Phosphor Icons) is the preferred set

## Composables & Utilities

- **VueUse** (`@vueuse/core`); use `@vueuse/nuxt` in Nuxt projects
- Some VueUse utils should be replaced by Nuxt modules for proper SSR — e.g., `useColorMode` → `@nuxtjs/color-mode`

## Animations

- **motion-v**

## Syntax Highlighting

- **shiki**

## Linting & Formatting

- **ESLint 9+** flat config with `@antfu/eslint-config` (covers formatting, no Prettier needed)
- **simple-git-hooks** + **lint-staged** for pre-commit hooks
- **vue-tsc** for type checking

## Package Manager

- **pnpm**

## Nuxt-Specific

- `@nuxt/content` for content-driven sites
- `@nuxtjs/i18n` for internationalization
- `@nuxtjs/color-mode` instead of VueUse's `useColorMode`
- Nitro + Zod for server routes / API
