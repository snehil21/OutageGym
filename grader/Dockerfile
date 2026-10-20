FROM python:3.13.16-alpine3.24

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /workspace/grader

COPY grader/pyproject.toml ./
COPY grader/src ./src

RUN python -m pip install --no-cache-dir ".[test]"

COPY grader/tests ./tests

CMD ["pytest"]
