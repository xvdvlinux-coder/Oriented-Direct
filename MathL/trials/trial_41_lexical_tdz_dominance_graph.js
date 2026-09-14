/**
 * Trial #41: Strict Lexical Scope Hoisting & TDZ Dominance Graph (Rule XXVIII)
 * Formalizes Control Flow Graph Dominator Trees, Lexical Scope Environments,
 * and compile-time prevention of Temporal Dead Zone (TDZ) violations.
 * Matches Google V8 templates:
 * - kAccessedUninitializedVariable ("Cannot access '%' before initialization")
 * - kNotDefined ("% is not defined")
 * - S_TDZViolation (Lexical identifier read before declaration statement)
 * - S_ClosureTDZViolation (Closure invoked prior to initialization of captured lexical variable)
 * - S_CyclicLexicalInitialization (Mutual dependency in lexical variable initializers)
 */

import assert from 'node:assert';

console.log('--- Running MathL Trial #41: Strict Lexical Scope Hoisting & TDZ Dominance Graph ---');

export const InitState = {
  BOTTOM: 'BOTTOM',
  UNINITIALIZED: 'UNINITIALIZED', // In TDZ
  INITIALIZED: 'INITIALIZED',     // Fully initialized and safe to read
  TOP: 'TOP'
};

export class DominatorScopingGraph {
  constructor() {
    this.nodes = new Map(); // nodeId -> { id, type, data }
    this.predecessors = new Map(); // nodeId -> Set(nodeId)
    this.successors = new Map();   // nodeId -> Set(nodeId)
    this.dominators = new Map();   // nodeId -> Set(dominatorNodeId)
    this.scopes = [];              // stack of lexical scope symbol tables
    this.functions = new Map();    // fnName -> { declNodeId, capturedVars: Set, bodyNodeIds: Set }
    this.callSites = [];           // list of { callNodeId, targetFn }
    this.entryNodeId = null;
  }

  addNode(id, type, data = {}) {
    this.nodes.set(id, { id, type, data });
    this.predecessors.set(id, new Set());
    this.successors.set(id, new Set());
    if (!this.entryNodeId) {
      this.entryNodeId = id;
    }
  }

  addEdge(fromId, toId) {
    this.successors.get(fromId).add(toId);
    this.predecessors.get(toId).add(fromId);
  }

  computeDominators() {
    const allNodeIds = Array.from(this.nodes.keys());
    const N = allNodeIds.length;

    // Entry node is dominated only by itself
    this.dominators.set(this.entryNodeId, new Set([this.entryNodeId]));

    // All other nodes initially dominated by all nodes
    for (const nodeId of allNodeIds) {
      if (nodeId !== this.entryNodeId) {
        this.dominators.set(nodeId, new Set(allNodeIds));
      }
    }

    // Iterative fixpoint computation
    let changed = true;
    while (changed) {
      changed = false;
      for (const nodeId of allNodeIds) {
        if (nodeId === this.entryNodeId) continue;

        const preds = Array.from(this.predecessors.get(nodeId));
        if (preds.length === 0) continue;

        // Intersection of dominators of all predecessors
        let newDom = new Set(this.dominators.get(preds[0]));
        for (let i = 1; i < preds.length; i++) {
          const predDom = this.dominators.get(preds[i]);
          for (const d of Array.from(newDom)) {
            if (!predDom.has(d)) {
              newDom.delete(d);
            }
          }
        }

        // Add node itself
        newDom.add(nodeId);

        const currentDom = this.dominators.get(nodeId);
        if (newDom.size !== currentDom.size || !Array.from(newDom).every(x => currentDom.has(x))) {
          this.dominators.set(nodeId, newDom);
          changed = true;
        }
      }
    }
  }

  dominates(domNodeId, targetNodeId) {
    const domSet = this.dominators.get(targetNodeId);
    return domSet ? domSet.has(domNodeId) : false;
  }

  registerDeclaration(varName, declNodeId, initializerFn = null) {
    return {
      name: varName,
      declNodeId,
      state: InitState.UNINITIALIZED,
      initializerFn
    };
  }

