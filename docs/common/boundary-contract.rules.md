<!-- docs/common/boundary-contract.rules.md -->

Purpose: Define boundary contract ownership and naming guardrails.
Read when: You are adding, moving, or reviewing an interface/token used to invert an external or runtime capability.
Do not read when: You are only changing DTO/View/data shape types; use docs/common/type.rules.md instead.
Source of truth: This file defines boundary contract naming and shared vocabulary; layer-specific rule files define ownership details.

# Boundary Contract 规则

## 术语

- Boundary contract 是某一层拥有的依赖边界模式，不是独立分层。
- Port 是架构讨论中的同类概念词，不是本仓库新增文件命名约定。
- 新增边界文件默认使用 `*.contract.ts`。
- 不新增 `*.port.ts` / `*.ports.ts` 文件，也不建立全局 boundary contract 层或 `ports` 层。

## 归属

- Core-owned boundary contract：只表达纯领域能力，必须框架无关。
- Usecase-owned boundary contract：表达 usecase 编排所需运行时能力。
- Module-owned boundary contract：只在模块需要隔离可替换 infrastructure 实现时使用。
- Infrastructure 只实现或适配 boundary contract，不拥有业务决策。

归属跟随“谁拥有需要该能力的决策”，而不是跟随实现所在位置。

## 命名与位置

- 文件后缀使用 `*.contract.ts`。
- 文件名以能力命名，避免技术实现细节。
- 同域数据形态、View、snapshot、enum 等不属于 boundary contract。
  它们按 `docs/common/type.rules.md` 放入 `*.types.ts` 或 `src/types`。
- 不要为了集中接口而新增全局 `ports` 目录。

## 当前 Legacy 兼容口径

当前项目仍存在历史 `*.ports.ts` 文件和 TypeORM `EntityManager` transaction alias。
它们只允许必要维护，不作为新增代码模板。

已知 legacy 示例：

- `src/core/pagination/pagination.ports.ts`
- `src/core/search/search.ports.ts`
- `src/core/sort/sort.ports.ts`
- `*TransactionManager = EntityManager` 类型 alias

新增或重构 touched code 时：

- 不新增新的 `*.port.ts` / `*.ports.ts` 文件。
- 不新增 `TransactionPort` / `UnitOfWork` 并行抽象名。
- 不新增新的 `*TransactionManager` alias。
- 若必须维护 legacy alias，保持最小改动，并在后续事务边界重构中迁移。

## Lint Guard

当前 ESLint 只覆盖一部分架构边界，详见 `docs/common/eslint-architecture-rules.md`。
本文件中未被 ESLint 覆盖的规则仍是 review 规则。
