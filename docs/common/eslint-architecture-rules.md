<!-- docs/common/eslint-architecture-rules.md -->

Purpose: Map architecture rules in docs to the ESLint checks that enforce them.
Read when: You need to verify whether layer, type, boundary contract, or transaction rules are automatically checked.
Do not read when: You only need behavior tests or API contract details.
Source of truth: `eslint.config.mjs` is the executable source of truth; this file is the human index.

# ESLint Architecture Rules

## How To Run

- File-scoped architecture check:
  `npx eslint <path>`
- Full lint:
  `npm run lint`
  This also runs `scripts/check-usecase-normalize-guard.js` first and then ESLint with `--fix`.
- No-fix full ESLint check:
  `npx eslint "{src,apps,libs,test}/**/*.ts" --cache --cache-location .eslintcache`
- Type-level confidence:
  `npm run typecheck`

Prefer `npx eslint <path>` or the no-fix full command while investigating because `npm run lint`
performs an automatic `--fix` pass.

## Rule Map

- `boundaries/dependencies`
  Enforces the main layer dependency matrix:
  adapters -> usecases/core/types, usecases -> modules/core/types,
  modules -> same-domain/common/core/types/infrastructure, infrastructure -> infrastructure/core/types,
  core -> core/types, types -> types.
  Module-owned `*.contract.ts` files are modeled separately so usecases/modules/infrastructure may
  depend on the contract without allowing imports of module services or internals.
  `modules-contracts` must not depend on same-domain services, queries, or internals; contracts
  should only reference other contracts, stable module types, core contracts/types, or `@app-types/*`.
  It also allows adapters to `import type` same-domain module root `*.types.ts` files only.

- `local-architecture/no-boundary-port-naming-drift`
  Blocks new `*.port.ts` / `*.ports.ts` boundary files and imports.
  Also blocks `TransactionPort` / `UnitOfWork` naming drift.
  There is no current file/import allowlist for this rule.

- `local-architecture/no-transaction-manager-alias`
  Blocks local `*TransactionManager` aliases/interfaces in usecases and modules.
  Use `PersistenceTransactionContext` instead of restoring a `TransactionManager` alias.

- `local-architecture/no-usecase-transaction-manager-orm-api`
  Blocks usecases from directly calling ORM APIs on transaction contexts, such as `save`,
  `getRepository`, `createQueryBuilder`, `insert`, `update`, `delete`, and `query`.

- `local-architecture/no-infrastructure-to-modules-imports`
  Blocks infrastructure importing `src/modules/**` implementation files.
  The only modules-layer exception is a module-owned `*.contract.ts` boundary contract.

- `local-architecture/no-cross-domain-modules-imports`
  Blocks business-domain modules importing other business-domain modules.
  Allows business-domain modules importing `src/modules/common/*`.
  Blocks `src/modules/common/*` importing business-domain modules.

- `local-architecture/no-cross-domain-usecases-imports`
  Blocks usecases importing other usecase bounded contexts.
  The shared transaction runner contract is the current allowed common boundary exception.

- `local-architecture/no-types-to-core-imports`
  Blocks `src/types/**` from importing `src/core/**`.
  Types is the stable shared contract layer and must not depend on core implementation semantics.

- `no-restricted-imports`
  Blocks direct `src/types/**`, `@src/types/**`, and `**/src/types/**` imports.
  Shared global types must use `@app-types/*`.
  In `src/core/**`, it also blocks framework/runtime imports such as `@nestjs/*`, `graphql`,
  and `typeorm`.

- `@typescript-eslint/no-explicit-any`
  Blocks `any` in source code covered by the main ESLint config.

- Type-aware strictness rules
  Current config enables `no-floating-promises`, `no-unsafe-argument`, `no-unsafe-assignment`,
  `no-unsafe-call`, `no-unsafe-member-access`, `no-unsafe-return`, and `no-unused-vars`.

- Complexity and size warnings
  Current config warns on function complexity, max depth, and max lines per function.

- `scripts/check-usecase-normalize-guard.js`
  Runs before project lint through `npm run lint`.
  It is not an ESLint rule, but it is part of the repository lint gate.

## Not Yet Enforced By ESLint

These rules are documented review rules in the current project unless and until matching lint rules are added:

- Aggregate child-entity direct writes outside the aggregate root entry.
- ORM Entity purity, including accidental GraphQL / HTTP / Swagger / adapter decorators.
- QueryService depending on mixed read/write services.
- Infrastructure runtime contract naming drift such as BullMQ payload files using layer boundary
  `*.contract.ts` naming.

Do not treat missing lint coverage as permission to violate the docs.

## Supplemental Scans

Run these when preparing P3a inventory or reviewing architecture-sensitive patches.

- Types importing core:
  `rg -n "from ['\"](@src/|src/)?core/|from ['\"]@core/|import\\(['\"](@src/|src/)?core/|require\\(['\"](@src/|src/)?core/" src/types -g '*.ts'`
- Boundary port / transaction alias drift:
  `rg -n "type\\s+\\w*TransactionManager\\s*=|interface\\s+\\w*TransactionManager|TransactionPort|UnitOfWork|\\.ports?\\.ts|from ['\"].*\\.ports?|transaction-runner\\.port" src -g '*.ts'`
- Cross-domain modules imports:
  `rg -n "from ['\"](@src/modules/|@modules/|src/modules/)" src/modules -g '*.ts'`
- ORM Entity adapter decorators:
  `rg -n "@(ObjectType|Field|InputType|ArgsType|InterfaceType)|@ApiProperty|@nestjs/graphql|@nestjs/swagger|class-validator|class-transformer" src/modules src/core src/infrastructure -g '*entity.ts' -g '*.entity.ts'`
- QueryService depending on mixed read/write services:
  `rg -n "from ['\"].*(\\.service|/services/|@modules/|@src/modules/)" src/modules -g '*query.service.ts'`
- Usecase direct ORM calls on transaction-like values are enforced by ESLint; broad text scans for
  `.update()` or `.query()` are noisy and should not be used as the primary signal.

## Notes

- Tests have a relaxed override for some strictness rules; do not infer production architecture exceptions from test-only imports.
- Runtime checks not implemented in ESLint may still be documented in rule files.
- If a document says "ESLint blocks" a rule, keep this index and `eslint.config.mjs` aligned.