  verifyReadAccess(varName, readNodeId, varDecl) {
    if (!varDecl) {
      return {
        ok: false,
        error: `[MathL Violation: S_IdentifierNotDefined] Identifier '${varName}' is not defined in scope (matches V8 kNotDefined).`
      };
    }

    // If declaration strictly dominates the read node, it is safe
    if (this.dominates(varDecl.declNodeId, readNodeId) && varDecl.declNodeId !== readNodeId) {
      return {
        ok: true,
        state: InitState.INITIALIZED,
        message: `Declaration of '${varName}' strictly dominates read node '${readNodeId}'.`
      };
    }

    // Otherwise, TDZ violation: variable is accessed before declaration/initialization
    return {
      ok: false,
      error: `[MathL Violation: S_TDZViolation] Cannot access '${varName}' before initialization (matches V8 kAccessedUninitializedVariable). Declaration node: '${varDecl.declNodeId}', Read node: '${readNodeId}'.`
    };
  }

  verifyClosureInvocation(fnName, callNodeId, varDeclMap) {
    const fnInfo = this.functions.get(fnName);
    if (!fnInfo) {
      return { ok: false, error: `Function '${fnName}' not registered.` };
    }

    // Check all captured variables in the closure
    for (const capturedVar of fnInfo.capturedVars) {
      const varDecl = varDeclMap.get(capturedVar);
      if (varDecl) {
        // At the point of the callsite, does the declaration of capturedVar dominate callNodeId?
        if (!this.dominates(varDecl.declNodeId, callNodeId)) {
          return {
            ok: false,
            error: `[MathL Violation: S_ClosureTDZViolation] Closure '${fnName}' called before initialization of captured variable '${capturedVar}' (matches V8 kAccessedUninitializedVariable). Call node: '${callNodeId}', Decl node: '${varDecl.declNodeId}'.`
          };
        }
      }
    }

    return {
      ok: true,
      message: `All captured variables in closure '${fnName}' are fully initialized prior to call node '${callNodeId}'.`
    };
  }

  verifyCyclicDeclarations(declarations) {
    // Detects mutual recursive initialization: const a = b + 1; const b = a + 2;
    const depGraph = new Map();
    for (const [name, decl] of declarations) {
      depGraph.set(name, new Set(decl.dependencies || []));
    }

    const visited = new Set();
    const inStack = new Set();

    function dfs(node) {
      visited.add(node);
      inStack.add(node);

      for (const neighbor of depGraph.get(node) || []) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (inStack.has(neighbor)) {
          return true; // Cycle found
        }
      }

      inStack.delete(node);
      return false;
    }

    for (const name of depGraph.keys()) {
      if (!visited.has(name)) {
        if (dfs(name)) {
          return {
            ok: false,
            error: `[MathL Violation: S_CyclicLexicalInitialization] Cyclic dependency detected in lexical variable initializers involving '${name}' (matches V8 kAccessedUninitializedVariable).`
          };
        }
      }
    }

    return { ok: true, message: 'No cyclic lexical initializations detected.' };
  }
}

// ==========================================
// TEST SUITE: Trial #41 TDZ Dominance Graph
// ==========================================

console.log('1. Constructing Control Flow Graph and Dominator Tree...');
const graph = new DominatorScopingGraph();

// CFG Layout:
// entry -> n_decl_x -> n_read_x -> n_if -> n_then -> n_merge -> exit
//                                      \-> n_else -/
graph.addNode('entry', 'ENTRY');
graph.addNode('n_decl_x', 'DECL', { var: 'x' });
graph.addNode('n_read_x', 'READ', { var: 'x' });
graph.addNode('n_if', 'BRANCH');
graph.addNode('n_then', 'STMT');
graph.addNode('n_else', 'STMT');
graph.addNode('n_merge', 'JOIN');
graph.addNode('exit', 'EXIT');

graph.addEdge('entry', 'n_decl_x');
graph.addEdge('n_decl_x', 'n_read_x');
graph.addEdge('n_read_x', 'n_if');
graph.addEdge('n_if', 'n_then');
graph.addEdge('n_if', 'n_else');
graph.addEdge('n_then', 'n_merge');
graph.addEdge('n_else', 'n_merge');
graph.addEdge('n_merge', 'exit');

graph.computeDominators();

