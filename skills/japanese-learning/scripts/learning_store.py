#!/usr/bin/env python3
"""Keep private Japanese learning evidence outside the installed skill."""

import argparse
from datetime import date, datetime, timezone
import json
import math
import os
from pathlib import Path
import re
import tempfile

TYPES = {"self_report", "material_created", "exercise_attempt", "feedback", "note"}
RESULTS = {"correct", "incorrect", "partial", "unanswered", "not_assessed"}


def slug(value):
    if not isinstance(value, str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,99}", value):
        raise ValueError("IDs must be lowercase slugs of at most 100 characters")
    return value


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def create_json(path, data):
    # Publish a complete file without replacing an earlier event, even on a retry.
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, delete=False) as stream:
            temporary = Path(stream.name)
            json.dump(data, stream, ensure_ascii=False, indent=2, allow_nan=False)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.link(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def validate(event, directory):
    if not isinstance(event, dict):
        raise ValueError("An event must be a JSON object")
    slug(event.get("id"))
    if event.get("type") not in TYPES:
        raise ValueError("Unknown event type")
    if "occurred_on" not in event:
        raise ValueError("occurred_on must be an ISO date or null")
    if event["occurred_on"] is not None:
        date.fromisoformat(event["occurred_on"])
    if not isinstance(event.get("summary"), str) or not event["summary"].strip():
        raise ValueError("An event needs a summary")
    if not isinstance(event.get("topics"), list) or not all(isinstance(x, str) for x in event["topics"]):
        raise ValueError("topics must be a list of strings")
    details = event.get("details")
    if not isinstance(details, dict):
        raise ValueError("details must be an object")
    if event["type"] == "exercise_attempt":
        slug(details.get("material_id"))
        answers = details.get("answers")
        if not isinstance(answers, list) or not answers:
            raise ValueError("An attempt needs submitted answers, not an assigned workbook")
        for answer in answers:
            if not isinstance(answer, dict) or not {"exercise_id", "prompt", "answer"} <= answer.keys():
                raise ValueError("Each answer needs exercise_id, prompt and answer")
        ids = [a["exercise_id"] for a in answers]
        if not all(isinstance(x, str) and x for x in ids) or len(set(ids)) != len(ids):
            raise ValueError("Exercise IDs must be nonempty and unique")
    if event["type"] == "feedback":
        attempt_id = slug(details.get("attempt_id"))
        attempt = read_json(directory / "events" / f"{attempt_id}.json")
        if attempt["type"] != "exercise_attempt":
            raise ValueError("Feedback must refer to a submitted attempt")
        results = details.get("results")
        if not isinstance(results, list) or not results:
            raise ValueError("Feedback needs exercise results")
        submitted = {a["exercise_id"] for a in attempt["details"]["answers"]}
        seen = set()
        for result in results:
            if not isinstance(result, dict) or not {"exercise_id", "result", "correction", "reason"} <= result.keys():
                raise ValueError("Each result needs exercise_id, result, correction and reason")
            exercise_id = result["exercise_id"]
            if exercise_id not in submitted or exercise_id in seen or result["result"] not in RESULTS:
                raise ValueError("Results must refer once to a submitted exercise")
            seen.add(exercise_id)
        score = details.get("score")
        if score is not None:
            if not isinstance(score, dict):
                raise ValueError("score must contain earned and possible")
            earned, possible = score.get("earned"), score.get("possible")
            if not all(type(x) in (int, float) and math.isfinite(x) for x in (earned, possible)):
                raise ValueError("Scores must be finite numbers")
            if possible <= 0 or not 0 <= earned <= possible or not details.get("grading_basis"):
                raise ValueError("Scores need a valid range and an explicit grading_basis")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(os.environ.get("LANGUAGE_LEARNING_HOME", Path.home() / ".local/share/language-learning")))
    parser.add_argument("--learner", default="default", type=slug)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("init")
    commands.add_parser("show")
    record = commands.add_parser("record")
    record.add_argument("--file", required=True, type=Path)
    args = parser.parse_args()
    directory = args.root.expanduser().resolve() / "japanese" / args.learner
    profile_path = directory / "profile.json"
    os.umask(0o077)
    try:
        if args.command == "init":
            if not profile_path.exists():
                create_json(profile_path, {"schema_version": 1, "learner_id": args.learner, "language": "japanese", "preferences": {}, "baseline": {}, "current_material_id": None, "next_focus": []})
            (directory / "events").mkdir(exist_ok=True, mode=0o700)
            (directory / "artifacts").mkdir(exist_ok=True, mode=0o700)
            print(directory)
        elif args.command == "show":
            profile = read_json(profile_path)
            events = [read_json(p) for p in (directory / "events").glob("*.json")]
            events.sort(key=lambda x: (x["recorded_at"], x["id"]))
            counts = {kind: sum(event["type"] == kind for event in events) for kind in sorted(TYPES)}
            print(json.dumps({"path": str(directory), "profile": profile, "event_counts": counts, "events": events}, ensure_ascii=False, indent=2))
        else:
            if not profile_path.exists():
                raise ValueError("Initialize this learner before recording an event")
            event = read_json(args.file.expanduser())
            validate(event, directory)
            event["schema_version"] = 1
            event["recorded_at"] = datetime.now(timezone.utc).isoformat()
            destination = directory / "events" / f'{event["id"]}.json'
            create_json(destination, event)
            print(destination)
    except (OSError, ValueError, TypeError, KeyError) as error:
        parser.exit(1, f"Learning store: {error}\n")


if __name__ == "__main__":
    main()
