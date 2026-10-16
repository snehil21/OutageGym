# Floci Compatibility Matrix

> Status: Complete
> Last updated: 2026-10-16

This matrix records behaviour observed during the `inc-001` feasibility spike. A service appearing in the Floci health response is not sufficient evidence of AWS compatibility; required operations must be tested directly.

## Tested runtime

| Component | Observed version or platform |
|---|---|
| Floci runtime | `2.3.0` |
| Floci compatibility image | `2.3.0-compat` |
| AWS CLI | `2.36.24` |
| AWS CLI bundled Python runtime | `3.14.6` |
| Compatibility-image standalone Python | `3.9.25` |
| boto3 | `1.42.97` |
| botocore | `1.42.97` |
| Node.js | `22.23.3` |
| npm | `10.9.9` |
| AWS SDK for JavaScript v3 clients | `3.1152.0` |
| Terraform | `1.16.6` |
| Terraform AWS provider | `6.69.1` |
| Tool-container architecture | `aarch64` |

## Runtime and safety

| Check | Status | Evidence |
|---|---|---|
| Compose configuration is valid | Pass | `docker compose ... config` completed successfully |
| Floci starts and becomes healthy | Pass | Compose reported the `floci` service as healthy |
| Health API is reachable from the host | Pass | `/_floci/health` returned version `2.3.0` |
| API binds only to localhost | Pass | Published port is `127.0.0.1:4566->4566/tcp` |
| Floci starts without a Docker socket mount | Pass | The Compose definition has no socket mount and the service became healthy |
| Client uses fake credentials | Pass | The tool service uses `outagegym-local` credentials |
| Client disables metadata credential lookup | Pass | `AWS_EC2_METADATA_DISABLED=true` |
| JavaScript SDK check blocks non-local endpoints | Pass | A real-looking SQS endpoint was rejected before client construction with exit code `1` |
| JavaScript SDK check blocks non-local credentials | Pass | Credentials other than the fixed OutageGym values were rejected before client construction with exit code `1` |
| Network-level egress isolation for every tool path | Deferred | Required before learner-facing distribution; the spike still needs registry access to install npm packages and Terraform providers |
| In-memory state resets cleanly | Pass | A queue and table existed before container removal and were absent after recreation |

## Client compatibility

| Client | Status | Evidence |
|---|---|---|
| AWS CLI | Pass | `sqs list-queues` returned a valid response from Floci |
| AWS SDK for JavaScript v3 | Pass | Pinned SQS and DynamoDB clients connected through `http://floci:4566` and returned valid empty-list responses |
| boto3 | Pass with caveat | boto3 connected to SQS and DynamoDB through `http://floci:4566`; the compatibility image's standalone Python runtime is unsupported |
| Terraform AWS provider | Pass | Initialized the pinned signed provider, created the SQS queue and DynamoDB table, produced a no-change second plan, and destroyed both resources cleanly |

## SQS compatibility

| Operation or behaviour | Status | Evidence |
|---|---|---|
| Create a standard queue | Pass | Created `outagegym-spike-orders` |
| Read queue attributes | Pass | Returned visibility timeout `5` and the expected local queue ARN |
| Send a message | Pass | Returned a message ID and body checksum |
| Receive a message | Pass | Returned the original body, message ID, receipt handle, and receive count |
| Visibility-timeout redelivery | Pass | The same message ID was returned after timeout; receive count increased from `1` to `2` and the receipt handle changed |
| Delete a message | Pass | Deletion with the current receipt handle succeeded |
| Deleted message remains absent | Pass | A subsequent receive returned no message |
| Dead-letter queue and redrive | Deferred | Not required by `inc-001` |

## DynamoDB compatibility

| Operation or behaviour | Status | Evidence |
|---|---|---|
| Create a table | Pass | Created active table `outagegym-spike-idempotency` with a string partition key and on-demand billing |
| Write and read an item | Pass | Stored an idempotency claim and retrieved it with a consistent read |
| Conditional write succeeds initially | Pass | `attribute_not_exists(idempotencyKey)` allowed the first claim |
| Repeated conditional write is rejected | Pass | The repeated claim returned `ConditionalCheckFailedException` and AWS CLI exit code `254` |

## Tooling caveat

The Floci `2.3.0-compat` image is suitable for AWS CLI checks, but its standalone `python` executable is Python `3.9.25`. boto3 emitted a deprecation warning because that runtime is outside its supported window. OutageGym must use a separately pinned, supported Python image for future boto3 tests and behavioural assessment tooling.

## Explicitly deferred services

| Service area | Reason |
|---|---|
| Lambda | `inc-001` uses a continuously running worker |
| CloudWatch logs | `inc-001` plans to use Loki |
| CloudWatch metrics and alarms | `inc-001` plans to use Prometheus |

## Go/no-go decision

**Decision: GO with a packaging condition.** Floci `2.3.0` is compatible with the AWS CLI, boto3, AWS SDK for JavaScript v3, Terraform AWS provider, SQS operations, visibility-timeout redelivery, DynamoDB conditional-write behaviour, and clean in-memory reset required by `inc-001`. Terraform completed create, refresh, no-change plan, and destroy operations for both required resource types. The JavaScript check rejects non-local endpoints and credentials before client construction.

The development spike uses explicit local endpoints, fixed fake credentials, disabled metadata discovery, and no host credential mounts. Before learner-facing MVP distribution, runtime dependencies must be packaged so the lab network can block external egress without requiring npm or Terraform registry access during startup.
