import argparse
import json
import os
from pathlib import Path
from typing import Any

from outagegym_grader.judge_prompt import build_prompts
from outagegym_grader.judge_providers import generate_judge_output
from outagegym_grader.judge_schema import finalize_judge_output

DEFAULT_CASES = Path("/workspace/grader/evals/judge-cases.json")


def evaluate_expectation(case: dict[str, Any], result: dict[str, Any]) -> list[str]:
    expected = case["expected"]
    score = result["totalScore"]
    failures = []

    if not expected["minimumScore"] <= score <= expected["maximumScore"]:
        failures.append(
            f"score {score} was outside "
            f"{expected['minimumScore']}..{expected['maximumScore']}"
        )
    if result["verdict"] != expected["verdict"]:
        failures.append(
            f"verdict {result['verdict']} did not match {expected['verdict']}"
        )
    return failures


def evaluate_case(case: dict[str, Any], provider: str, model: str) -> dict[str, Any]:
    prompts = build_prompts(
        case["incidentId"],
        case["brief"],
        case["evidenceChanges"],
        case["postmortemChanges"],
    )
    result = finalize_judge_output(generate_judge_output(provider, model, *prompts))
    failures = evaluate_expectation(case, result)
    return {
        "name": case["name"],
        "status": "PASSED" if not failures else "FAILED",
        "score": result["totalScore"],
        "verdict": result["verdict"],
        "expected": case["expected"],
        "failures": failures,
    }


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cases", type=Path, default=DEFAULT_CASES)
    parser.add_argument("--provider", default=os.getenv("AI_JUDGE_PROVIDER", "ollama"))
    parser.add_argument(
        "--model", default=os.getenv("AI_JUDGE_MODEL", "qwen3:4b-instruct")
    )
    return parser.parse_args()


def main() -> int:
    arguments = parse_arguments()
    cases = json.loads(arguments.cases.read_text())
    evaluations = [
        evaluate_case(case, arguments.provider, arguments.model) for case in cases
    ]
    report = {
        "provider": arguments.provider,
        "model": arguments.model,
        "status": (
            "PASSED"
            if all(item["status"] == "PASSED" for item in evaluations)
            else "FAILED"
        ),
        "cases": evaluations,
    }
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "PASSED" else 1


if __name__ == "__main__":
    raise SystemExit(main())
