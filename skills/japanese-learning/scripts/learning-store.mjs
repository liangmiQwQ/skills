#!/usr/bin/env node
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
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
  if (event.type === "exercise_attempt") {
    slug(details.material_id);
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
      "Usage: node learning-store.mjs [--root PATH] [--learner ID] <init|show|record --file EVENT.json>",
    );
    return;
  }
  const [command] = positionals;
  assert(
    positionals.length === 1 && ["init", "show", "record"].includes(command),
    "Choose init, show, or record; use --help for usage",
  );
  assert(
    command === "record" ? values.file : values.file === undefined,
    "--file is required for record and only valid for record",
  );
  const directory = resolve(expand(values.root), "japanese", slug(values.learner));
  const profilePath = join(directory, "profile.json");
  process.umask(0o077);
  if (command === "init") {
    if (!existsSync(profilePath)) {
      createJson(profilePath, {
        schema_version: 1,
        learner_id: values.learner,
        language: "japanese",
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
      JSON.stringify({ path: directory, profile, event_counts: counts, events }, null, 2),
    );
  } else {
    assert(existsSync(profilePath), "Initialize this learner before recording an event");
    const event = readJson(expand(values.file));
    validate(event, directory);
    event.schema_version = 1;
    event.recorded_at = new Date().toISOString();
    const destination = join(directory, "events", `${event.id}.json`);
    createJson(destination, event);
    console.log(destination);
  }
}

try {
  main();
} catch (error) {
  console.error(`Learning store: ${error.message}`);
  process.exitCode = 1;
}
