# OutageGym

**Production incidents you can diagnose and fix locally.**

> OutageGym is in early development and is not ready for learners yet.

OutageGym is a local incident-response practice platform for backend engineers. It presents production-like symptoms and operational evidence without revealing the diagnosis.

## Planned workflow

The target learner workflow is:

```bash
make doctor
make start INCIDENT=inc-001
make grade INCIDENT=inc-001
make reset INCIDENT=inc-001
```

These commands are not implemented yet.

## MVP

The first incident, `inc-001`, uses this application path:

```text
Client -> Order API -> SQS order queue -> Order worker -> DynamoDB
```

The local runtime will use Docker Compose, Floci, Terraform, TypeScript services, and open-source observability tools. It will not require an AWS account or real AWS credentials.

## Planned prerequisites

- macOS or Linux.
- Git.
- Docker with Docker Compose.
- Make and `curl`.
- 4 CPU cores, 8 GB system memory, and 6 GB free disk space.

## Project status

Phase 2—repository and runtime foundation—is in progress. See the [roadmap](ROADMAP.md) for verified progress.

## Documentation

- [Product specification](docs/PRODUCT.md)
- [MVP architecture decision](docs/architecture/adr-001-mvp-scope.md)
- [Floci compatibility results](spikes/floci-compatibility/COMPATIBILITY.md)

## License

OutageGym is licensed under the [Apache License 2.0](LICENSE).
