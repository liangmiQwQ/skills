# Private IELTS records

## Location and commands

Node.js 22+ with built-in modules only. Resolve the script from the installed skill directory:

```sh
node scripts/learning-store.mjs init
node scripts/learning-store.mjs show
node scripts/learning-store.mjs check --file /absolute/path/to/material-details.json
node scripts/learning-store.mjs record --file /absolute/path/to/event.json
```

The data root is `LANGUAGE_LEARNING_HOME`, otherwise `~/.local/share/language-learning`. `--root PATH` overrides it; `--learner ID` selects a learner (default `default`). Always use a private directory outside public checkouts. IELTS records live in `ielts-reading/<learner-id>/`, separate from Japanese records:

```text
profile.json
events/<event-id>.json
artifacts/<edition-id>/...
```

`init` preserves an existing profile. `show` prints all events, counts and the next unused sequence, not a completed-session count. Profile fields include preferences, evidence-linked baseline, current material and next focus; keep unknown scores and dates null. A profile update must preserve unrelated fields and have a corresponding note event.

Events are immutable JSON files, privately permissioned and atomically published without replacement. Duplicate event IDs fail. `record` serializes validation/publication through `.record-lock`; if another writer holds it, retry after that writer exits and re-read history. For a stale lock after a crash, confirm no writer remains before removing the empty lock directory. Never bypass deduplication to resolve a failed write.

## Events

All events require `id` (lowercase slug), `type`, `occurred_on` (valid ISO date or null), `summary`, `topics` (string array), and `details` (object). The tool sets `recorded_at` and `schema_version: 1`. Recording time is not an imported activity date. Corrections append a note referencing `corrects_event_id`; never overwrite evidence.

### material_created

One event per distinct passage. This means authored/assigned material, never completed study. Required details:

- `material_id`: stable slug; unique across material events.
- `sequence`: positive unique integer. Use `show.next_sequence`; this is an archive sequence, not a completion counter. Imports may retain old printed numbers in `original_session_number`.
- `title`, `passage`: complete body text in paragraph order, without titles, paragraph-label markup, headers, questions, explanations or page breaks.
- `questions`: complete nonempty question set, including instructions and choices. Save the answer key and explanations alongside it or in archived sources. Preserve original question numbers.
- `source`: `kind` is `official_sample`, `published_practice`, `past_paper` or `original`; include verified publisher/URL/key reference as applicable. Optional `key` identifies a specific published passage, not a generic collection URL.
- Recommended: `answer_key`, `archive_paths`, `source_thread_id`, `original_session_number`, `completion_status: "unknown"`, and relevant import limitations.

The helper computes `passage_sha256` from NFKC-normalized, lowercase letter/number tokens, ignoring punctuation and whitespace. Identical text or an identical nonempty source key is rejected regardless of title, questions or ID. `check` takes **details only**, returns matches, and exits 2 on a duplicate (0 otherwise; 1 on an error). `record` takes the full event and enforces the same duplicate check. Same normalized titles or five-word Jaccard overlap of at least 0.6 require a written `novelty_review` to record. This is a warning heuristic, not a guarantee against semantic duplicates. Read all prior material when planning and never use superficial rewrites as new practice.

### exercise_attempt

Details require an existing `material_id`, `stage` (`first_attempt`, `after_hints` or `review`), and nonempty `answers`. Each answer has unique `exercise_id`, `prompt` and `answer`; null means an explicitly blank submission, not a fabricated response. Preserve the learner's wording and evidence. A new revision is a new attempt.

### feedback

Details require an existing `attempt_id` and nonempty `results`. Each result names a submitted `exercise_id`, `result` (`correct`, `incorrect`, `partial`, `unanswered`, `not_assessed`), `correction` and `reason`. Optional `score` contains finite `earned` and positive `possible`, with `grading_basis`. Grade only supplied work; do not calculate a band from a single passage. Save useful error categories and source evidence as additional fields.

### self_report and note

`self_report` preserves the learner's own completion/accuracy/ability claim, its source and material ID if known. A percentage alone is sufficient; unknown denominator stays null. It is not an assessed attempt.

`note` stores preferences, delivery or QA state, revisions, historical imports, unresolved questions and corrections. No attempt or completed score is implied. Import stable IDs once; on rerun verify matching saved evidence and skip it instead of resetting or duplicating history.
