# Floci Compatibility Matrix

> Status: In progress
> Last updated: 2026-10-16

This matrix records behaviour observed during the `inc-001` feasibility spike. A service appearing in the Floci health response is not sufficient evidence of AWS compatibility; required operations must be tested directly.

## Tested runtime

| Component | Observed version or platform |
|---|---|
| Floci runtime | `2.3.0` |
| Floci compatibility image | `2.3.0-compat` |
| AWS CLI | `2.36.24` |
| AWS CLI Python runtime | `3.14.6` |
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
| Requests are blocked from reaching real AWS | Not tested | Explicit local endpoint is configured, but a hard guard has not been implemented or tested |
| In-memory state resets cleanly | Not tested | Reset behaviour has not been exercised yet |

## Client compatibility

| Client | Status | Evidence |
|---|---|---|
| AWS CLI | Pass | `sqs list-queues` returned a valid response from Floci |
| AWS SDK for JavaScript v3 | Not tested | Pending |
| boto3 | Not tested | Pending |
| Terraform AWS provider | Not tested | Pending |

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

## Explicitly deferred services

| Service area | Reason |
|---|---|
| Lambda | `inc-001` uses a continuously running worker |
| CloudWatch logs | `inc-001` plans to use Loki |
| CloudWatch metrics and alarms | `inc-001` plans to use Prometheus |

## Current conclusion

Floci `2.3.0` is provisionally compatible with the SQS operations, visibility-timeout redelivery, and DynamoDB conditional-write behaviour required by `inc-001`. A final go/no-go decision requires application SDK, Terraform, reset, and safety-guard results.
