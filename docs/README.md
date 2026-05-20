# Docs Index

  For AIGC. Read less. Route first.

  ## Folders

  - `docs/common/`: global architecture and shared conventions
  - `docs/api/`: API / GraphQL adapter rules
  - `docs/worker/`: worker / queue / async-consumer rules
  - `docs/project-convention/`: project-specific conventions
  - Do not read `docs/human/` for implementation guidance

  ## Conflict Or Overlap Resolution

  Before applying multiple rule documents, read `docs/common/rule-precedence.rules.md` first.

  ## Global GraphQL Error Contract

  - Every GraphQL interface must follow `docs/api/graphql-error-contract-current.md`.
  - AI agents must read it before changing GraphQL adapters, guards, exception filters, auth/session flows, or frontend-facing API docs.
  - `errors[].extensions.code === 'UNAUTHENTICATED'` is the stable frontend runtime signal for auth/session failure.
  - Frontend must not depend on `extensions.errorCode` for production runtime branching; it may be hidden or omitted.

  ## Route By Task

  - GraphQL error/auth/session response contract:
    - `docs/api/graphql-error-contract-current.md`
    - `docs/api/adapters.rules.md`

  - Layer boundaries:
    - `docs/common/eslint-architecture-rules.md` when you need the lint rule map or validation command
    - `docs/common/boundary-contract.rules.md`
    - `docs/common/core.rules.md`
    - `docs/common/modules.rules.md`
    - `docs/common/modules.extra.rules.md`
    - `docs/common/usecase.rules.md`
    - `docs/common/usecase-write-flow-boundaries.rules.md`
    - `docs/api/adapters.rules.md`
    - `docs/common/infrastructure.rules.md`

  - QueryService or type placement:
    - `docs/common/queryservice.rules.md`
    - `docs/common/type.rules.md`

  - Boundary contract or port/contract naming:
    - `docs/common/boundary-contract.rules.md`

  - Input normalization:
    - `docs/project-convention/input-field-design.md`
    - `docs/project-convention/input-normalize-v1-boundaries.md`

  - Time fields or time normalization:
    - `docs/project-convention/time-field-design.md`
    - `docs/project-convention/time-normalize-v1-boundaries.md`

  - Database baseline / first-release schema delivery:
    - `docs/project-convention/database-baseline-delivery.rules.md`

  - E2E execution model:
    - `docs/project-convention/e2e-test-groups.md`

  - AI queue identifiers / async audit / trace semantics:
    - `docs/common/queue-identifiers.rules.md`
    - `docs/common/ai-task-lifecycle-audit.rules.md`
    - `docs/project-convention/ai-provider-call-persistence.rules.md`

  - Add a new worker queue:
    - `docs/worker/qm-worker-integration.rules.md`
    - `docs/worker/worker-adapter.rules.md`
    - `docs/worker/worker-usecase.rules.md`

  - Email worker delivery:
    - `docs/worker/email-worker-delivery.rules.md`

  - Skills:
    - `docs/common/skills.rules.md`

  ## One-Line Meanings

  - `core.rules`: pure domain only
  - `eslint-architecture-rules.md`: executable lint rule map and architecture validation commands
  - `boundary-contract.rules`: layer-owned contract naming and port/contract distinction
  - `modules.rules`: reusable same-domain services only
  - `modules.extra.rules`: optional but common modules(service) practices
  - `usecase.rules`: orchestration and transaction ownership
  - `usecase-write-flow-boundaries.rules`: write-flow split and transaction-root boundaries
  - `adapters.rules`: protocol adaptation only
  - `infrastructure.rules`: external/runtime implementation only
  - `queryservice.rules`: read-side access and normalized output
  - `type.rules`: where shared vs local types belong
  - `queue-identifiers.rules`: `jobId` vs `dedupKey` vs `traceId`
  - `ai-task-lifecycle-audit.rules`: async task audit semantics
  - `ai-provider-call-persistence.rules`: provider-call record semantics
  - `database-baseline-delivery.rules`: first-release baseline migration rules
  - `e2e-test-groups.md`: `core` / `worker` / `smoke` test routing
  - `input-field-design.md`: input-normalization design
  - `input-normalize-v1-boundaries.md`: primitive normalize boundaries
  - `time-field-design.md`: `TIMESTAMP(3)` vs `DATE` vs `DATETIME`
  - `time-normalize-v1-boundaries.md`: parse / normalize / format / guard boundaries
  - `qm-worker-integration.rules.md`: new queue integration checklist
  - `worker-adapter.rules.md`: worker adapter boundary
  - `worker-usecase.rules.md`: worker usecase boundary
  - `email-worker-delivery.rules.md`: email delivery runtime boundary
  - `skills.rules.md`: skill authoring and usage
  - `graphql-error-contract-current.md`: global GraphQL error/auth runtime contract for every interface
