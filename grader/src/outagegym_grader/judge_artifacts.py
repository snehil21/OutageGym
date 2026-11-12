from dataclasses import dataclass
from difflib import unified_diff
from hashlib import sha256
from pathlib import Path

MAX_ARTIFACT_CHARACTERS = 60_000
MIN_ADDED_CHARACTERS = 200


@dataclass(frozen=True)
class ArtifactChanges:
    path: Path
    content: str
    baseline: str
    diff: str
    added_characters: int

    def metadata(self) -> dict:
        return {
            "path": str(self.path),
            "sha256": _hash(self.content),
            "baselineSha256": _hash(self.baseline),
            "characters": len(self.content),
            "addedCharacters": self.added_characters,
        }


def _hash(content: str) -> str:
    return sha256(content.encode()).hexdigest()


def read_artifact(path: Path) -> str:
    if not path.is_file():
        raise ValueError(f"Required written artifact is missing: {path}")

    content = path.read_text().strip()
    if not content:
        raise ValueError(f"Required written artifact is empty: {path}")
    if len(content) > MAX_ARTIFACT_CHARACTERS:
        raise ValueError(
            f"Written artifact exceeds {MAX_ARTIFACT_CHARACTERS} characters: {path}"
        )
    return content


def compare_artifact(path: Path, baseline_path: Path) -> ArtifactChanges:
    content = read_artifact(path)
    baseline = read_artifact(baseline_path)
    changes = list(
        unified_diff(
            baseline.splitlines(),
            content.splitlines(),
            fromfile=f"baseline/{path.name}",
            tofile=f"learner/{path.name}",
            lineterm="",
        )
    )
    additions = [
        line[1:]
        for line in changes
        if line.startswith("+") and not line.startswith("+++")
    ]
    added_characters = sum(len(line.strip()) for line in additions)
    if added_characters < MIN_ADDED_CHARACTERS:
        raise ValueError(
            f"{path.name} needs at least {MIN_ADDED_CHARACTERS} characters of "
            "learner-written content beyond the original template before AI review"
        )

    return ArtifactChanges(
        path=path,
        content=content,
        baseline=baseline,
        diff="\n".join(changes),
        added_characters=added_characters,
    )


def brief_metadata(path: Path, content: str) -> dict:
    return {
        "path": str(path),
        "sha256": _hash(content),
        "characters": len(content),
    }