// Verify Dominance Relations
assert.strictEqual(graph.dominates('entry', 'n_decl_x'), true);
assert.strictEqual(graph.dominates('n_decl_x', 'n_read_x'), true);
assert.strictEqual(graph.dominates('n_decl_x', 'n_merge'), true);
assert.strictEqual(graph.dominates('n_then', 'n_merge'), false); // n_then does not dominate n_merge (can come from else)

console.log('2. Testing Safe Read Access After Declaration...');
const declX = graph.registerDeclaration('x', 'n_decl_x');
const safeReadCheck = graph.verifyReadAccess('x', 'n_read_x', declX);
assert.strictEqual(safeReadCheck.ok, true);
assert.strictEqual(safeReadCheck.state, InitState.INITIALIZED);

console.log('3. Testing TDZ Violation: Read Access Prior to Declaration (V8 kAccessedUninitializedVariable)...');
// If someone reads 'x' at 'entry' before 'n_decl_x'
const tdzReadCheck = graph.verifyReadAccess('x', 'entry', declX);
assert.strictEqual(tdzReadCheck.ok, false);
assert.ok(tdzReadCheck.error.includes('S_TDZViolation'));
assert.ok(tdzReadCheck.error.includes('kAccessedUninitializedVariable'));

console.log('4. Testing Undefined Identifier Reference (V8 kNotDefined)...');
const notDefinedCheck = graph.verifyReadAccess('nonExistentVar', 'n_read_x', null);
assert.strictEqual(notDefinedCheck.ok, false);
assert.ok(notDefinedCheck.error.includes('S_IdentifierNotDefined'));
assert.ok(notDefinedCheck.error.includes('kNotDefined'));

console.log('5. Testing Closure TDZ Violation Analysis...');
// CFG with closure:
// n_call_fn -> n_decl_y -> n_call_fn_safe
// fn captured y!
const closureGraph = new DominatorScopingGraph();
closureGraph.addNode('entry', 'ENTRY');
closureGraph.addNode('n_call_fn', 'CALL', { fn: 'computeY' });
closureGraph.addNode('n_decl_y', 'DECL', { var: 'y' });
closureGraph.addNode('n_call_fn_safe', 'CALL', { fn: 'computeY' });

closureGraph.addEdge('entry', 'n_call_fn');
closureGraph.addEdge('n_call_fn', 'n_decl_y');
closureGraph.addEdge('n_decl_y', 'n_call_fn_safe');
closureGraph.computeDominators();

closureGraph.functions.set('computeY', {
  declNodeId: 'entry',
  capturedVars: new Set(['y'])
});

const declY = closureGraph.registerDeclaration('y', 'n_decl_y');
const declMap = new Map([['y', declY]]);

// Calling computeY before decl_y should fail with S_ClosureTDZViolation
const prematureCallCheck = closureGraph.verifyClosureInvocation('computeY', 'n_call_fn', declMap);
assert.strictEqual(prematureCallCheck.ok, false);
assert.ok(prematureCallCheck.error.includes('S_ClosureTDZViolation'));
assert.ok(prematureCallCheck.error.includes('kAccessedUninitializedVariable'));

// Calling computeY after decl_y is safe
const validCallCheck = closureGraph.verifyClosureInvocation('computeY', 'n_call_fn_safe', declMap);
assert.strictEqual(validCallCheck.ok, true);

console.log('6. Testing Cyclic Lexical Variable Initializations...');
const cyclicDecls = new Map([
  ['a', { dependencies: ['b'] }],
  ['b', { dependencies: ['c'] }],
  ['c', { dependencies: ['a'] }] // Cycle a -> b -> c -> a
]);
const cycleCheck = graph.verifyCyclicDeclarations(cyclicDecls);
assert.strictEqual(cycleCheck.ok, false);
assert.ok(cycleCheck.error.includes('S_CyclicLexicalInitialization'));

const acyclicDecls = new Map([
  ['base', { dependencies: [] }],
  ['derivedA', { dependencies: ['base'] }],
  ['derivedB', { dependencies: ['base', 'derivedA'] }]
]);
const acyclicCheck = graph.verifyCyclicDeclarations(acyclicDecls);
assert.strictEqual(acyclicCheck.ok, true);

console.log('Trial #41 Result: PASS (Dominator tree calculation, TDZ scoping invariants, and closure TDZ prevention verified).\n');
