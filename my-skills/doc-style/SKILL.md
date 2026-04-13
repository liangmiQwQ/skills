---
name: doc-style
description: Guidelines for writing documentation and prose: prefer paragraphs over heavy formatting, avoid emojis and decorative elements, use simple and direct language. You should load it when you are writing documentation.
---

# Documentation Style

## Prefer prose over structure

Write in paragraphs first. Reach for bullets or headers only when the content is genuinely list-like or when readers need to scan and jump between sections.

Bad — over-structured, hard to read as a whole:

```md
## Overview

- This tool does X
- It supports Y
- It was built because Z

## Features

- Feature A: does this
- Feature B: does that
```

Good — flows naturally, easier to absorb:

```md
This tool does X and supports Y. It was built because Z.

It ships with two main features: A, which handles this, and B, which handles that.
```

Use a list when you have three or more parallel items that don't read well as a sentence. Use a table when you're comparing attributes across multiple things. Use headers when a document is long enough to need navigation.

## Keep formatting minimal

**Bold** is for the single most important phrase in a paragraph—the thing a skimmer must not miss. Do not bold for decoration. Do not bold whole sentences.

Use `code spans` only for actual code: identifiers, commands, file paths. Not for emphasis.

Avoid nested lists. If a list item needs sub-items, the structure is probably too deep—consider rewriting as prose.

## Emojis

Generally avoid them. An occasional emoji in a top-level heading can help a document feel approachable, but that's the limit. Never use emojis in body text, bullet points, or inline callouts.

The more emojis in a document, the less each one means. One is fine. Five is noise.

## Language

Write in plain, direct English. Short sentences are better than long ones. One idea per sentence.

Avoid:

- Filler openers: "In order to", "It is worth noting that", "As mentioned above"
- Passive voice when the actor matters: "The file is created by the CLI" → "The CLI creates the file"
- Vague intensifiers: "very", "quite", "really", "basically"
- Inflated vocabulary when a plain word works: "utilize" → "use", "facilitate" → "help", "implement" → "add" or "build"

Write for someone who is reading quickly. If a sentence can be cut without losing meaning, cut it.

## Callouts and warnings

Use callouts sparingly—one or two per document at most. A document full of `> **Note:**` blocks trains readers to ignore them.

If everything is highlighted, nothing is.
