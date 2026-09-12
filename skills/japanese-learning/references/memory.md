# Focused learning memory

The private store is a learning memory, not a conversation archive. Save enough to make the next learning decision accurately while keeping detailed evidence available on demand.

## Read progressively

1. Start with `node scripts/learning-store.mjs context`. It returns the current profile, current material summary and up to five recent learning-event summaries. Administrative notes and full answer/transcript payloads are excluded.
2. Use `event --id <event-id>` when the current task needs original evidence, a particular correction or the manifest location. The profile can also point to evidence IDs. Open only the relevant lesson or artifact.
3. Use `show` for a full-history audit, troubleshooting or a deliberate search across older records. It remains backward compatible; it is not the default input to each lesson.

The context view is a read-only projection, not a separate mutable summary file. `--limit 0..20` controls recent evidence. Older events remain on disk. The view counts recording recency, not achievement: self-reports stay self-reports, assigned material stays assigned, and no missing feedback implies completion or failure.

## What belongs in memory

Keep stable preferences, evidence-linked ability summaries, the current material ID, reported completion or accuracy, recurring errors actually observed, and unresolved questions that affect upcoming lessons. Keep the profile concise: current facts and useful uncertainty, not repeated event text. In `next_focus`, prefer a few concrete next decisions over a running conversation log.

Write an event when new information changes learning or preserves actual evidence. Do not create a duplicate event just because the same preference was mentioned again, the profile was read, or another chat opened. Routine greetings, assistant plans, tool output, Git/CI updates and general explanations do not need learning-memory events. Existing operational records may remain for provenance; do not erase them automatically.

Use `details.memory_scope: "learning"` for a `note` only when its summary affects teaching, such as a newly stated preference or an unresolved pronunciation question. Other notes remain accessible through `event` and `show` without filling the default context. Keep raw wording or long evidence in `details` or an artifact rather than repeating it in the summary.

## Corrections and uncertainty

Explicit current instructions override older preferences. Update the profile once and link the new evidence event; preserve older events for provenance. Do not silently overwrite conflicting performance evidence or declare that a skill was mastered based on one score. If a summary is stale, inspect its source and correct it rather than treating memory as authority over the user.

If the learner does not return answers, continue without requiring them. An accuracy-only report should retain its material/day when known, percent, and unknown denominator as null. It cannot identify particular wrong questions or prove retention later. Record no invented attempts, weaknesses or scores.

There is no background learning, automatic forgetting, mandatory recall quiz or requirement to report progress. This is task-scoped persistence: read what helps now, save meaningful changes, and leave unrelated history out of the next lesson.
