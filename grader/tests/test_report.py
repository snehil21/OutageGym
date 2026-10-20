import json
from pathlib import Path

from outagegym_grader.report import build_result, render_terminal


def test_report_supports_terminal_and_json_output(tmp_path: Path) -> None:
    scenario = tmp_path / "inc-001"
    scenario.mkdir()
    (scenario / "evidence.md").write_text("# Evidence\n")
    (scenario / "postmortem-template.md").write_text("# Postmortem\n")
    result = build_result(
        "inc-001",
        {
            "Order completion": True,
            "Processing integrity": False,
        },
        automated_passed=False,
        scenario_root=tmp_path,
    )

    terminal = render_terminal(result)
    machine_readable = json.loads(json.dumps(result))

    assert "[PASSED] Order completion" in terminal
    assert "[FAILED] Processing integrity" in terminal
    assert "Automated result: FAILED" in terminal
    assert "Written rubric: NOT REVIEWED" in terminal
    assert machine_readable["schemaVersion"] == 1
    assert machine_readable["incidentId"] == "inc-001"
    assert machine_readable["written"]["status"] == "NOT REVIEWED"
