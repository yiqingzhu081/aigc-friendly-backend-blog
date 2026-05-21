// @ts-check
import eslint from '@eslint/js';
import eslintPluginBoundaries from 'eslint-plugin-boundaries';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import path from 'node:path';
import tseslint from 'typescript-eslint';

const PROJECT_ROOT = import.meta.dirname;
const CORE_ROOT = path.join(PROJECT_ROOT, 'src', 'core');
const INFRASTRUCTURE_ROOT = path.join(PROJECT_ROOT, 'src', 'infrastructure');
const MODULES_ROOT = path.join(PROJECT_ROOT, 'src', 'modules');
const TYPES_ROOT = path.join(PROJECT_ROOT, 'src', 'types');
const USECASES_ROOT = path.join(PROJECT_ROOT, 'src', 'usecases');
const SRC_ROOT = path.join(PROJECT_ROOT, 'src');
const RESTRICTED_SRC_TYPES_IMPORT_PATTERNS = ['src/types/**', '@src/types/**', '**/src/types/**'];
const MODULES_CONTRACTS_ELEMENT_PATTERNS = [
  // Module-scope root contracts, e.g. src/modules/account/account.contract.ts.
  'src/modules/*/*.contract.ts',
  // Nested module-owned contracts, e.g. src/modules/common/email-dispatch/email-dispatch.contract.ts.
  'src/modules/*/**/*.contract.ts',
];
// Keep this in sync with MODULES_CONTRACTS_ELEMENT_PATTERNS.
const MODULE_BOUNDARY_CONTRACT_FILE_PATH_PATTERN = /(^|[/\\])[^/\\]+\.contract(?:\.ts)?$/;
const TRANSACTION_MANAGER_ORM_METHODS = new Set([
  'createQueryBuilder',
  'delete',
  'getRepository',
  'insert',
  'query',
  'save',
  'update',
]);

/**
 * @param {string} targetPath
 * @param {string} rootPath
 * @returns {boolean}
 */
