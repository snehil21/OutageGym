import argparse
import json
import os
from datetime import UTC, datetime
from pathlib import Path

from pydantic import ValidationError

from outagegym_grader.judge_artifacts import (
    brief_metadata,
    compare_artifact,
    read_artifact,
)
from outagegym_grader.judge_prompt import build_prompts
from outagegym_grader.judge_providers import (
    JudgeProviderError,
    generate_judge_output,
)
from outagegym_grader.judge_schema import RUBRIC_VERSION, finalize_judge_output

PROMPT_VERSION = "1"


def build_review(
    incident_id: str,
    scenario_root: Path,
    baseline_scenario_root: Path,
    provider: str,
    model: str,
) -> dict:
    scenario = scenario_root / incident_id
    brief_path = scenario / "brief.md"
    evidence = compare_artifact(
        scenario / "evidence.md",
        baseline_scenario_root / incident_id / "evidence.md",
    )
    postmortem = compare_artifact(
        scenario / "postmortem-template.md",
        baseline_scenario_root / incident_id / "postmortem-template.md",
    )
    brief = read_artifact(brief_path)
    prompts = build_prompts(incident_id, brief, evidence.diff, postmortem.diff)
    output = generate_judge_output(provider, model, *prompts)

    return {
        "schemaVersion": 1,
        "incidentId": incident_id,
        "advisory": True,
        "provider": provider,
        "model": model,
        "reviewedAt": datetime.now(UTC).isoformat(),
        "promptVersion": PROMPT_VERSION,
        "rubricVersion": RUBRIC_VERSION,
        "artifacts": {
            "brief": brief_metadata(brief_path, brief),
            "evidence": evidence.metadata(),
            "postmortem": postmortem.metadata(),
        },
        "result": finalize_judge_output(output),
    }


def render_terminal(review: dict) -> str:
    result = review["result"]
    lines = [
        "OutageGym AI written review",
        "",
        f"Provider: {review['provider']}",
        f"Model: {review['model']}",
        "Advisory only: yes",
        "",
    ]
    for dimension in result["dimensions"].values():
        lines.extend(
            [
                (
                    f"[{dimension['score']:>2}/{dimension['maximum']}] "
                    f"{dimension['label']}"
                ),
                f"  {dimension['feedback']}",
            ]
        )

    lines.extend(
        [
            "",
            f"Written score: {result['totalScore']}/{result['maximumScore']}",
            f"Advisory verdict: {result['verdict']}",
            f"Summary: {result['summary']}",
            "",
            "The deterministic behavioural grader remains authoritative.",
        ]
    )
    return "\n".join(lines)


def write_review(review: dict, output_directory: Path) -> Path:
    destination = output_directory / review["incidentId"] / "latest.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(review, indent=2, sort_keys=True) + "\n")
    return destination


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--incident", default=os.getenv("INCIDENT_ID", "inc-001"))
    parser.add_argument(
        "--provider",
        choices=("ollama", "openai", "anthropic"),
        default=os.getenv("AI_JUDGE_PROVIDER", "ollama"),
    )
    parser.add_argument(
        "--model", default=os.getenv("AI_JUDGE_MODEL", "qwen3:4b-instruct")
    )
    parser.add_argument(
        "--scenario-root", type=Path, default=Path("/workspace/scenarios")
    )
    parser.add_argument(
        "--baseline-scenario-root",
        type=Path,
        default=Path("/workspace/baseline-scenarios"),
    )
    parser.add_argument(
        "--output-directory",
        type=Path,
        default=Path("/workspace/.outagegym/reviews"),
    )
    parser.add_argument("--format", choices=("terminal", "json"), default="terminal")
    return parser.parse_args()


def main() -> int:
    arguments = parse_arguments()
    try:
        review = build_review(
            arguments.incident,
            arguments.scenario_root,
            arguments.baseline_scenario_root,
            arguments.provider,
            arguments.model,
        )
        output_path = write_review(review, arguments.output_directory)
    except (JudgeProviderError, ValidationError, ValueError, TypeError) as error:
        print(f"Error: AI written review failed: {error}")
        return 1

    print(
        json.dumps(review, indent=2, sort_keys=True)
        if arguments.format == "json"
        else render_terminal(review)
    )
    if arguments.format == "terminal":
        print(f"Review saved to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
