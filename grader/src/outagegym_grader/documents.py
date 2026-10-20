from dataclasses import dataclass
from pathlib import Path
import re


WRITTEN_REVIEW_STATUS = "NOT REVIEWED"

EVIDENCE_REQUIRED_SECTIONS = (
    "Detection",
    "Triage",
    "Initial hypotheses",
    "Diagnosis",
    "Mitigation",
    "Permanent repair",
    "Verification",
)

POSTMORTEM_REQUIRED_SECTIONS = (
    "Summary",
    "Customer impact",
    "Detection",
    "Timeline",
    "Root cause",
    "Contributing causes",
    "Mitigation",
    "Permanent repair",
    "Recovery verification",
    "What went well",
    "What made the incident harder",
    "Detection and observability gaps",
    "Prevention actions",
)


@dataclass(frozen=True)
class DocumentResult:
    name: str
    path: Path
    exists: bool
    missing_sections: tuple[str, ...]

    @property
    def valid(self) -> bool:
        return self.exists and not self.missing_sections


def validate_document(
    name: str,
    path: Path,
    required_sections: tuple[str, ...],
) -> DocumentResult:
    if not path.is_file():
        return DocumentResult(
            name=name,
            path=path,
            exists=False,
            missing_sections=required_sections,
        )

    headings = set(
        re.findall(r"^##\s+(.+?)\s*$", path.read_text(), flags=re.MULTILINE)
    )

    return DocumentResult(
        name=name,
        path=path,
        exists=True,
        missing_sections=tuple(
            section for section in required_sections if section not in headings
        ),
    )


def validate_written_artifacts(
    scenario_root: Path,
    incident_id: str,
) -> tuple[DocumentResult, DocumentResult]:
    scenario_directory = scenario_root / incident_id

    return (
        validate_document(
            "evidence",
            scenario_directory / "evidence.md",
            EVIDENCE_REQUIRED_SECTIONS,
        ),
        validate_document(
            "postmortem",
            scenario_directory / "postmortem-template.md",
            POSTMORTEM_REQUIRED_SECTIONS,
        ),
    )
