---
layout: home
theme: dark

hero:
  name: Void
  text: Full-stack apps with Vite
  tagline: Add server routes, data, and Cloudflare resources to your app. Deploy with one command.
  actions:
    - theme: brand
      text: Get Started
      link: ./guide/
  image:
    src: /hero.svg
    alt: Void deployment platform

features:
  - iconify: lucide:terminal
    title: Deploy with One Command
    details: '`void deploy` builds your app, provisions resources, applies migrations, and deploys it.'
  - iconify: lucide:layers
    title: Full-Stack Features
    details: Use a database, KV, object storage, AI, authentication, queues, and cron jobs as your app needs them.
  - iconify: lucide:wand-sparkles
    title: Resources from Your Code
    details: Void detects supported resources from your imports and provisions them on deploy. Configure existing resources explicitly.
  - iconify: lucide:shield-check
    title: Deploy with Confidence
    details: Run on Cloudflare Workers with checked migrations, versioned deployments, logs, and rollback.
  - iconify: lucide:blocks
    title: Choose Your Framework
    details: Use React, Vue, Svelte, Solid, or a supported Vite framework with SSR, SSG, ISR, and islands.
  - iconify: lucide:bot
    title: Work with Coding Agents
    details: Void provides project instructions and skills to help coding agents build and deploy your app.

footer_heading: Build with Vite. Deploy with Void.
footer_subheading: Server code, resources, and deployment in one workflow.
---

<script setup>
import Home from './.vitepress/theme/Home.vue'
</script>

<Home />
