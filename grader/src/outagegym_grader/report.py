import argparse
from contextlib import redirect_stderr, redirect_stdout
from io import StringIO
import json
from pathlib import Path
from typing import Any

import pytest

from outagegym_grader.config import load_config
from outagegym_grader.documents import (
    WRITTEN_REVIEW_STATUS,
    validate_written_artifacts,
)


CHECK_NAMES = {
    "test_aws.py": "Local runtime resources",
    "test_backlog_recovery.py": "Load recovery",
    "test_config.py": "Runtime safety",
    "test_documents.py": "Written artifact structure",
    "test_duplicate_delivery.py": "Processing integrity",
    "test_order_flow.py": "Order completion",
    "test_report.py": "Assessment consistency",
}


class AssessmentPlugin:
    def __init__(self) -> None:
        self.checks: dict[str, bool] = {}

    def pytest_runtest_logreport(self, report: pytest.TestReport) -> None:
        filename = Path(report.nodeid.split("::", 1)[0]).name
        check_name = CHECK_NAMES.get(filename, "Assessment consistency")

        if report.failed or report.skipped:
            self.checks[check_name] = False
        elif report.when == "call" and self.checks.get(check_name) is not False:
            self.checks[check_name] = True


def build_result(
    incident_id: str,
    checks: dict[str, bool],
    automated_passed: bool,
    scenario_root: Path,
) -> dict[str, Any]:
    artifacts = validate_written_artifacts(scenario_root, incident_id)

    return {
        "schemaVersion": 1,
        "incidentId": incident_id,
        "automated": {
            "status": "PASSED" if automated_passed else "FAILED",
            "checks": [
                {
                    "name": name,
                    "status": "PASSED" if passed else "FAILED",
                }
                for name, passed in sorted(checks.items())
            ],
        },
        "written": {
            "status": WRITTEN_REVIEW_STATUS,
            "artifacts": [
                {
                    "name": artifact.name,
                    "path": str(artifact.path),
                    "structure": "VALID" if artifact.valid else "INCOMPLETE",
                }
                for artifact in artifacts
            ],
        },
    }


def render_terminal(result: dict[str, Any]) -> str:
    lines = ["OutageGym behavioural assessment", ""]

    for check in result["automated"]["checks"]:
        lines.append(f"[{check['status']}] {check['name']}")

    lines.extend(
        [
            "",
            f"Automated result: {result['automated']['status']}",
            f"Written rubric: {result['written']['status']}",
        ]
    )

    return "\n".join(lines)


def run_assessment(test_paths: list[str], scenario_root: Path) -> dict[str, Any]:
    config = load_config()
    plugin = AssessmentPlugin()
    captured_output = StringIO()

    with redirect_stdout(captured_output), redirect_stderr(captured_output):
        exit_code = pytest.main(
            ["--quiet", "--tb=no", "--disable-warnings", *test_paths],
            plugins=[plugin],
        )

    return build_result(
        config.incident_id,
        plugin.checks,
        exit_code == pytest.ExitCode.OK,
        scenario_root,
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--format", choices=("terminal", "json"), default="terminal")
    parser.add_argument("--scenario-root", type=Path, default=Path("/workspace/scenarios"))
    parser.add_argument("--tests", nargs="+", default=["tests"])
    arguments = parser.parse_args()
    result = run_assessment(arguments.tests, arguments.scenario_root)

    if arguments.format == "json":
        print(json.dumps(result, indent=2, sort_keys=True))
    else:
        print(render_terminal(result))

    return 0 if result["automated"]["status"] == "PASSED" else 1


if __name__ == "__main__":
    raise SystemExit(main())
