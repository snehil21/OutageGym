from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

RUBRIC_VERSION = "1"
PASSING_SCORE = 70


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Dimension(StrictModel):
    score: int
    feedback: str = Field(
        min_length=1,
        max_length=500,
        description="One or two concise sentences explaining the score.",
    )
    evidence: list[Annotated[str, Field(max_length=200)]] = Field(
        max_length=3,
        description="Up to three short quotes from learner-added lines only.",
    )


class TriageAndImpact(Dimension):
    score: Annotated[int, Field(ge=0, le=20)]


class DiagnosisAndEvidence(Dimension):
    score: Annotated[int, Field(ge=0, le=25)]


class Mitigation(Dimension):
    score: Annotated[int, Field(ge=0, le=20)]


class RepairAndVerification(Dimension):
    score: Annotated[int, Field(ge=0, le=20)]


class Postmortem(Dimension):
    score: Annotated[int, Field(ge=0, le=15)]


class JudgeDimensions(StrictModel):
    triageAndImpact: TriageAndImpact
    diagnosisAndEvidence: DiagnosisAndEvidence
    mitigation: Mitigation
    repairAndVerification: RepairAndVerification
    postmortem: Postmortem


class JudgeOutput(StrictModel):
    dimensions: JudgeDimensions
    strengths: list[Annotated[str, Field(max_length=300)]] = Field(max_length=5)
    gaps: list[Annotated[str, Field(max_length=300)]] = Field(max_length=5)
    summary: str = Field(min_length=1, max_length=500)


RUBRIC_DIMENSIONS = {
    "triageAndImpact": {
        "label": "Triage and customer impact",
        "maximum": 20,
        "criteria": (
            "Quantifies customer impact, identifies affected and unaffected paths, "
            "and establishes a defensible incident timeline."
        ),
    },
    "diagnosisAndEvidence": {
        "label": "Diagnosis supported by evidence",
        "maximum": 25,
        "criteria": (
            "Tests multiple hypotheses and supports the root cause with specific, "
            "correlated operational evidence."
        ),
    },
    "mitigation": {
        "label": "Immediate mitigation",
        "maximum": 20,
        "criteria": (
            "Describes a reversible action that reduces impact, its risks, rollback "
            "plan, and before-and-after evidence."
        ),
    },
    "repairAndVerification": {
        "label": "Permanent repair and verification",
        "maximum": 20,
        "criteria": (
            "Explains why the repair addresses the cause, protects invariants, "
            "covers negative cases, and survives workload and restart verification."
        ),
    },
    "postmortem": {
        "label": "Postmortem quality",
        "maximum": 15,
        "criteria": (
            "Provides a blameless causal explanation, evidence-based timeline, "
            "observability gaps, and concrete prevention actions."
        ),
    },
}


def finalize_judge_output(output: JudgeOutput) -> dict:
    raw_dimensions = output.dimensions.model_dump()
    dimensions = {}
    total_score = 0

    for name, rubric in RUBRIC_DIMENSIONS.items():
        dimension = raw_dimensions[name]
        dimensions[name] = {
            "label": rubric["label"],
            "maximum": rubric["maximum"],
            **dimension,
        }
        total_score += dimension["score"]

    return {
        "verdict": "PASSED" if total_score >= PASSING_SCORE else "NEEDS_REVISION",
        "totalScore": total_score,
        "maximumScore": 100,
        "dimensions": dimensions,
        "strengths": output.strengths,
        "gaps": output.gaps,
        "summary": output.summary,
    }
