FROM python:3.13.16-alpine3.24 AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /workspace/grader

COPY grader/pyproject.toml ./
COPY grader/src ./src

RUN --mount=type=cache,target=/root/.cache/pip \
    python -m pip install ".[test]"

COPY grader/tests ./tests
COPY scenarios /workspace/scenarios

FROM base AS grader

CMD ["python", "-m", "outagegym_grader.report"]

FROM base AS judge

RUN --mount=type=cache,target=/root/.cache/pip \
    python -m pip install ".[judge]"

COPY grader/evals ./evals

CMD ["python", "-m", "outagegym_grader.judge"]
