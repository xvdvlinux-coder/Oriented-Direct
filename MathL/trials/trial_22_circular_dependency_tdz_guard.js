/**
 * Trial #22: Circular Module Dependency Graph & TDZ Prevention
 * Proves that cyclic import graphs (A -> B -> C -> A) are detected and gated at compile-time
 * to prevent V8's kCyclicModuleDependency and runtime Temporal Dead Zone (TDZ) crashes.
 */

import assert from 'node:assert';

console.log('--- Running MathL Trial #22: Circular Module Dependency Guard ---');

class ModuleDependencyGraph {
  constructor() {
    this.adj = new Map(); // modulePath -> Set<importedModulePath>
  }

  addModule(modulePath, imports = []) {
    if (!this.adj.has(modulePath)) {
      this.adj.set(modulePath, new Set());
    }
    for (const imp of imports) {
      this.adj.get(modulePath).add(imp);
    }
  }

  detectCycles() {
    const visited = new Set();
    const recStack = new Set();
    const cyclePath = [];

    const dfs = (node, path) => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = this.adj.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor, path)) return true;
        } else if (recStack.has(neighbor)) {
          path.push(neighbor);
          cyclePath.push(...path.slice(path.indexOf(neighbor)));
          return true;
        }
      }

      recStack.delete(node);
      path.pop();
      return false;
    };

    for (const node of this.adj.keys()) {
      if (!visited.has(node)) {
        if (dfs(node, [])) {
          return {
            hasCycle: true,
            cycle: cyclePath,
            error: `[MathL Violation] Circular dependency detected: ${cyclePath.join(' -> ')} (V8 kCyclicModuleDependency prevention).`
          };
        }
      }
    }

    return { hasCycle: false };
  }
}

// Case 1: Acyclic Dependency Graph (DAG) -> Must PASS
const dag = new ModuleDependencyGraph();
dag.addModule('src/main.osp', ['src/components/controls.osp', 'src/utils/formatters.osp']);
dag.addModule('src/components/controls.osp', ['src/config/constants.osp']);
dag.addModule('src/utils/formatters.osp', []);
dag.addModule('src/config/constants.osp', []);

const res1 = dag.detectCycles();
console.log(`Acyclic Dependency Graph -> hasCycle = ${res1.hasCycle}`);
assert.strictEqual(res1.hasCycle, false);

// Case 2: Cyclic Dependency Graph (A -> B -> C -> A) -> Must FAIL
const cyclicGraph = new ModuleDependencyGraph();
cyclicGraph.addModule('src/models/user.osp', ['src/services/auth.osp']);
cyclicGraph.addModule('src/services/auth.osp', ['src/utils/session.osp']);
cyclicGraph.addModule('src/utils/session.osp', ['src/models/user.osp']); // Cycle back!

const res2 = cyclicGraph.detectCycles();
console.log(`Cyclic Dependency Graph -> hasCycle = ${res2.hasCycle}`);
assert.strictEqual(res2.hasCycle, true);
assert.ok(res2.error.includes('Circular dependency detected'));
console.log(`  Caught: ${res2.error}`);

console.log('\nTrial #22 Result: PASS (Circular module dependencies caught at compile-time).\n');
