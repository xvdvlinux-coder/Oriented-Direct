/**
 * MathL Prototype Safety Analyzer & Abstract Interpreter
 * Evaluates Oriented-Direct AST nodes and verifies safety invariants at compile-time.
 */

import { NullState, NullLattice, TypeShape, AbstractEnvironment } from './abstract_domain.js';
import { ASTNodeType } from '../../src/parser/ast.js';

export class SafetyAnalyzerPrototype {
  constructor(options = {}) {
    this.jsDictionary = options.jsDictionary || { interfaces: {} };
    this.webDictionary = options.webDictionary || { interfaces: {} };
    this.diagnostics = []; // { line, col, message, severity }
  }

  report(node, message, severity = 'error') {
    this.diagnostics.push({
      line: node?.line || 1,
      col: node?.column || 1,
      message,
      severity
    });
  }

  analyze(ast) {
    const rootEnv = new AbstractEnvironment();
    this.setupGlobals(rootEnv);
    this.analyzeNode(ast, rootEnv);
    return {
      isValid: this.diagnostics.length === 0,
      diagnostics: this.diagnostics
    };
  }

  setupGlobals(env) {
    env.define('console', new TypeShape('Object', { nullState: NullState.NON_NULL }));
    env.define('Math', new TypeShape('Object', { nullState: NullState.NON_NULL }));
    env.define('JSON', new TypeShape('Object', { nullState: NullState.NON_NULL }));
    env.define('Date', new TypeShape('Function', { nullState: NullState.NON_NULL }));
    env.define('document', new TypeShape('Object', { nullState: NullState.NON_NULL }));
    env.define('window', new TypeShape('Object', { nullState: NullState.NON_NULL }));
    env.define('Array', new TypeShape('Function', { nullState: NullState.NON_NULL }));
    env.define('Object', new TypeShape('Function', { nullState: NullState.NON_NULL }));
    env.define('String', new TypeShape('Function', { nullState: NullState.NON_NULL }));
    env.define('Number', new TypeShape('Function', { nullState: NullState.NON_NULL }));
    env.define('Boolean', new TypeShape('Function', { nullState: NullState.NON_NULL }));
    env.define('Set', new TypeShape('Function', { nullState: NullState.NON_NULL }));
    env.define('Map', new TypeShape('Function', { nullState: NullState.NON_NULL }));
    env.define('Promise', new TypeShape('Function', { nullState: NullState.NON_NULL }));
    env.define('parseFloat', new TypeShape('Function', { arity: 1 }));
    env.define('parseInt', new TypeShape('Function', { arity: 2 }));
    env.define('queueMicrotask', new TypeShape('Function', { arity: 1 }));
    env.define('setTimeout', new TypeShape('Function', { arity: 2 }));
    env.define('clearTimeout', new TypeShape('Function', { arity: 1 }));
    env.define('setInterval', new TypeShape('Function', { arity: 2 }));
    env.define('clearInterval', new TypeShape('Function', { arity: 1 }));
  }

