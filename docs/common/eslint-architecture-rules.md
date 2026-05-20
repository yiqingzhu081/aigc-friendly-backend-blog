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

## Current Rule Map

- `boundaries/dependencies`
  Enforces the main layer dependency matrix currently modeled in `eslint.config.mjs`:
  adapters -> usecases/core/types, usecases -> modules queries/services/core/types,
  modules services -> infrastructure/core/types, modules queries -> same-domain queries/core/types,
  infrastructure -> infrastructure/core/types, core -> core/types, types -> types.

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

- Boundary contract naming drift for new `*.port.ts` / `*.ports.ts` files.
- New `TransactionPort` / `UnitOfWork` naming drift.
- New `*TransactionManager` aliases.
- Direct usecase transaction-context ORM API calls.
- Cross-domain usecase imports beyond the current coarse `boundaries/dependencies` model.
- Module-owned `*.contract.ts` exceptions and detailed contract dependency modeling.

Do not treat missing lint coverage as permission to violate the docs.

## Notes

- Tests have a relaxed override for some strictness rules; do not infer production architecture exceptions from test-only imports.
- Runtime checks not implemented in ESLint may still be documented in rule files.
- If a document says "ESLint blocks" a rule, keep this index and `eslint.config.mjs` aligned.
