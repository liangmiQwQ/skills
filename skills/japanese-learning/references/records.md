# Private records

## Location and helper

Use `LANGUAGE_LEARNING_HOME` when set; otherwise use `~/.local/share/language-learning`. Each learner lives under `japanese/<learner-id>/`. The default learner ID is `default`; use separate IDs for classmates with individually attributable work. Never use a public checkout as the data root.

Run the helper from its installed skill directory, using absolute paths if the working directory differs:

```sh
python3 scripts/learning_store.py init
python3 scripts/learning_store.py show
python3 scripts/learning_store.py record --file /absolute/path/to/event.json
python3 scripts/learning_store.py --learner classmate-1 show
```

`--root /absolute/path` overrides the root for that invocation. Record a persistent custom root in the user's environment rather than depending on a particular task directory. Python 3.10+ and its standard library are sufficient; the helper performs no network requests.

```text
<root>/japanese/default/
  profile.json
  events/<event-id>.json
  artifacts/<edition-id>/...
```

`init` does not overwrite an existing profile. `show` is read-only and prints the profile plus events ordered by recording time. It reports event counts, not mastery. `record` validates the event, stamps its recording time and creates a new immutable file atomically; duplicate IDs are errors. A correction is a new event referencing the previous one. Keep private file permissions. Back up this root through the user's existing private backup system if configured; do not create or push a remote without destination-specific authorization.

## Profile

The profile holds current preferences and evidence-linked summaries. Update it when the learner changes preferences or provides new evidence, and append a corresponding event so the earlier state is not lost. Suggested fields:

- `learner_id`, `language`, `schema_version`.
- `preferences`: explanation language, Chinese annotation threshold, print format, daily time, preferred activities, disliked approaches.
- `baseline`: self-reported abilities, source event IDs and unknowns, keeping recognition/writing/listening separate.
- `current_material_id`, `next_focus`, `updated_at`.

Do not place answers or personal details in the public skill as defaults. The blank profile is initialized locally, not committed as real learner data.

## Event contract

Every event requires `id`, `type`, `occurred_on` (ISO date or null), `summary`, `topics` (list of strings) and `details` (object). The helper adds `schema_version: 1` and `recorded_at` in UTC. Use lowercase slug IDs, for example `week-01-day-01-attempt-01`. Recording time is not proof of when an imported activity occurred.

Types:

- `self_report`: the learner's own account of ability or completed work. Include the actual claim and its source. It is not assessed performance.
- `material_created`: edition ID, planned lesson IDs, topics, relative archived file paths, hashes or manifest, and workload. It does not create an attempt.
- `exercise_attempt`: `details.material_id`, `details.answers` (nonempty list of objects with `exercise_id`, `prompt`, `answer`). Preserve the submitted content; use null for an explicitly blank answer and omit unsubmitted exercises. Attach evidence paths when available.
- `feedback`: `details.attempt_id` referencing an existing attempt, `details.results` (nonempty list with `exercise_id`, `result`, `correction`, `reason`). Results are `correct`, `incorrect`, `partial`, `unanswered` or `not_assessed`. Optional `score` has numeric `earned` and positive `possible`; do not score work without a stated grading basis.
- `note`: preferences, unresolved questions, plan changes, corrections or imports that are not exercise performance. Include `corrects_event_id` when applicable.

Example of assigned material, not completed work:

```json
{
  "id": "week-02-v1-created",
  "type": "material_created",
  "occurred_on": null,
  "summary": "A new workbook is available; no answers submitted yet.",
  "topics": ["katakana", "particles"],
  "details": {
    "material_id": "week-02-v1",
    "lesson_ids": ["day-01", "day-02"],
    "manifest": "artifacts/week-02-v1/manifest.json"
  }
}
```

For imports from chat, preserve what is known and identify unknown dates. Do not infer completion from a follow-up question, a generated answer key or the passage of a week. Never log answer-key text as the learner's own submission.
