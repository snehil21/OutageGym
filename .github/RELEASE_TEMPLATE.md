This release contains the complete local OutageGym runtime and `inc-001`.

## Start

```bash
make doctor
make start INCIDENT=inc-001
```

## Verification

- Full CI passed from a fresh GitHub-hosted runner.
- Application images were built for AMD64 and ARM64.
- Immutable image references are listed below.
