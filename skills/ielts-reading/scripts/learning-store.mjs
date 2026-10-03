#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";

const types = ["self_report", "material_created", "exercise_attempt", "feedback", "note"];
const results = ["correct", "incorrect", "partial", "unanswered", "not_assessed"];

function slug(value) {
  assert(
    typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,99}$/.test(value),
    "IDs must be lowercase slugs of at most 100 characters",
  );
  return value;
}

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function expand(value) {
  return value === "~"
    ? homedir()
    : value.startsWith("~/")
      ? join(homedir(), value.slice(2))
      : value;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function createJson(path, data) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = join(dirname(path), `.pending-${randomUUID()}`);
  const descriptor = openSync(temporary, "wx", 0o600);
  try {
    try {
      writeFileSync(descriptor, `${JSON.stringify(data, null, 2)}\n`);
      fsyncSync(descriptor);
    } finally {
      closeSync(descriptor);
    }
    // Publish a complete file atomically; an existing event is never replaced.
    linkSync(temporary, path);
  } finally {
    unlinkSync(temporary);
  }
}

// Normalize passage content, excluding titles, questions and layout before calling this helper.
function normalize(text) {
  return text.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+/gu)?.join(" ") ?? "";
}

function materials(directory) {
  return readdirSync(join(directory, "events"))
    .filter((name) => name.endsWith(".json"))
    .map((name) => readJson(join(directory, "events", name)))
    .filter((event) => event.type === "material_created");
}

function compare(details, directory) {
  assert(object(details), "Material details must be an object");
  assert(typeof details.passage === "string" && normalize(details.passage), "Save the full passage text");
  const normalized = normalize(details.passage);
  const fingerprint = createHash("sha256").update(normalized).digest("hex");
  // Five-word overlap catches lightly edited passages; an agent still reviews semantic repetition.
  const shingles = (value) => {
    const words = value.split(" ");
    return new Set(
      words.slice(0, Math.max(1, words.length - 4))
        .map((_, i) => words.slice(i, i + 5).join(" ")),
    );
  };
  const left = shingles(normalized);
  const matches = [];
  for (const event of materials(directory)) {
    const previous = event.details;
    const text = normalize(previous.passage);
    const exact = normalized === text;
    const sameSource = Boolean(details.source?.key && details.source.key === previous.source?.key);
    const right = shingles(text);
    const common = [...left].filter((value) => right.has(value)).length;
    const similarity = common / (left.size + right.size - common);
    const sameTitle = typeof details.title === "string" && normalize(details.title) === normalize(previous.title);
    if (exact || sameSource || sameTitle || similarity >= 0.6) {
      matches.push({ material_id: previous.material_id, title: previous.title, exact, same_source: sameSource, same_title: sameTitle, similarity });
    }
  }
  return { fingerprint, matches, duplicate: matches.some((match) => match.exact || match.same_source) };
}

