# Printable learning material

## Scope and language

Read the saved preferences first. One useful weekly shape is 7 days, about 25-35 minutes a day, with one lesson page and one exercise page per day, plus a schedule, answers and a kana reference. A short introductory handout may need only 4-6 pages. Adapt page count and workload to the actual request.

For an English-led workbook with Chinese support, keep explanatory English simple. Gloss words above the learner's stated English level and all technical terms in Chinese close to their use. Terms such as briefly, consonant, vowel, particle, register, recall and conjugation may need glosses or simpler wording. Do not let the English become a second unsupported lesson.

Keep lesson content tied to natural exchanges rather than vocabulary-only pages. Each day should contain a clear purpose, a short exchange with meanings, selected spelling details, a small grammar point, guided practice and some meaningful recall or production. Introduce new grammar gradually; romaji and the answer key should be easy to cover.

## Authoring and print checks

- Use A4 white pages with high-contrast text and light rules; avoid ink-heavy decorations. Keep readable body text and generous handwriting space.
- Prefer JavaScript authoring with available document tooling. Use another renderer when the requested format or the available tools make it necessary, and explain that choice. Save an editable content source and the builder, rather than only a PDF. Keep source data separate from layout if that reduces future edits.
- Discover available runtimes and fonts in the current environment. Do not distribute licensed system fonts. Embed licensed-to-embed fonts covering Japanese, Chinese and Latin; verify every used glyph, including small kana, marks and punctuation.
- Prefer fixed lesson boundaries to accidental page flow. A front cover changes duplex pairing: check actual page order before promising that each day's two pages occupy one sheet. Print instructions should match the delivered layout.
- Check that every required exercise is taught or has sufficient lookup support. Make answer identifiers match the final exercise identifiers, including after layout edits.
- Verify spelling, context, casual/polite labels and grammar examples. Consult authoritative sources when uncertain; do not fabricate quotes or claims of expert verification.
- Render the final PDF pages to images and inspect every page for clipping, missing glyphs, cramped tables, incorrect page numbers and usable writing space. Text extraction alone cannot verify layout.
- Verify page count, A4 dimensions, embedded fonts and readable extracted text. Recheck changed pages after edits.

Deliver the final PDF with its duration and print settings. Use the current artifact-tool instructions for linking/display. Do not imply that reading the workbook proves pronunciation accuracy.

## Archive before reporting success

Create a new private artifact directory for each edition, for example:

```text
<learner>/artifacts/week-02-v1/
  workbook.pdf
  content.md
  build.mjs
  manifest.json
```

Keep original files when already generated in another workspace. Copy finalized output and its actual source into the archive; record their relative paths and SHA-256 hashes. Record runtime/font requirements, page count, available source links, generation date when known and any unresolved limitations. Do not overwrite a previous edition. Corrected material gets a new version and a linking event.

Append a `material_created` event with lesson IDs, topics, artifact paths and planned workload. This records availability, not learner completion. Later attempts must reference the exact edition and exercise IDs.

## Useful primary references

- Japan Foundation Irodori beginner lessons and audio: https://www.irodori.jpf.go.jp/en/starter/
- Kana and handwriting reference: https://www.irodori.jpf.go.jp/assets/data/Kana_all.pdf

Check sources when relying on their contents. Teach original examples unless an authentic source excerpt is specifically needed; archive source attribution with the material.
