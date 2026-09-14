/**
 * Trial #45: Stress Fuzzing & Randomized AST Chaos Invariance
 * Executes 10,000 randomized, malformed, circular, and pathological AST mutations
 * against the MathL abstract evaluator to prove zero uncaught analyzer crashes.
 * Adheres strictly to the NO EMOJIS operational invariant.
 */

import assert from 'node:assert';

console.log('--- Running MathL Trial #45: Stress Fuzzing & Randomized AST Chaos Invariance ---');

export class ChaosASTEvaluator {
  static evaluate(node, depth = 0, visited = new Set()) {
    try {
      // 1. Defend against non-object or null root
      if (!node || typeof node !== 'object') {
        return { ok: false, error: 'MalformedAST: Node is not a valid object.' };
      }

      // 2. Defend against circular AST structures
      if (visited.has(node)) {
        return { ok: false, error: 'MalformedAST: Circular node reference in AST graph.' };
      }
      visited.add(node);

      // 3. Defend against pathological recursion depth
      if (depth > 64) {
        return { ok: false, error: 'MalformedAST: AST recursion depth limit exceeded (max 64).' };
      }

      // 4. Validate node type
      if (typeof node.type !== 'string') {
        return { ok: false, error: 'MalformedAST: Node type missing or not a string.' };
      }

      // 5. Evaluate based on type
      switch (node.type) {
        case 'Program': {
          if (!Array.isArray(node.body)) {
            return { ok: false, error: 'MalformedAST: Program body must be an array.' };
          }
          for (const stmt of node.body) {
            const res = this.evaluate(stmt, depth + 1, visited);
            if (!res.ok) return res;
          }
          return { ok: true, evaluatedNodes: node.body.length };
        }

        case 'VariableDeclaration': {
          if (typeof node.id !== 'string') {
            return { ok: false, error: 'MalformedAST: VariableDeclaration id must be string identifier.' };
          }
          if (node.init) {
            return this.evaluate(node.init, depth + 1, visited);
          }
          return { ok: true };
        }

        case 'MemberExpression': {
          if (!node.object) {
            return { ok: false, error: 'MalformedAST: MemberExpression missing object.' };
          }
          const objRes = this.evaluate(node.object, depth + 1, visited);
          if (!objRes.ok) return objRes;
          return { ok: true };
        }

        case 'CallExpression': {
          if (!node.callee) {
            return { ok: false, error: 'MalformedAST: CallExpression missing callee.' };
          }
          const calleeRes = this.evaluate(node.callee, depth + 1, visited);
          if (!calleeRes.ok) return calleeRes;

          if (Array.isArray(node.arguments)) {
            for (const arg of node.arguments) {
              const argRes = this.evaluate(arg, depth + 1, visited);
              if (!argRes.ok) return argRes;
            }
          }
          return { ok: true };
        }

        case 'Literal': {
          // Literals are terminal values
          return { ok: true, value: node.value };
        }

        case 'Identifier': {
          if (typeof node.name !== 'string') {
            return { ok: false, error: 'MalformedAST: Identifier name must be a string.' };
          }
          return { ok: true, identifier: node.name };
        }

        default:
          // Unknown or exotic AST node type
          return { ok: false, error: `MalformedAST: Unknown AST node type '${node.type}'.` };
      }
    } catch (unexpectedError) {
      // Analyzer internal guard: in MathL, analyzer code must NEVER let an unhandled crash escape
      return {
        ok: false,
        crashed: true,
        fatalError: unexpectedError.message
      };
    }
  }
}

export class ASTChaosGenerator {
  static samplePrimitives() {
    const pool = [
      null,
      undefined,
      42,
      -0,
      NaN,
      Infinity,
      -Infinity,
      'hello',
      '',
      true,
      false,
      Symbol('test'),
      BigInt(999999999999),
      [],
      {},
      () => {}
    ];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  static generateRandomNode(depth = 0) {
    if (depth > 6) {
      return {
        type: 'Literal',
        value: this.samplePrimitives()
      };
    }

    const choice = Math.floor(Math.random() * 8);

    switch (choice) {
      case 0: // Malformed raw primitive or null
        return this.samplePrimitives();

      case 1: // Node with missing type
        return {
          id: 'test',
          val: this.samplePrimitives()
        };

      case 2: // Literal node with pathological value
        return {
          type: 'Literal',
          value: this.samplePrimitives()
        };

      case 3: // Identifier with possibly invalid name
        return {
          type: 'Identifier',
          name: Math.random() > 0.3 ? 'validName' : this.samplePrimitives()
        };

      case 4: // Member expression with random object
        return {
          type: 'MemberExpression',
          object: this.generateRandomNode(depth + 1),
          property: 'data'
        };

      case 5: // Call expression with random arguments
        return {
          type: 'CallExpression',
          callee: this.generateRandomNode(depth + 1),
          arguments: [this.generateRandomNode(depth + 1)]
        };

      case 6: // VariableDeclaration with random init
        return {
          type: 'VariableDeclaration',
          id: Math.random() > 0.2 ? 'v_' + depth : this.samplePrimitives(),
          init: this.generateRandomNode(depth + 1)
        };

      case 7: // Program with random statements
        return {
          type: 'Program',
          body: [
            this.generateRandomNode(depth + 1),
            this.generateRandomNode(depth + 1)
          ]
        };
    }
  }

  static injectCircularReference(node) {
    if (node && typeof node === 'object') {
      node.child = node; // Direct self-reference
    }
    return node;
  }
}

// ==========================================
// TEST SUITE: 10,000 Chaos Fuzzing Iterations
// ==========================================

const TOTAL_ITERATIONS = 10000;
console.log(`Executing ${TOTAL_ITERATIONS} randomized AST chaos mutations...`);

let okResults = 0;
let handledErrors = 0;
let unhandledCrashes = 0;

const startTime = Date.now();

for (let i = 0; i < TOTAL_ITERATIONS; i++) {
  let ast = ASTChaosGenerator.generateRandomNode(0);

  // In 5% of cases, inject an intentional circular graph reference
  if (i % 20 === 0) {
    ast = ASTChaosGenerator.injectCircularReference(ast);
  }

  const result = ChaosASTEvaluator.evaluate(ast);

  if (result.crashed) {
    unhandledCrashes++;
    console.error(`FATAL CRASH on iteration ${i}:`, result.fatalError);
    break;
  } else if (result.ok) {
    okResults++;
  } else {
    handledErrors++;
  }
}

const elapsedMs = Date.now() - startTime;
const throughput = Math.round((TOTAL_ITERATIONS / Math.max(1, elapsedMs)) * 1000);

console.log(`\nChaos Fuzzing Summary:`);
console.log(`- Total iterations executed: ${TOTAL_ITERATIONS}`);
console.log(`- Safe valid ASTs evaluated: ${okResults}`);
console.log(`- Malformed ASTs safely intercepted: ${handledErrors}`);
console.log(`- Uncaught analyzer crashes: ${unhandledCrashes}`);
console.log(`- Total elapsed time: ${elapsedMs} ms (${throughput} fuzz ops/sec)`);

assert.strictEqual(unhandledCrashes, 0, 'Analyzer must suffer ZERO unhandled crashes across 10,000 chaos inputs');
assert.strictEqual(okResults + handledErrors, TOTAL_ITERATIONS);

console.log('\nTrial #45 Result: PASS (Zero-crash invariance verified over 10,000 randomized AST mutations).\n');