function validate(event, directory) {
  assert(object(event), "An event must be a JSON object");
  slug(event.id);
  assert(types.includes(event.type), "Unknown event type");
  if (event.occurred_on !== null) {
    const value = event.occurred_on;
    assert(
      typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value),
      "occurred_on must be an ISO date or null",
    );
    const parsed = new Date(`${value}T00:00:00Z`);
    assert(
      Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value,
      "occurred_on must be a valid date",
    );
  }
  assert(typeof event.summary === "string" && event.summary.trim(), "An event needs a summary");
  assert(
    Array.isArray(event.topics) && event.topics.every((value) => typeof value === "string"),
    "topics must be a list of strings",
  );
  const { details } = event;
  assert(object(details), "details must be an object");
  if (event.type === "material_created") {
    slug(details.material_id);
    assert(typeof details.title === "string" && details.title.trim(), "A material needs a title");
    assert(Number.isSafeInteger(details.sequence) && details.sequence > 0, "Use a positive sequence number");
    assert(Array.isArray(details.questions) && details.questions.length, "Save the question set");
    assert(object(details.source) && ["official_sample", "published_practice", "past_paper", "original"].includes(details.source.kind), "Identify material provenance");
    const previous = materials(directory);
    assert(!previous.some((entry) => entry.details.material_id === details.material_id || entry.details.sequence === details.sequence), "Material ID and sequence must be unique");
    const checked = compare(details, directory);
    assert(!checked.duplicate, `Duplicate passage: ${JSON.stringify(checked.matches)}`);
    if (checked.matches.length) {
      assert(typeof details.novelty_review === "string" && details.novelty_review.trim(), "Similar material needs a written novelty review; prefer another passage");
    }
    details.passage_sha256 = checked.fingerprint;
  }
  if (event.type === "exercise_attempt") {
    slug(details.material_id);
    assert(materials(directory).some((entry) => entry.details.material_id === details.material_id), "Attempt must reference a saved material");
    assert(["first_attempt", "after_hints", "review"].includes(details.stage), "Keep first attempts, hint revisions and reviews separate");
    const { answers } = details;
    assert(
      Array.isArray(answers) && answers.length,
      "An attempt needs submitted answers, not an assigned workbook",
    );
    for (const answer of answers) {
      assert(
        object(answer) &&
          ["exercise_id", "prompt", "answer"].every((key) => Object.hasOwn(answer, key)),
        "Each answer needs exercise_id, prompt and answer",
      );
    }
    const ids = answers.map((answer) => answer.exercise_id);
    assert(
      ids.every((id) => typeof id === "string" && id) && new Set(ids).size === ids.length,
      "Exercise IDs must be nonempty and unique",
    );
  }
  if (event.type === "feedback") {
    const attemptId = slug(details.attempt_id);
    const attempt = readJson(join(directory, "events", `${attemptId}.json`));
    assert(attempt.type === "exercise_attempt", "Feedback must refer to a submitted attempt");
    assert(
      Array.isArray(details.results) && details.results.length,
      "Feedback needs exercise results",
    );
    const submitted = new Set(attempt.details.answers.map((answer) => answer.exercise_id));
    const seen = new Set();
    for (const result of details.results) {
      assert(
        object(result) &&
          ["exercise_id", "result", "correction", "reason"].every((key) =>
            Object.hasOwn(result, key),
          ),
        "Each result needs exercise_id, result, correction and reason",
      );
      assert(
        submitted.has(result.exercise_id) &&
          !seen.has(result.exercise_id) &&
          results.includes(result.result),
        "Results must refer once to a submitted exercise",
      );
      seen.add(result.exercise_id);
    }
    if (details.score != null) {
      assert(object(details.score), "score must contain earned and possible");
      const { earned, possible } = details.score;
      assert(Number.isFinite(earned) && Number.isFinite(possible), "Scores must be finite numbers");
      assert(
        possible > 0 && earned >= 0 && earned <= possible && details.grading_basis,
        "Scores need a valid range and an explicit grading_basis",
      );
    }
  }
}

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      root: {
        type: "string",
        default:
          process.env.LANGUAGE_LEARNING_HOME ?? join(homedir(), ".local/share/language-learning"),
      },
      learner: { type: "string", default: "default" },
      file: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(
      "Usage: node learning-store.mjs [--root PATH] [--learner ID] <init|show|check --file MATERIAL-DETAILS.json|record --file EVENT.json>",
    );
    return;
  }
  // Resolve the selected learner without changing existing profiles or events.
  const [command] = positionals;
  assert(
    positionals.length === 1 && ["init", "show", "check", "record"].includes(command),
    "Choose init, show, check, or record; use --help for usage",
  );
  assert(
    ["record", "check"].includes(command) ? values.file : values.file === undefined,
    "--file is required for record/check and only valid for these commands",
  );
  const directory = resolve(expand(values.root), "ielts-reading", slug(values.learner));
  const profilePath = join(directory, "profile.json");
  process.umask(0o077);
  if (command === "init") {
    if (!existsSync(profilePath)) {
      createJson(profilePath, {
        schema_version: 1,
        learner_id: values.learner,
        language: "english",
        track: "ielts-reading",
        preferences: {},
        baseline: {},
        current_material_id: null,
        next_focus: [],
      });
    }
    mkdirSync(join(directory, "events"), { recursive: true, mode: 0o700 });
    mkdirSync(join(directory, "artifacts"), { recursive: true, mode: 0o700 });
    console.log(directory);
  } else if (command === "show") {
    const profile = readJson(profilePath);
    const eventDirectory = join(directory, "events");
    const events = existsSync(eventDirectory)
      ? readdirSync(eventDirectory)
          .filter((name) => name.endsWith(".json"))
          .map((name) => readJson(join(eventDirectory, name)))
      : [];
    events.sort(
      (a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at) || a.id.localeCompare(b.id),
    );
    const counts = Object.fromEntries(
      [...types].sort().map((type) => [type, events.filter((event) => event.type === type).length]),
    );
    console.log(
      JSON.stringify({ path: directory, profile, next_sequence: Math.max(0, ...events.filter((event) => event.type === "material_created").map((event) => event.details.sequence)) + 1, event_counts: counts, events }, null, 2),
    );
  } else if (command === "check") {
    const checked = compare(readJson(expand(values.file)), directory);
    console.log(JSON.stringify(checked, null, 2));
    if (checked.duplicate) process.exitCode = 2;
  } else {
    assert(existsSync(profilePath), "Initialize this learner before recording an event");
    const event = readJson(expand(values.file));
    // Serialize duplicate checking and publishing so simultaneous sessions cannot reuse a passage.
    const lock = join(directory, ".record-lock");
    mkdirSync(lock, { mode: 0o700 });
    try {
      validate(event, directory);
      event.schema_version = 1;
      event.recorded_at = new Date().toISOString();
      const destination = join(directory, "events", `${event.id}.json`);
      createJson(destination, event);
      console.log(destination);
    } finally {
      rmdirSync(lock);
    }
  }
}

try {
  main();
} catch (error) {
  console.error(`Learning store: ${error.message}`);
  process.exitCode = 1;
}
