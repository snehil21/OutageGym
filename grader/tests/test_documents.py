from pathlib import Path

from outagegym_grader.config import load_config
from outagegym_grader.documents import (
    EVIDENCE_REQUIRED_SECTIONS,
    WRITTEN_REVIEW_STATUS,
    validate_document,
    validate_written_artifacts,
)


def test_incident_written_artifacts_have_required_structure() -> None:
    config = load_config()
    results = validate_written_artifacts(
        Path("/workspace/scenarios"),
        config.incident_id,
    )

    assert all(result.valid for result in results)
    assert {result.name for result in results} == {"evidence", "postmortem"}
    assert WRITTEN_REVIEW_STATUS == "NOT REVIEWED"


def test_document_validation_reports_missing_sections(tmp_path: Path) -> None:
    incomplete = tmp_path / "evidence.md"
    incomplete.write_text("# Evidence\n\n## Detection\n")

    result = validate_document(
        "evidence",
        incomplete,
        EVIDENCE_REQUIRED_SECTIONS,
    )

    assert not result.valid
    assert result.exists
    assert "Detection" not in result.missing_sections
    assert "Diagnosis" in result.missing_sections