  analyzeNode(node, env) {
    if (!node) return new TypeShape('Undefined');

    switch (node.type) {
      case ASTNodeType.PROGRAM:
      case ASTNodeType.BLOCK_STATEMENT: {
        for (const stmt of node.body || []) {
          if (stmt.type === ASTNodeType.FUNCTION_DECLARATION) {
            const fnName = typeof stmt.id === 'string' ? stmt.id : (stmt.id?.name || stmt.name);
            const funcShape = new TypeShape('Function', { arity: stmt.params ? stmt.params.length : 0 });
            if (fnName && !env.get(fnName)) env.define(fnName, funcShape, true);
          } else if (stmt.type === ASTNodeType.EXPORT_DECLARATION && stmt.declaration?.type === ASTNodeType.FUNCTION_DECLARATION) {
            const decl = stmt.declaration;
            const fnName = typeof decl.id === 'string' ? decl.id : (decl.id?.name || decl.name);
            const funcShape = new TypeShape('Function', { arity: decl.params ? decl.params.length : 0 });
            if (fnName && !env.get(fnName)) env.define(fnName, funcShape, true);
          }
        }
        let lastType = new TypeShape('Undefined');
        for (const stmt of node.body || []) {
          lastType = this.analyzeNode(stmt, env);
        }
        return lastType;
      }

      case ASTNodeType.EXPRESSION_STATEMENT:
        return this.analyzeNode(node.expression, env);

      case ASTNodeType.EXPORT_DECLARATION:
        return this.analyzeNode(node.declaration, env);

      case ASTNodeType.IMPORT_DECLARATION:
        if (node.defaultSpecifier) {
          env.define(node.defaultSpecifier, new TypeShape('Any'), true);
        }
        for (const spec of node.specifiers || []) {
          const importedName = typeof spec.local === 'string'
            ? spec.local
            : (typeof spec.imported === 'string' ? spec.imported : (spec.local?.name || spec.imported?.name));
          if (importedName) {
            env.define(importedName, new TypeShape('Any'), true);
          }
        }
        return new TypeShape('Undefined');

      case ASTNodeType.VARIABLE_DECLARATION: {
        const isVal = node.kind === 'val';
        const varName = typeof node.id === 'string' ? node.id : (node.id?.name || node.name);
        const initType = node.init ? this.analyzeNode(node.init, env) : new TypeShape('Undefined');
        env.define(varName, initType, isVal);
        return initType;
      }

      case ASTNodeType.ASSIGNMENT_EXPRESSION: {
        const leftName = typeof node.left === 'string' ? node.left : (node.left?.name || node.left?.id);
        if (node.left.type === ASTNodeType.IDENTIFIER || typeof node.left === 'string') {
          const binding = env.get(leftName);
          if (binding && binding.isVal) {
            this.report(node, `[MathL Safety Violation] Cannot reassign immutable 'val ${leftName}'.`);
          }
          const rightType = this.analyzeNode(node.right, env);
          if (binding) {
            binding.typeShape = rightType;
            binding.nullState = rightType.nullState;
          }
          return rightType;
        }

        if (node.left.type === ASTNodeType.MEMBER_EXPRESSION) {
          const objType = this.analyzeNode(node.left.object, env);
          const propName = node.left.property.name || node.left.property.value;
          if (objType.isSealed && !objType.hasField(propName)) {
            this.report(node, `[MathL Safety Violation] Cannot assign unlisted property '${propName}' to sealed struct.`);
          }
          return this.analyzeNode(node.right, env);
        }
        break;
      }

      case ASTNodeType.IDENTIFIER: {
        const varName = typeof node === 'string' ? node : (node.name || node.id);
        const binding = env.get(varName);
        if (!binding) {
          this.report(node, `[MathL Safety Violation] Undeclared identifier '${varName}'.`);
          return new TypeShape('Any');
        }
        return binding.typeShape;
      }

      case ASTNodeType.LITERAL: {
        if (typeof node.value === 'number') return new TypeShape('Number');
        if (typeof node.value === 'string') return new TypeShape('String');
        if (typeof node.value === 'boolean') return new TypeShape('Boolean');
        if (node.value === null) return new TypeShape('Null', { nullState: NullState.NULLABLE });
        return new TypeShape('Any');
      }

      case ASTNodeType.TEMPLATE_LITERAL:
        for (const expr of node.expressions || []) {
          this.analyzeNode(expr, env);
        }
        return new TypeShape('String');

      case ASTNodeType.ARRAY_LITERAL:
        for (const elem of node.elements || []) {
          this.analyzeNode(elem, env);
        }
        return new TypeShape('Array');

      case ASTNodeType.OBJECT_LITERAL: {
        const fields = {};
        for (const prop of node.properties || []) {
          const key = prop.key.name || prop.key.value;
          fields[key] = this.analyzeNode(prop.value, env);
        }
        return new TypeShape('Object', { fields });
      }

      case ASTNodeType.STRUCT_DECLARATION: {
        const structName = typeof node.id === 'string' ? node.id : (node.id?.name || node.name);
        const fields = {};
        for (const field of node.fields || []) {
          const fieldName = typeof field === 'string' ? field : (field.name || field.id);
          fields[fieldName] = new TypeShape('Any');
        }
        const structShape = new TypeShape('Struct', { isSealed: true, fields });
        env.define(structName, structShape, true);
        return structShape;
      }

      case ASTNodeType.FUNCTION_DECLARATION: {
        const fnName = typeof node.id === 'string' ? node.id : (node.id?.name || node.name);
        const funcShape = new TypeShape('Function', { arity: node.params ? node.params.length : 0 });
        if (fnName) env.define(fnName, funcShape, true);
        const funcEnv = new AbstractEnvironment(env);
        for (const param of node.params || []) {
          const paramName = typeof param === 'string' ? param : (param.name || param.id);
          funcEnv.define(paramName, new TypeShape('Any'), true);
        }
        this.analyzeNode(node.body, funcEnv);
        return funcShape;
      }

      case ASTNodeType.ARROW_FUNCTION: {
        const funcShape = new TypeShape('Function', { arity: node.params ? node.params.length : 0 });
        const arrowEnv = new AbstractEnvironment(env);
        for (const param of node.params || []) {
          const paramName = typeof param === 'string' ? param : (param.name || param.id);
          arrowEnv.define(paramName, new TypeShape('Any'), true);
        }
        this.analyzeNode(node.body, arrowEnv);
        return funcShape;
      }

      case ASTNodeType.NEW_EXPRESSION: {
        this.analyzeNode(node.callee, env);
        for (const arg of node.arguments || []) {
          this.analyzeNode(arg, env);
        }
        return new TypeShape('Object', { nullState: NullState.NON_NULL });
      }

      case ASTNodeType.CALL_EXPRESSION: {
        const calleeType = this.analyzeNode(node.callee, env);
        if (calleeType.arity !== null && node.arguments.length !== calleeType.arity) {
          const calleeName = node.callee.name || node.callee.id || 'Anonymous function';
          this.report(node, `[MathL Safety Violation] Function '${calleeName}' expects ${calleeType.arity} arguments, but was called with ${node.arguments.length}.`);
        }
        for (const arg of node.arguments) {
          this.analyzeNode(arg, env);
        }
        return new TypeShape('Any');
      }

      case ASTNodeType.MEMBER_EXPRESSION: {
        const objType = this.analyzeNode(node.object, env);
        const objName = node.object.name || node.object.id;
        if (objName) {
          const binding = env.get(objName);
          if (binding && binding.nullState === NullState.NULLABLE) {
            this.report(node, `[MathL Safety Violation] Variable '${objName}' may be null/undefined at dereference.`);
          }
        }
        return new TypeShape('Any');
      }

      case ASTNodeType.DIRECTIVE_CALL: {
        if (node.directive === '@find') {
          return new TypeShape('Object', { nullState: NullState.NULLABLE });
        }
        if (node.directive === '@id' || node.directive === '@create' || node.directive === '@doc' || node.directive === '@win') {
          for (const arg of node.arguments || []) {
            this.analyzeNode(arg, env);
          }
          return new TypeShape('Object', { nullState: NullState.NON_NULL });
        }
        if (node.directive === '@log' || node.directive === '@info' || node.directive === '@warn' || node.directive === '@error' || node.directive === '@html' || node.directive === '@text') {
          for (const arg of node.arguments || []) {
            this.analyzeNode(arg, env);
          }
          return new TypeShape('Undefined');
        }
        if (node.directive === '@on') {
          for (const arg of node.arguments || []) {
            this.analyzeNode(arg, env);
          }
          return new TypeShape('Object', { nullState: NullState.NON_NULL });
        }
        for (const arg of node.arguments || []) {
          this.analyzeNode(arg, env);
        }
        return new TypeShape('Any');
      }

      case ASTNodeType.IF_STATEMENT: {
        if (node.test.type === ASTNodeType.UNARY_EXPRESSION && node.test.operator === '!') {
          const guardedVar = node.test.argument ? (node.test.argument.name || node.test.argument.id) : null;
          if (guardedVar) {
            const hasEarlyReturn = node.consequent && (
              node.consequent.type === ASTNodeType.RETURN_STATEMENT ||
              (node.consequent.type === ASTNodeType.BLOCK_STATEMENT && node.consequent.body.some(s => s.type === ASTNodeType.RETURN_STATEMENT))
            );
            if (hasEarlyReturn) {
              env.refineNullability(guardedVar, NullState.NON_NULL);
            }
          }
        }

        this.analyzeNode(node.test, env);
        this.analyzeNode(node.consequent, env.clone());
        if (node.alternate) this.analyzeNode(node.alternate, env.clone());
        return new TypeShape('Undefined');
      }

      case ASTNodeType.FOR_STATEMENT: {
        this.analyzeNode(node.right, env);
        const loopEnv = new AbstractEnvironment(env);
        if (node.variable) {
          loopEnv.define(node.variable, new TypeShape('Any', { nullState: NullState.NON_NULL }), node.kind === 'val');
        }
        this.analyzeNode(node.body, loopEnv);
        return new TypeShape('Undefined');
      }

      case ASTNodeType.FOR_RANGE_STATEMENT: {
        this.analyzeNode(node.start, env);
        this.analyzeNode(node.end, env);
        if (node.step) this.analyzeNode(node.step, env);
        const loopEnv = new AbstractEnvironment(env);
        if (node.variable) {
          loopEnv.define(node.variable, new TypeShape('Number', { nullState: NullState.NON_NULL }), node.kind === 'val');
        }
        this.analyzeNode(node.body, loopEnv);
        return new TypeShape('Undefined');
      }

      case ASTNodeType.FOR_C_STATEMENT: {
        const loopEnv = new AbstractEnvironment(env);
        if (node.init) this.analyzeNode(node.init, loopEnv);
        if (node.test) this.analyzeNode(node.test, loopEnv);
        if (node.update) this.analyzeNode(node.update, loopEnv);
        this.analyzeNode(node.body, loopEnv);
        return new TypeShape('Undefined');
      }

      case ASTNodeType.TRY_STATEMENT: {
        this.analyzeNode(node.block, env.clone());
        if (node.handler) {
          const catchEnv = env.clone();
          if (node.handler.param) {
            const paramName = typeof node.handler.param === 'string'
              ? node.handler.param
              : (node.handler.param.name || node.handler.param.id || 'err');
            catchEnv.define(paramName, new TypeShape('Object', { nullState: NullState.NON_NULL }), true);
          }
          this.analyzeNode(node.handler.body, catchEnv);
        }
        if (node.finalizer) {
          this.analyzeNode(node.finalizer, env.clone());
        }
        return new TypeShape('Undefined');
      }

      case ASTNodeType.TERNARY_EXPRESSION: {
        this.analyzeNode(node.test, env);
        const cons = this.analyzeNode(node.consequent, env);
        const alt = this.analyzeNode(node.alternate, env);
        return cons.kind === alt.kind ? cons : new TypeShape('Any');
      }

      case ASTNodeType.RETURN_STATEMENT:
        if (node.argument) this.analyzeNode(node.argument, env);
        return new TypeShape('Undefined');

      case ASTNodeType.BINARY_EXPRESSION: {
        const left = this.analyzeNode(node.left, env);
        const right = this.analyzeNode(node.right, env);
        if (node.operator === '+' || node.operator === '-' || node.operator === '*' || node.operator === '/') {
          if (left.kind === 'Undefined' || right.kind === 'Undefined') {
            this.report(node, `[MathL Safety Violation] Arithmetic operation '${node.operator}' with undefined operand produces NaN.`);
          }
        }
        return new TypeShape('Number');
      }

      case ASTNodeType.UNARY_EXPRESSION:
        return this.analyzeNode(node.argument, env);

      default:
        return new TypeShape('Any');
    }
  }
}