function isPathInside(targetPath, rootPath) {
  const relative = path.relative(rootPath, targetPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/**
 * @param {string} filePath
 * @returns {boolean}
 */
function isBoundaryPortFilePath(filePath) {
  return /\.ports?\.ts$/.test(filePath);
}

/**
 * @param {import('estree').Node} node
 * @returns {string | null}
 */
function getStaticPropertyName(node) {
  if (node.type !== 'MemberExpression') {
    return null;
  }
  if (!node.computed && node.property.type === 'Identifier') {
    return node.property.name;
  }
  if (
    node.computed &&
    node.property.type === 'Literal' &&
    typeof node.property.value === 'string'
  ) {
    return node.property.value;
  }
  return null;
}

/**
 * @param {string} fromFile
 * @param {string} specifier
 * @returns {string | null}
 */
function resolveInternalImport(fromFile, specifier) {
  if (specifier.startsWith('.')) {
    return path.resolve(path.dirname(fromFile), specifier);
  }
  if (specifier.startsWith('@src/')) {
    return path.resolve(PROJECT_ROOT, 'src', specifier.slice('@src/'.length));
  }
  if (specifier.startsWith('@core/')) {
    return path.resolve(PROJECT_ROOT, 'src', 'core', specifier.slice('@core/'.length));
  }
  if (specifier.startsWith('@app-types/')) {
    return path.resolve(PROJECT_ROOT, 'src', 'types', specifier.slice('@app-types/'.length));
  }
  if (specifier.startsWith('@adapters/')) {
    return path.resolve(PROJECT_ROOT, 'src', 'adapters', specifier.slice('@adapters/'.length));
  }
  if (specifier.startsWith('@modules/')) {
    return path.resolve(PROJECT_ROOT, 'src', 'modules', specifier.slice('@modules/'.length));
  }
  if (specifier.startsWith('@usecases/')) {
    return path.resolve(PROJECT_ROOT, 'src', 'usecases', specifier.slice('@usecases/'.length));
  }
  if (specifier.startsWith('src/')) {
    return path.resolve(PROJECT_ROOT, specifier);
  }
  return null;
}

/**
 * @param {string} filePath
 * @returns {string | null}
 */
function getUsecaseScope(filePath) {
  if (!isPathInside(filePath, USECASES_ROOT)) {
    return null;
  }
  const [scope] = path.relative(USECASES_ROOT, filePath).split(path.sep);
  return scope && scope !== '..' ? scope : null;
}

/**
 * @param {string} filePath
 * @returns {boolean}
 */
function isUsecaseBoundaryContract(filePath) {
  if (!isPathInside(filePath, USECASES_ROOT)) {
    return false;
  }
  const relative = path.relative(USECASES_ROOT, filePath);
  return (
    relative.startsWith(`common${path.sep}`) &&
    (relative.endsWith('.contract') || relative.endsWith('.contract.ts'))
  );
}

/**
 * @param {string} filePath
 * @returns {string | null}
 */
function getModuleScope(filePath) {
  if (!isPathInside(filePath, MODULES_ROOT)) {
    return null;
  }
  const [scope] = path.relative(MODULES_ROOT, filePath).split(path.sep);
  return scope && scope !== '..' ? scope : null;
}

/**
 * Must stay aligned with the boundaries plugin modules-contracts element
 * patterns above so local architecture rules and boundaries/dependencies
 * agree on which module files are boundary contracts.
 * @param {string} filePath
 * @returns {boolean}
 */
function isModuleBoundaryContractFilePath(filePath) {
  const resolved = path.resolve(filePath);
  return (
    isPathInside(resolved, MODULES_ROOT) &&
    MODULE_BOUNDARY_CONTRACT_FILE_PATH_PATTERN.test(resolved)
  );
}

/**
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').Node & { source?: { value?: unknown } }} node
 * @param {(specifier: string, targetPath: string) => void} onResolvedImport
 * @returns {void}
 */
function checkStaticImportLikeNode(context, node, onResolvedImport) {
  const specifier = typeof node.source?.value === 'string' ? node.source.value : null;
  if (!specifier) {
    return;
  }
  const fromFile = context.filename;
  const targetPath = resolveInternalImport(fromFile, specifier);
  if (!targetPath) {
    return;
  }
  onResolvedImport(specifier, targetPath);
}

/**
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').CallExpression} node
 * @param {(specifier: string, targetPath: string) => void} onResolvedImport
 * @returns {void}
 */
function checkRequireCallNode(context, node, onResolvedImport) {
  if (node.callee.type !== 'Identifier' || node.callee.name !== 'require') {
    return;
  }
  const firstArg = node.arguments[0];
  if (!firstArg || firstArg.type !== 'Literal' || typeof firstArg.value !== 'string') {
    return;
  }
  const specifier = firstArg.value;
  const fromFile = context.filename;
  const targetPath = resolveInternalImport(fromFile, specifier);
  if (!targetPath) {
    return;
  }
  onResolvedImport(specifier, targetPath);
}

/**
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').ImportExpression} node
 * @param {(specifier: string, targetPath: string) => void} onResolvedImport
 * @returns {void}
 */
function checkImportExpressionNode(context, node, onResolvedImport) {
  if (node.source.type !== 'Literal' || typeof node.source.value !== 'string') {
    return;
  }
  const specifier = node.source.value;
  const fromFile = context.filename;
  const targetPath = resolveInternalImport(fromFile, specifier);
  if (!targetPath) {
    return;
  }
  onResolvedImport(specifier, targetPath);
}

const localArchitecturePlugin = {
  rules: {
    'no-boundary-port-naming-drift': {
      meta: {
        type: /** @type {const} */ ('problem'),
        docs: {
          description:
            'disallow new *.port.ts/*.ports.ts boundary files and parallel transaction contract names',
        },
        schema: [],
      },
      /** @param {import('eslint').Rule.RuleContext} context */
      create(context) {
        /**
         * @param {import('estree').Node} node
         * @param {string} specifier
         * @param {string} targetPath
         * @returns {void}
         */
        function reportPortImportIfNeeded(node, specifier, targetPath) {
          if (specifier.includes('transaction-runner.port')) {
            context.report({
              node,
              message:
                'TransactionRunner 边界契约固定使用 transaction-runner.contract.ts；禁止导入 transaction-runner.port。',
            });
            return;
          }
          if (!/(^|\/)[^/]+\.ports?(?:\.ts)?$/.test(specifier)) {
            return;
          }
          context.report({
            node,
            message:
              '新增 boundary contract 文件使用 *.contract.ts；禁止新增或导入 *.port.ts / *.ports.ts。当前 import: "{{specifier}}"',
            data: { specifier },
          });
        }

        return {
          /** @param {import('estree').Program} node */
          Program(node) {
            if (!isPathInside(context.filename, SRC_ROOT)) {
              return;
            }
            if (!isBoundaryPortFilePath(context.filename)) {
              return;
            }
            context.report({
              node,
              message:
                '新增 boundary contract 文件使用 *.contract.ts；禁止新增 *.port.ts / *.ports.ts。',
            });
          },
          /** @param {import('estree').ImportDeclaration} node */
          ImportDeclaration(node) {
            checkStaticImportLikeNode(context, node, (specifier, targetPath) => {
              reportPortImportIfNeeded(node, specifier, targetPath);
            });
          },
          /** @param {import('estree').ExportAllDeclaration} node */
          ExportAllDeclaration(node) {
            checkStaticImportLikeNode(context, node, (specifier, targetPath) => {
              reportPortImportIfNeeded(node, specifier, targetPath);
            });
          },
          /** @param {import('estree').Node & { source?: { value?: unknown } }} node */
          ExportNamedDeclaration(node) {
            checkStaticImportLikeNode(context, node, (specifier, targetPath) => {
              reportPortImportIfNeeded(node, specifier, targetPath);
            });
          },
          /** @param {import('estree').CallExpression} node */
          CallExpression(node) {
            checkRequireCallNode(context, node, (specifier, targetPath) => {
              reportPortImportIfNeeded(node, specifier, targetPath);
            });
          },
          /** @param {import('estree').ImportExpression} node */
          ImportExpression(node) {
            checkImportExpressionNode(context, node, (specifier, targetPath) => {
              reportPortImportIfNeeded(node, specifier, targetPath);
            });
          },
          /** @param {import('estree').Identifier} node */
          Identifier(node) {
            if (node.name !== 'TransactionPort' && node.name !== 'UnitOfWork') {
              return;
            }
            context.report({
              node,
              message:
                '事务边界固定命名为 TransactionRunner；禁止新增 TransactionPort / UnitOfWork 并行抽象。',
            });
          },
        };
      },
    },
    'no-transaction-manager-alias': {
      meta: {
        type: /** @type {const} */ ('problem'),
        docs: {
          description: 'disallow local *TransactionManager aliases in usecases and modules',
        },
        schema: [],
      },
      /** @param {import('eslint').Rule.RuleContext} context */
      create(context) {
        if (
          !isPathInside(context.filename, MODULES_ROOT) &&
          !isPathInside(context.filename, USECASES_ROOT)
        ) {
          return {};
        }
        return {
          /** @param {import('@typescript-eslint/types').TSESTree.TSTypeAliasDeclaration} node */
          TSTypeAliasDeclaration(node) {
            const aliasName = node.id.name;
            if (typeof aliasName !== 'string' || !aliasName.endsWith('TransactionManager')) {
              return;
            }
            context.report({
              node,
              message:
                '禁止新增本地 *TransactionManager alias；usecase 使用 PersistenceTransactionContext，modules(service) / QueryService 对外接收 transactionContext。',
            });
          },
          /** @param {import('@typescript-eslint/types').TSESTree.TSInterfaceDeclaration} node */
          TSInterfaceDeclaration(node) {
            const interfaceName = node.id.name;
            if (
              typeof interfaceName !== 'string' ||
              !interfaceName.endsWith('TransactionManager')
            ) {
              return;
            }
            context.report({
              node,
              message:
                '禁止新增本地 *TransactionManager interface；usecase 使用 PersistenceTransactionContext，modules(service) / QueryService 对外接收 transactionContext。',
            });
          },
        };
      },
    },
    'no-usecase-transaction-manager-orm-api': {
      meta: {
        type: /** @type {const} */ ('problem'),
        docs: {
          description: 'disallow usecases directly calling ORM APIs on transaction contexts',
        },
        schema: [],
      },
      /** @param {import('eslint').Rule.RuleContext} context */
      create(context) {
        if (!isPathInside(context.filename, USECASES_ROOT)) {
          return {};
        }
        const transactionContextNames = new Set();
        const sourceCode = context.sourceCode;

        /**
         * @param {import('estree').Node} node
         * @returns {boolean}
         */
        function textMentionsTransactionContextType(node) {
          return /\b(?:PersistenceTransactionContext|TransactionManager|EntityManager)\b/.test(
            sourceCode.getText(node),
          );
        }

        /**
         * @param {import('estree').Pattern | import('estree').Node} node
         * @returns {void}
         */
        function rememberTypedIdentifier(node) {
          if (node.type === 'Identifier') {
            const id = /** @type {import('@typescript-eslint/types').TSESTree.Identifier} */ (node);
            if (
              id.typeAnnotation &&
              textMentionsTransactionContextType(
                /** @type {import('estree').Node} */ (/** @type {unknown} */ (id.typeAnnotation)),
              )
            ) {
              transactionContextNames.add(id.name);
              return;
            }
          }
          if (node.type === 'AssignmentPattern') {
            rememberTypedIdentifier(node.left);
          }
        }

        /**
         * @param {import('estree').Node} node
         * @returns {boolean}
         */
        function isTransactionContextLikeExpression(node) {
          if (node.type === 'ChainExpression') {
            return isTransactionContextLikeExpression(node.expression);
          }
          if (node.type === 'Identifier') {
            const lowerName = node.name.toLowerCase();
            return (
              transactionContextNames.has(node.name) ||
              lowerName === 'transactioncontext' ||
              lowerName === 'activetransactioncontext' ||
              lowerName === 'manager' ||
              lowerName === 'txmanager' ||
              lowerName === 'activemanager' ||
              lowerName === 'transactionmanager'
            );
          }
          if (node.type !== 'MemberExpression') {
            return false;
          }
          const propertyName = getStaticPropertyName(node);
          if (!propertyName) {
            return false;
          }
          const lowerPropertyName = propertyName.toLowerCase();
          return (
            lowerPropertyName === 'transactioncontext' ||
            lowerPropertyName === 'activetransactioncontext' ||
            lowerPropertyName === 'manager' ||
            lowerPropertyName === 'txmanager' ||
            lowerPropertyName === 'activemanager' ||
            lowerPropertyName === 'transactionmanager'
          );
        }

        /**
         * @param {import('estree').Function} node
         * @returns {void}
         */
        function rememberFunctionParams(node) {
          for (const param of node.params) {
            rememberTypedIdentifier(param);
          }
        }

        return {
          FunctionDeclaration: rememberFunctionParams,
          FunctionExpression: rememberFunctionParams,
          ArrowFunctionExpression: rememberFunctionParams,
          /** @param {import('estree').VariableDeclarator} node */
          VariableDeclarator(node) {
            if (node.id.type !== 'Identifier') {
              return;
            }
            const id = /** @type {import('@typescript-eslint/types').TSESTree.Identifier} */ (
              node.id
            );
            if (
              id.typeAnnotation &&
              textMentionsTransactionContextType(
                /** @type {import('estree').Node} */ (/** @type {unknown} */ (id.typeAnnotation)),
              )
            ) {
              transactionContextNames.add(id.name);
              return;
            }
            if (node.init && textMentionsTransactionContextType(node.init)) {
              transactionContextNames.add(id.name);
            }
          },
          /** @param {import('estree').CallExpression} node */
          CallExpression(node) {
            if (node.callee.type !== 'MemberExpression') {
              return;
            }
            const methodName = getStaticPropertyName(node.callee);
            if (!methodName || !TRANSACTION_MANAGER_ORM_METHODS.has(methodName)) {
              return;
            }
            if (!isTransactionContextLikeExpression(node.callee.object)) {
              return;
            }
            context.report({
              node: node.callee,
              message:
                'Usecase 只能传递 transaction context，不得直接调用事务上下文的 ORM API "{{methodName}}"；请下沉到 modules service / QueryService / repository 封装。',
              data: { methodName },
            });
          },
        };
      },
    },
    'no-infrastructure-to-modules-imports': {
      meta: {
        type: /** @type {const} */ ('problem'),
        docs: {
          description: 'disallow infrastructure importing modules',
        },
        schema: [],
      },
      /** @param {import('eslint').Rule.RuleContext} context */
      create(context) {
        if (!isPathInside(context.filename, INFRASTRUCTURE_ROOT)) {
          return {};
        }

        /**
         * @param {import('estree').Node & { source?: { value?: unknown } }} node
         * @returns {void}
         */
        function reportIfNeeded(node) {
          checkStaticImportLikeNode(context, node, (specifier, targetPath) => {
            if (
              !isPathInside(targetPath, MODULES_ROOT) ||
              isModuleBoundaryContractFilePath(targetPath)
            ) {
              return;
            }
            context.report({
              node,
              message:
                'Infrastructure 层禁止依赖 modules 实现；仅允许依赖 module-owned boundary contract。当前 import: "{{specifier}}"',
              data: { specifier },
            });
          });
        }

        return {
          ImportDeclaration: reportIfNeeded,
          ExportAllDeclaration: reportIfNeeded,
          ExportNamedDeclaration: reportIfNeeded,
          /** @param {import('estree').CallExpression} node */
          CallExpression(node) {
            checkRequireCallNode(context, node, (specifier, targetPath) => {
              if (
                !isPathInside(targetPath, MODULES_ROOT) ||
                isModuleBoundaryContractFilePath(targetPath)
              ) {
                return;
              }
              context.report({
                node,
                message:
                  'Infrastructure 层禁止依赖 modules 实现；仅允许依赖 module-owned boundary contract。当前 import: "{{specifier}}"',
                data: { specifier },
              });
            });
          },
          /** @param {import('estree').ImportExpression} node */
          ImportExpression(node) {
            checkImportExpressionNode(context, node, (specifier, targetPath) => {
              if (
                !isPathInside(targetPath, MODULES_ROOT) ||
                isModuleBoundaryContractFilePath(targetPath)
              ) {
                return;
              }
              context.report({
                node,
                message:
                  'Infrastructure 层禁止依赖 modules 实现；仅允许依赖 module-owned boundary contract。当前 import: "{{specifier}}"',
                data: { specifier },
              });
            });
          },
        };
      },
    },
    'no-cross-domain-usecases-imports': {
      meta: {
        type: /** @type {const} */ ('problem'),
        docs: {
          description: 'disallow cross-domain imports inside usecases',
        },
        schema: [],
      },
      /** @param {import('eslint').Rule.RuleContext} context */
      create(context) {
        const fromScope = getUsecaseScope(context.filename);
        if (!fromScope) {
          return {};
        }

        /**
         * @param {import('estree').Node & { source?: { value?: unknown } }} node
         * @returns {void}
         */
        function reportIfNeeded(node) {
          checkStaticImportLikeNode(context, node, (specifier, targetPath) => {
            if (!isPathInside(targetPath, USECASES_ROOT)) {
              return;
            }
            if (isUsecaseBoundaryContract(targetPath)) {
              return;
            }
            const toScope = getUsecaseScope(targetPath);
            if (!toScope || toScope === fromScope) {
              return;
            }
            context.report({
              node,
              message:
                'Usecase 层仅允许同域依赖；当前从 "{{fromScope}}" 依赖了 "{{toScope}}"。当前 import: "{{specifier}}"',
              data: {
                fromScope,
                specifier,
                toScope,
              },
            });
          });
        }

        return {
          ImportDeclaration: reportIfNeeded,
          ExportAllDeclaration: reportIfNeeded,
          ExportNamedDeclaration: reportIfNeeded,
          /** @param {import('estree').CallExpression} node */
          CallExpression(node) {
            checkRequireCallNode(context, node, (specifier, targetPath) => {
              if (!isPathInside(targetPath, USECASES_ROOT)) {
                return;
              }
              if (isUsecaseBoundaryContract(targetPath)) {
                return;
              }
              const toScope = getUsecaseScope(targetPath);
              if (!toScope || toScope === fromScope) {
                return;
              }
              context.report({
                node,
                message:
                  'Usecase 层仅允许同域依赖；当前从 "{{fromScope}}" 依赖了 "{{toScope}}"。当前 import: "{{specifier}}"',
                data: {
                  fromScope,
                  specifier,
                  toScope,
                },
              });
            });
          },
          /** @param {import('estree').ImportExpression} node */
          ImportExpression(node) {
            checkImportExpressionNode(context, node, (specifier, targetPath) => {
              if (!isPathInside(targetPath, USECASES_ROOT)) {
                return;
              }
              if (isUsecaseBoundaryContract(targetPath)) {
                return;
              }
              const toScope = getUsecaseScope(targetPath);
              if (!toScope || toScope === fromScope) {
                return;
              }
              context.report({
                node,
                message:
                  'Usecase 层仅允许同域依赖；当前从 "{{fromScope}}" 依赖了 "{{toScope}}"。当前 import: "{{specifier}}"',
                data: {
                  fromScope,
                  specifier,
                  toScope,
                },
              });
            });
          },
        };
      },
    },
    'no-types-to-core-imports': {
      meta: {
        type: /** @type {const} */ ('problem'),
        docs: {
          description: 'disallow types layer importing core layer',
        },
        schema: [],
      },
      /** @param {import('eslint').Rule.RuleContext} context */
      create(context) {
        if (!isPathInside(context.filename, TYPES_ROOT)) {
          return {};
        }

        /**
         * @param {import('estree').Node & { source?: { value?: unknown } }} node
         * @returns {void}
         */
        function reportIfNeeded(node) {
          checkStaticImportLikeNode(context, node, (specifier, targetPath) => {
            if (!isPathInside(targetPath, CORE_ROOT)) {
              return;
            }
            context.report({
              node,
              message:
                'Types 层禁止依赖 core；types 是最底层共享契约，不应包含领域实现语义。当前 import: "{{specifier}}"',
              data: { specifier },
            });
          });
        }

        return {
          ImportDeclaration: reportIfNeeded,
          ExportAllDeclaration: reportIfNeeded,
          ExportNamedDeclaration: reportIfNeeded,
          /** @param {import('estree').CallExpression} node */
          CallExpression(node) {
            checkRequireCallNode(context, node, (specifier, targetPath) => {
              if (!isPathInside(targetPath, CORE_ROOT)) {
                return;
              }
              context.report({
                node,
                message:
                  'Types 层禁止依赖 core；types 是最底层共享契约，不应包含领域实现语义。当前 import: "{{specifier}}"',
                data: { specifier },
              });
            });
          },
          /** @param {import('estree').ImportExpression} node */
          ImportExpression(node) {
            checkImportExpressionNode(context, node, (specifier, targetPath) => {
              if (!isPathInside(targetPath, CORE_ROOT)) {
                return;
              }
              context.report({
                node,
                message:
                  'Types 层禁止依赖 core；types 是最底层共享契约，不应包含领域实现语义。当前 import: "{{specifier}}"',
                data: { specifier },
              });
            });
          },
        };
      },
    },
    'no-cross-domain-modules-imports': {
      meta: {
        type: /** @type {const} */ ('problem'),
        docs: {
          description:
            'enforce three-tier module dependency matrix: business→common allowed, common→business forbidden, business→business forbidden',
        },
        schema: [],
      },
      /** @param {import('eslint').Rule.RuleContext} context */
      create(context) {
        const fromScope = getModuleScope(context.filename);
        if (!fromScope) {
          return {};
        }

        /**
         * @param {import('estree').Node} node
         * @param {string} specifier
         * @param {string} targetPath
         */
        function checkCrossDomain(node, specifier, targetPath) {
          if (!isPathInside(targetPath, MODULES_ROOT)) return;
          const toScope = getModuleScope(targetPath);
          if (!toScope || toScope === fromScope) return;
          if (fromScope !== 'common' && toScope === 'common') return;
          if (fromScope === 'common') {
            context.report({
              node,
              message:
                'modules/common 是受限共享层，禁止反向依赖业务域模块 "{{toScope}}"。契约应下沉到 core，绑定留在业务模块。当前 import: "{{specifier}}"',
              data: { fromScope, specifier, toScope },
            });
            return;
          }
          context.report({
            node,
            message:
              '业务域 modules 禁止跨域依赖；当前从 "{{fromScope}}" 依赖了 "{{toScope}}"。如需跨域读取请走 QueryService 契约上提或经 usecase 编排。当前 import: "{{specifier}}"',
            data: { fromScope, specifier, toScope },
          });
        }

        /** @param {import('estree').Node & { source?: { value?: unknown } }} node */
        function reportIfNeeded(node) {
          checkStaticImportLikeNode(context, node, (specifier, targetPath) => {
            checkCrossDomain(node, specifier, targetPath);
          });
        }

        return {
          ImportDeclaration: reportIfNeeded,
          ExportAllDeclaration: reportIfNeeded,
          ExportNamedDeclaration: reportIfNeeded,
          /** @param {import('estree').CallExpression} node */
          CallExpression(node) {
            checkRequireCallNode(context, node, (specifier, targetPath) => {
              checkCrossDomain(node, specifier, targetPath);
            });
          },
          /** @param {import('estree').ImportExpression} node */
          ImportExpression(node) {
            checkImportExpressionNode(context, node, (specifier, targetPath) => {
              checkCrossDomain(node, specifier, targetPath);
            });
          },
        };
      },
    },
  },
};

export default defineConfig(
  {
    ignores: ['eslint.config.mjs', 'dist/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      boundaries: /** @type {import('eslint').ESLint.Plugin} */ (
        /** @type {unknown} */ (eslintPluginBoundaries)
      ),
      'local-architecture': localArchitecturePlugin,
    },
    settings: {
      'boundaries/dependency-nodes': ['import'],
      'boundaries/elements': [
        { type: 'adapters-common', pattern: 'src/adapters/api/graphql/decorators', mode: 'folder' },
        { type: 'adapters-common', pattern: 'src/adapters/api/graphql/guards', mode: 'folder' },
        { type: 'adapters-common', pattern: 'src/adapters/api/graphql/common', mode: 'folder' },
        { type: 'adapters-common', pattern: 'src/adapters/api/graphql/schema', mode: 'folder' },
        { type: 'adapters-common', pattern: 'src/adapters/api/graphql/*.ts', mode: 'file' },
        {
          type: 'api-adapters-scope',
          pattern: 'src/adapters/api/graphql/*',
          mode: 'folder',
          capture: ['adapterScope'],
        },
        {
          type: 'worker-adapters-scope',
          pattern: 'src/adapters/worker/*',
          mode: 'folder',
          capture: ['adapterScope'],
        },
        {
          type: 'adapters-integration',
          pattern: 'src/adapters/api/integration-events',
          mode: 'folder',
        },
        {
          type: 'usecases',
          pattern: 'src/usecases/*/*.ts',
          mode: 'file',
          capture: ['usecaseScope'],
        },
        {
          type: 'usecases',
          pattern: 'src/usecases/*/**/*.ts',
          mode: 'file',
          capture: ['usecaseScope'],
        },
        {
          type: 'modules-contracts',
          pattern: MODULES_CONTRACTS_ELEMENT_PATTERNS[0],
          mode: 'file',
          capture: ['moduleScope'],
        },
        {
          type: 'modules-contracts',
          pattern: MODULES_CONTRACTS_ELEMENT_PATTERNS[1],
          mode: 'file',
          capture: ['moduleScope'],
        },
        {
          type: 'modules-types',
          pattern: 'src/modules/*/*.types.ts',
          mode: 'file',
          capture: ['moduleScope'],
        },
        {
          type: 'modules-types',
          pattern: 'src/modules/*/**/*.types.ts',
          mode: 'file',
          capture: ['moduleScope'],
        },
        {
          type: 'modules-queries',
          pattern: 'src/modules/*/**/queries',
          mode: 'folder',
          capture: ['moduleScope'],
        },
        {
          type: 'modules-queries',
          pattern: 'src/modules/*/**/*.query.service.ts',
          mode: 'file',
          capture: ['moduleScope'],
        },
        {
          type: 'modules-services',
          pattern: 'src/modules/*/**/services',
          mode: 'folder',
          capture: ['moduleScope'],
        },
        {
          type: 'modules-services',
          pattern: 'src/modules/*/**/service',
          mode: 'folder',
          capture: ['moduleScope'],
        },
        {
          type: 'modules-internal',
          pattern: 'src/modules/*',
          mode: 'folder',
          capture: ['moduleScope'],
        },
        {
          type: 'modules-internal',
          pattern: 'src/modules/*/*.ts',
          mode: 'file',
          capture: ['moduleScope'],
        },
        {
          type: 'modules-internal',
          pattern: 'src/modules/*/**/*.ts',
          mode: 'file',
          capture: ['moduleScope'],
        },
        { type: 'infrastructure', pattern: 'src/infrastructure/**' },
        { type: 'core', pattern: 'src/core/**' },
        { type: 'types', pattern: 'src/types/**' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          rules: [
            {
              from: { type: 'api-adapters-scope' },
              allow: [
                { to: { type: 'adapters-common' } },
                {
                  to: {
                    type: 'api-adapters-scope',
                    captured: { adapterScope: '{{from.adapterScope}}' },
                  },
                },
                { to: { type: 'usecases' } },
                { to: { type: 'core' } },
                { to: { type: 'types' } },
                {
                  to: {
                    type: 'modules-types',
                    captured: { moduleScope: '{{from.adapterScope}}' },
                  },
                  dependency: { kind: 'type' },
                },
              ],
            },
            {
              from: { type: 'worker-adapters-scope' },
              allow: [
                {
                  to: {
                    type: 'worker-adapters-scope',
                    captured: { adapterScope: '{{from.adapterScope}}' },
                  },
                },
                { to: { type: 'usecases' } },
                { to: { type: 'core' } },
                { to: { type: 'types' } },
              ],
            },
            {
              from: { type: 'adapters-common' },
              allow: [
                { to: { type: 'adapters-common' } },
                { to: { type: 'core' } },
                { to: { type: 'types' } },
              ],
            },
            {
              from: { type: 'adapters-integration' },
              allow: [
                { to: { type: 'usecases' } },
                { to: { type: 'core' } },
                { to: { type: 'types' } },
              ],
            },
            {
              from: { type: 'usecases' },
              allow: [
                {
                  to: {
                    type: 'usecases',
                    captured: { usecaseScope: '{{from.usecaseScope}}' },
                  },
                },
                { to: { type: 'modules-contracts' } },
                { to: { type: 'modules-types' } },
                { to: { type: 'modules-queries' } },
                { to: { type: 'modules-services' } },
                { to: { type: 'core' } },
                { to: { type: 'types' } },
              ],
            },
            {
              from: { type: 'modules-contracts' },
              allow: [
                {
                  to: {
                    type: 'modules-contracts',
                    captured: { moduleScope: '{{from.moduleScope}}' },
                  },
                },
                {
                  to: {
                    type: 'modules-types',
                    captured: { moduleScope: '{{from.moduleScope}}' },
                  },
                },
                { to: { type: 'modules-types', captured: { moduleScope: 'common' } } },
                { to: { type: 'core' } },
                { to: { type: 'types' } },
              ],
            },
            {
              from: { type: 'modules-types' },
              allow: [
                {
                  to: {
                    type: 'modules-types',
                    captured: { moduleScope: '{{from.moduleScope}}' },
                  },
                },
                { to: { type: 'modules-types', captured: { moduleScope: 'common' } } },
                { to: { type: 'core' } },
                { to: { type: 'types' } },
              ],
            },
            {
              from: { type: 'modules-queries' },
              allow: [
                {
                  to: {
                    type: 'modules-queries',
                    captured: { moduleScope: '{{from.moduleScope}}' },
                  },
                },
                {
                  to: {
                    type: 'modules-types',
                    captured: { moduleScope: '{{from.moduleScope}}' },
                  },
                },
                {
                  to: {
                    type: 'modules-contracts',
                    captured: { moduleScope: '{{from.moduleScope}}' },
                  },
                },
                {
                  to: {
                    type: 'modules-internal',
                    captured: { moduleScope: '{{from.moduleScope}}' },
                  },
                },
                { to: { type: 'modules-services', captured: { moduleScope: 'common' } } },
                { to: { type: 'modules-queries', captured: { moduleScope: 'common' } } },
                { to: { type: 'modules-contracts', captured: { moduleScope: 'common' } } },
                { to: { type: 'modules-types', captured: { moduleScope: 'common' } } },
                { to: { type: 'modules-internal', captured: { moduleScope: 'common' } } },
                { to: { type: 'infrastructure' } },
                { to: { type: 'core' } },
                { to: { type: 'types' } },
              ],
            },
            {
              from: { type: 'modules-services' },
              allow: [
                {
                  to: {
                    type: 'modules-services',
                    captured: { moduleScope: '{{from.moduleScope}}' },
                  },
                },
                {
                  to: {
                    type: 'modules-types',
                    captured: { moduleScope: '{{from.moduleScope}}' },
                  },
                },
                {
                  to: {
                    type: 'modules-contracts',
                    captured: { moduleScope: '{{from.moduleScope}}' },
                  },
                },
                {
                  to: {
                    type: 'modules-internal',
                    captured: { moduleScope: '{{from.moduleScope}}' },
                  },
                },
                { to: { type: 'modules-services', captured: { moduleScope: 'common' } } },
                { to: { type: 'modules-queries', captured: { moduleScope: 'common' } } },
                { to: { type: 'modules-contracts', captured: { moduleScope: 'common' } } },
                { to: { type: 'modules-types', captured: { moduleScope: 'common' } } },
                { to: { type: 'modules-internal', captured: { moduleScope: 'common' } } },
                { to: { type: 'infrastructure' } },
                { to: { type: 'core' } },
                { to: { type: 'types' } },
              ],
            },
            {
              from: { type: 'modules-internal' },
              allow: [
                {
                  to: {
                    type: 'modules-internal',
                    captured: { moduleScope: '{{from.moduleScope}}' },
                  },
                },
                {
                  to: {
                    type: 'modules-services',
                    captured: { moduleScope: '{{from.moduleScope}}' },
                  },
                },
                {
                  to: {
                    type: 'modules-queries',
                    captured: { moduleScope: '{{from.moduleScope}}' },
                  },
                },
                {
                  to: {
                    type: 'modules-types',
                    captured: { moduleScope: '{{from.moduleScope}}' },
                  },
                },
                {
                  to: {
                    type: 'modules-contracts',
                    captured: { moduleScope: '{{from.moduleScope}}' },
                  },
                },
                { to: { type: 'modules-services', captured: { moduleScope: 'common' } } },
                { to: { type: 'modules-queries', captured: { moduleScope: 'common' } } },
                { to: { type: 'modules-contracts', captured: { moduleScope: 'common' } } },
                { to: { type: 'modules-types', captured: { moduleScope: 'common' } } },
                { to: { type: 'modules-internal', captured: { moduleScope: 'common' } } },
                { to: { type: 'infrastructure' } },
                { to: { type: 'core' } },
                { to: { type: 'types' } },
              ],
            },
            {
              from: { type: 'infrastructure' },
              allow: [
                { to: { type: 'infrastructure' } },
                { to: { type: 'modules-contracts' } },
                { to: { type: 'core' } },
                { to: { type: 'types' } },
              ],
            },
            {
              from: { type: 'core' },
              allow: [{ to: { type: 'core' } }, { to: { type: 'types' } }],
            },
            {
              from: { type: 'types' },
              allow: [{ to: { type: 'types' } }],
            },
          ],
        },
      ],
      'local-architecture/no-infrastructure-to-modules-imports': 'error',
      'local-architecture/no-cross-domain-usecases-imports': 'error',
      'local-architecture/no-types-to-core-imports': 'error',
      'local-architecture/no-cross-domain-modules-imports': 'error',
      'local-architecture/no-boundary-port-naming-drift': 'error',
      'local-architecture/no-transaction-manager-alias': 'error',
      'local-architecture/no-usecase-transaction-manager-orm-api': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-unused-expressions': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: RESTRICTED_SRC_TYPES_IMPORT_PATTERNS,
        },
      ],
      'prefer-const': 'error',
      'no-var': 'error',
      complexity: ['warn', 15],
      'max-depth': ['warn', 4],
      'max-lines-per-function': ['warn', 100],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variableLike',
          format: ['camelCase', 'UPPER_CASE'],
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'property',
          format: ['camelCase', 'snake_case', 'UPPER_CASE'],
        },
        {
          selector: 'parameter',
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
        },
      ],
    },
  },
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@nestjs/*',
            'graphql',
            'typeorm',
            ...RESTRICTED_SRC_TYPES_IMPORT_PATTERNS,
          ],
        },
      ],
    },
  },
  {
    files: ['src/usecases/**/*.ts'],
    rules: {
      'max-lines-per-function': ['warn', 200],
    },
  },
  {
    files: ['test/**/*.ts', '**/*.spec.ts', '**/*.test.ts', 'e2e/**/*.ts'],
    rules: {
      complexity: 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      'max-lines-per-function': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'local-architecture/no-cross-domain-modules-imports': 'off',
      'no-console': 'off',
    },
  },
);
