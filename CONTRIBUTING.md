# Contributing to OutageGym

OutageGym is being built incrementally. Start with a GitHub issue so the scope and expected evidence are clear before implementation begins.

## Workflow

1. Branch from the latest `main`.
2. Keep each change small and focused.
3. Verify the result before marking a task complete.
4. Use clear commit messages such as `feat:`, `fix:`, `docs:`, or `chore:`.
5. Open a draft pull request early and link its issue.

Pull requests should explain what changed, how it was verified, and what remains deferred.

## Safety

- Never use or request real AWS credentials.
- Route AWS-compatible clients only to documented local endpoints.
- Bind published services to `127.0.0.1` by default.
- Do not add privileged containers or Docker socket mounts without an accepted architecture decision.
- Do not commit secrets, generated state, dependency directories, or learner work.

## Incident boundaries

Learner-visible files must describe symptoms and evidence without revealing planted causes or maintainer solutions. Keep spoilers in explicitly maintainer-only locations.

## Before requesting review

- Run the checks relevant to the changed files.
- Run `git diff --check`.
- Confirm the working tree contains no unintended files.
- Include verification evidence in the pull request.

More detailed conventions will be added when application, infrastructure, and test tooling are introduced.
