---
layout: home
theme: dark

hero:
  name: Void.
  text: Ship Vite apps at warp speed
  tagline: A deployment platform designed for Vite. A powerful backend SDK to make your Vite apps truly full-stack.
  actions:
    - theme: brand
      text: Get Started
      link: ./guide/
  image:
    src: /hero.svg
    alt: Void deployment platform

features:
  - iconify: lucide:terminal
    title: One Command to Production
    details: '`void deploy` builds your app, runs migrations, provisions resources, and deploys it.'
  - iconify: lucide:layers
    title: Truly Full-Stack
    details: Database, KV storage, object storage, AI inference, authentication, queues, and cron jobs. All built-in. Import what you need, skip what you don't.
  - iconify: lucide:wand-sparkles
    title: Your Code is Your Infra
    details: Void detects supported resources from your code and provisions them when you deploy. Use explicit configuration for existing infrastructure and services that need additional setup.
  - iconify: lucide:shield-check
    title: Performant and Reliable
    details: Build on Cloudflare Workers with checked migrations, versioned deployments, and tools to inspect and roll back application releases.
  - iconify: lucide:blocks
    title: Your Framework, Your Rendering
    details: React, Vue, Svelte, Solid, Vite-based meta-frameworks. SSR, SSG, ISR, islands with partial hydration, and markdown.
  - iconify: lucide:bot
    title: AI-Native
    details: Built-in skills and reference prompts let coding agents scaffold and ship full-stack apps in a single prompt.

footer_heading: Deploy at Warp Speed
footer_subheading: Vite. Optimized. Isomorphic. Deploy.
---

<script setup>
import Home from './.vitepress/theme/Home.vue'
</script>

<Home />
